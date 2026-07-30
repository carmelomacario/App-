/*
 * QRChat — chat efímero por código QR para eventos (discotecas, fiestas, congresos…)
 *
 * Todo se guarda SOLO en memoria: cuando un evento expira (o el servidor se
 * reinicia) desaparecen perfiles, fotos y mensajes. No hay base de datos.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Las fotos viajan como data-URL; límite de 4 MB por paquete.
  maxHttpBufferSize: 4 * 1024 * 1024,
});

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));

/* ──────────────────────────── Almacén en memoria ─────────────────────────── */

const HORAS_DEFECTO = 12;
const HORAS_MAX = 48;
const MAX_MENSAJES_GENERAL = 300;
const MAX_MENSAJES_PRIVADO = 200;
const MAX_FOTO_BYTES = 2.5 * 1024 * 1024; // data-URL ya comprimida en cliente

// Al abandonar el espacio (desconexión, cierre de la app, salir del radio…)
// se purga TODO lo de esa persona. La gracia cubre cortes breves de cobertura.
const GRACIA_MS = Number(process.env.QRCHAT_GRACIA_MS) || 5 * 60 * 1000;
const SWEEP_MS = Number(process.env.QRCHAT_SWEEP_MS) || 30 * 1000;

// Cuentas guardadas: gratis por ahora; al activar este flag la CREACIÓN de
// cuentas nuevas queda bloqueada (paso previo a integrar el cobro). Las
// cuentas ya existentes siguen funcionando.
const CUENTAS_DE_PAGO = process.env.QRCHAT_CUENTAS_DE_PAGO === '1';

/** @type {Map<string, Evento>} */
const eventos = new Map();

/*
Evento = {
  codigo, nombre, geo, balance, creadoEn, expiraEn, adminToken,
  usuarios: Map<userId, { id, token, nombre, sexo, emoji, bio, foto,
                          online, socketId, desconectadoEn, bloqueados:Set }>,
  general: [mensaje],
  privados: Map<claveOrdenada, [mensaje]>,
  cola: [{ socket, datos }],   // chicos esperando hueco (equilibrio activo)
}
mensaje = { id, de, texto?, foto?, ts }
*/

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I

function generarCodigo() {
  let codigo;
  do {
    codigo = Array.from(crypto.randomBytes(6))
      .map((b) => ALFABETO[b % ALFABETO.length])
      .join('');
  } while (eventos.has(codigo));
  return codigo;
}

function clavePrivada(a, b) {
  return [a, b].sort().join('|');
}

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function eventoActivo(codigo) {
  const ev = eventos.get(codigo);
  if (!ev) return null;
  if (Date.now() > ev.expiraEn) {
    finalizarEvento(ev);
    return null;
  }
  return ev;
}

function finalizarEvento(ev) {
  io.to(`evento:${ev.codigo}`).emit('evento:finalizado');
  for (const { socket } of ev.cola) socket.emit('evento:finalizado');
  io.in(`evento:${ev.codigo}`).disconnectSockets(true);
  eventos.delete(ev.codigo);
  console.log(`[qrchat] Evento ${ev.codigo} finalizado y borrado`);
}

/* ─────────────────────────── Utilidades de datos ─────────────────────────── */

function limpiarTexto(t, max) {
  if (typeof t !== 'string') return '';
  return t.replace(/\s+/g, ' ').trim().slice(0, max);
}

function fotoValida(foto) {
  return (
    typeof foto === 'string' &&
    /^data:image\/(jpeg|png|webp);base64,/.test(foto) &&
    foto.length <= MAX_FOTO_BYTES
  );
}

function perfilPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    sexo: u.sexo,
    emoji: u.emoji,
    bio: u.bio,
    foto: u.foto,
    online: u.online,
    registrado: !!u.cuentaAlias,
  };
}

function listaUsuarios(ev) {
  return Array.from(ev.usuarios.values()).map(perfilPublico);
}

function contarSexos(ev) {
  let h = 0;
  let m = 0;
  let x = 0;
  for (const u of ev.usuarios.values()) {
    if (u.sexo === 'h') h++;
    else if (u.sexo === 'm') m++;
    else x++;
  }
  return { h, m, x };
}

/* ──────────────── Cuentas guardadas (única persistencia real) ────────────── */
/* Los chats siguen siendo 100 % efímeros; solo se guarda el PERFIL de quien
   decide crear una cuenta: alias + PIN (cifrado) + nombre/sexo/emoji/bio/foto. */

const DATA_DIR = path.join(__dirname, 'data');
const FICHERO_CUENTAS = path.join(DATA_DIR, 'cuentas.json');

/** @type {Map<string, Cuenta>} alias normalizado → cuenta */
let cuentas = new Map();
// Cuenta = { alias, aliasNorm, sal, hash, token, perfil, creadaEn }

function cargarCuentas() {
  try {
    const crudo = JSON.parse(fs.readFileSync(FICHERO_CUENTAS, 'utf8'));
    cuentas = new Map(Object.entries(crudo));
    console.log(`[qrchat] ${cuentas.size} cuentas cargadas`);
  } catch {
    cuentas = new Map();
  }
}
cargarCuentas();

let guardadoPendiente = null;
function guardarCuentas() {
  clearTimeout(guardadoPendiente);
  guardadoPendiente = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FICHERO_CUENTAS, JSON.stringify(Object.fromEntries(cuentas)));
  }, 250);
}

function normalizarAlias(alias) {
  const a = String(alias || '').trim().toLowerCase();
  return /^[a-z0-9_.-]{3,20}$/.test(a) ? a : null;
}

function hashPin(pin, sal) {
  return crypto.scryptSync(String(pin), sal, 32).toString('hex');
}

function perfilDeCuenta(datos) {
  return {
    nombre: limpiarTexto(datos?.nombre, 30),
    sexo: ['h', 'm', 'x'].includes(datos?.sexo) ? datos.sexo : 'x',
    emoji: limpiarTexto(datos?.emoji, 4) || '🙂',
    bio: limpiarTexto(datos?.bio, 120),
    foto: fotoValida(datos?.foto) ? datos.foto : null,
  };
}

// Valida las credenciales que llegan con «unirse»; null si no hay/no valen
function cuentaPorToken(credenciales) {
  const aliasNorm = normalizarAlias(credenciales?.alias);
  if (!aliasNorm || !credenciales?.token) return null;
  const c = cuentas.get(aliasNorm);
  return c && c.token === credenciales.token ? c : null;
}

/* ─────────────────── Equilibrio chicos/chicas y cola ─────────────────────── */

// Un chico puede entrar mientras no supere a las chicas en más del margen
function hayHuecoParaChico(ev) {
  if (!ev.balance) return true;
  const { h, m } = contarSexos(ev);
  return h - m < ev.balance.margen;
}

function actualizarPosicionesCola(ev) {
  ev.cola.forEach(({ socket }, i) =>
    socket.emit('espera:posicion', { posicion: i + 1, total: ev.cola.length })
  );
}

// Cada vez que se libera hueco (entra una chica, alguien sale o es purgado)
// vamos admitiendo por orden a los que esperan.
function revisarCola(ev) {
  let cambio = false;
  while (ev.cola.length && hayHuecoParaChico(ev)) {
    const { socket, datos, cuenta } = ev.cola.shift();
    cambio = true;
    if (!socket.connected) continue;
    socket.data.enCola = null;
    const carga = admitir(socket, ev, datos, cuenta);
    socket.emit('espera:admitido', carga);
    socket.to(`evento:${ev.codigo}`).emit('usuarios:cambio', listaUsuarios(ev));
  }
  if (cambio) actualizarPosicionesCola(ev);
}

function sacarDeCola(ev, socket) {
  const antes = ev.cola.length;
  ev.cola = ev.cola.filter((x) => x.socket !== socket);
  if (ev.cola.length !== antes) actualizarPosicionesCola(ev);
}

/* ─────────────────────────── Alta en el evento ───────────────────────────── */

// Crea (o recupera) el usuario, lo mete en la sala y devuelve el estado inicial
function admitir(socket, ev, datos, cuenta) {
  let usuario = null;
  if (datos.userId && datos.token) {
    const previo = ev.usuarios.get(datos.userId);
    if (previo && previo.token === datos.token) usuario = previo; // reconexión
  }

  if (!usuario) {
    // Con cuenta, el perfil sale de lo guardado en la cuenta
    const base = cuenta ? cuenta.perfil : datos;
    usuario = {
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      nombre: limpiarTexto(base.nombre, 30),
      sexo: ['h', 'm', 'x'].includes(base.sexo) ? base.sexo : 'x',
      emoji: limpiarTexto(base.emoji, 4) || '🙂',
      bio: limpiarTexto(base.bio, 120),
      foto: fotoValida(base.foto) ? base.foto : null,
      cuentaAlias: cuenta ? cuenta.aliasNorm : null,
      online: true,
      socketId: socket.id,
      desconectadoEn: null,
      bloqueados: new Set(),
    };
    ev.usuarios.set(usuario.id, usuario);
  } else {
    usuario.online = true;
    usuario.socketId = socket.id;
    usuario.desconectadoEn = null;
  }

  socket.data.ev = ev;
  socket.data.yo = usuario;
  socket.join(`evento:${ev.codigo}`);

  // Historial de privados en los que participa (para reconexiones)
  const misPrivados = {};
  for (const [clave, msgs] of ev.privados) {
    if (clave.split('|').includes(usuario.id)) misPrivados[clave] = msgs;
  }

  return {
    ok: true,
    userId: usuario.id,
    token: usuario.token,
    perfil: perfilPublico(usuario),
    evento: {
      codigo: ev.codigo,
      nombre: ev.nombre,
      geo: ev.geo,
      balance: ev.balance,
      expiraEn: ev.expiraEn,
    },
    usuarios: listaUsuarios(ev),
    general: ev.general,
    privados: misPrivados,
    bloqueados: Array.from(usuario.bloqueados),
  };
}

/**
 * Borra por completo a una persona del evento: perfil, foto, sus mensajes
 * del canal general y todas sus conversaciones privadas (para ambas partes).
 * Se avisa al resto de clientes para que también lo eliminen de su pantalla.
 */
function purgarUsuario(ev, userId, motivo) {
  const u = ev.usuarios.get(userId);
  if (!u) return;
  ev.usuarios.delete(userId);
  ev.general = ev.general.filter((m) => m.de !== userId);
  for (const clave of Array.from(ev.privados.keys())) {
    if (clave.split('|').includes(userId)) ev.privados.delete(clave);
  }
  for (const otro of ev.usuarios.values()) otro.bloqueados.delete(userId);
  io.to(`evento:${ev.codigo}`).emit('usuario:purgado', { userId });
  io.to(`evento:${ev.codigo}`).emit('usuarios:cambio', listaUsuarios(ev));
  if (u.socketId) io.sockets.sockets.get(u.socketId)?.disconnect(true);
  console.log(`[qrchat] ${ev.codigo}: usuario purgado (${motivo})`);
  revisarCola(ev); // su hueco puede dar entrada a alguien en espera
}

// Limpieza periódica: eventos caducados y personas que abandonaron el espacio
setInterval(() => {
  for (const ev of eventos.values()) {
    if (Date.now() > ev.expiraEn) {
      finalizarEvento(ev);
      continue;
    }
    for (const u of Array.from(ev.usuarios.values())) {
      if (!u.online && u.desconectadoEn && Date.now() - u.desconectadoEn > GRACIA_MS) {
        purgarUsuario(ev, u.id, 'ausencia prolongada');
      }
    }
  }
}, SWEEP_MS);

/* ────────────────────────────────── API ──────────────────────────────────── */

// Crear evento → devuelve código, URL de acceso y QR listo para proyectar
app.post('/api/eventos', async (req, res) => {
  const nombre = limpiarTexto(req.body?.nombre, 60) || 'Evento sin nombre';
  let horas = Number(req.body?.horas) || HORAS_DEFECTO;
  horas = Math.min(Math.max(horas, 1), HORAS_MAX);

  // Geovallado opcional: centro + radio del espacio físico del evento
  let geo = null;
  const g = req.body?.geo;
  if (g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lng))) {
    const radio = Math.min(Math.max(Number(g.radio) || 100, 30), 1000);
    geo = { lat: Number(g.lat), lng: Number(g.lng), radio };
  }

  // Equilibrio chicos/chicas opcional: los chicos nunca superan a las chicas
  // en más de `margen`; el margen inicial permite arrancar el evento.
  let balance = null;
  const b = req.body?.balance;
  if (b && b.activo) {
    const margen = Math.min(Math.max(Number(b.margen) || 5, 1), 20);
    balance = { margen };
  }

  const codigo = generarCodigo();
  const ev = {
    codigo,
    nombre,
    geo,
    balance,
    creadoEn: Date.now(),
    expiraEn: Date.now() + horas * 3600 * 1000,
    adminToken: crypto.randomUUID(),
    usuarios: new Map(),
    general: [],
    privados: new Map(),
    cola: [],
  };
  eventos.set(codigo, ev);

  const url = `${baseUrl(req)}/e/${codigo}`;
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });
  console.log(`[qrchat] Evento creado: ${codigo} («${nombre}», ${horas} h)`);
  res.json({
    codigo,
    nombre,
    geo: ev.geo,
    balance: ev.balance,
    url,
    qr,
    expiraEn: ev.expiraEn,
    pantalla: `${baseUrl(req)}/pantalla/${codigo}`,
  });
});

// Info pública de un evento (para la pantalla de proyección y la app)
app.get('/api/eventos/:codigo', async (req, res) => {
  const ev = eventoActivo(req.params.codigo.toUpperCase());
  if (!ev) return res.status(404).json({ error: 'Evento no encontrado o finalizado' });
  const url = `${baseUrl(req)}/e/${ev.codigo}`;
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });
  res.json({
    codigo: ev.codigo,
    nombre: ev.nombre,
    geo: ev.geo,
    balance: ev.balance,
    url,
    qr,
    expiraEn: ev.expiraEn,
    personas: ev.usuarios.size,
    sexos: contarSexos(ev),
  });
});

/* ── Cuentas guardadas ── */

// Crear cuenta (gratis por ahora; con el flag de pago activo se bloquea)
app.post('/api/cuentas', (req, res) => {
  if (CUENTAS_DE_PAGO) {
    return res.status(402).json({
      error: 'Crear una cuenta es ahora una opción de pago. ¡Muy pronto podrás contratarla aquí!',
      dePago: true,
    });
  }
  const aliasNorm = normalizarAlias(req.body?.alias);
  if (!aliasNorm) {
    return res.status(400).json({ error: 'Alias no válido: 3-20 caracteres, solo letras, números, ".", "-" o "_".' });
  }
  if (cuentas.has(aliasNorm)) {
    return res.status(409).json({ error: 'Ese alias ya está cogido. Prueba con otro.' });
  }
  const pin = String(req.body?.pin || '');
  if (pin.length < 4 || pin.length > 30) {
    return res.status(400).json({ error: 'El PIN debe tener entre 4 y 30 caracteres.' });
  }
  const perfil = perfilDeCuenta(req.body?.perfil);
  if (!perfil.nombre) {
    return res.status(400).json({ error: 'El perfil necesita un nombre.' });
  }
  const sal = crypto.randomBytes(16).toString('hex');
  const cuenta = {
    alias: limpiarTexto(req.body.alias, 20),
    aliasNorm,
    sal,
    hash: hashPin(pin, sal),
    token: crypto.randomUUID(),
    perfil,
    creadaEn: Date.now(),
  };
  cuentas.set(aliasNorm, cuenta);
  guardarCuentas();
  console.log(`[qrchat] Cuenta creada: ${aliasNorm}`);
  res.json({ alias: cuenta.alias, token: cuenta.token, perfil: cuenta.perfil });
});

// Iniciar sesión con alias + PIN
app.post('/api/cuentas/login', (req, res) => {
  const aliasNorm = normalizarAlias(req.body?.alias);
  const cuenta = aliasNorm && cuentas.get(aliasNorm);
  const pin = String(req.body?.pin || '');
  if (!cuenta || pin.length < 4) {
    return res.status(401).json({ error: 'Alias o PIN incorrectos.' });
  }
  const intento = Buffer.from(hashPin(pin, cuenta.sal));
  const bueno = Buffer.from(cuenta.hash);
  if (intento.length !== bueno.length || !crypto.timingSafeEqual(intento, bueno)) {
    return res.status(401).json({ error: 'Alias o PIN incorrectos.' });
  }
  res.json({ alias: cuenta.alias, token: cuenta.token, perfil: cuenta.perfil });
});

// Comprobación de vida para el hosting (health check)
app.get('/salud', (_req, res) => {
  res.json({ ok: true, eventos: eventos.size, cuentas: cuentas.size });
});

// Rutas de página (SPA sencilla: cada pantalla es un HTML propio)
app.get('/e/:codigo', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'app.html')));
app.get('/pantalla/:codigo', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pantalla.html')));

/* ─────────────────────────────── Socket.IO ───────────────────────────────── */

io.on('connection', (socket) => {
  socket.data.ev = null;     // evento al que está unido este socket
  socket.data.yo = null;     // usuario de este socket
  socket.data.enCola = null; // evento en cuya cola de espera está

  /* La pantalla de proyección solo escucha el contador de personas */
  socket.on('pantalla:unirse', ({ codigo } = {}, cb) => {
    const e = eventoActivo(String(codigo || '').toUpperCase());
    if (!e) return cb?.({ error: 'Evento no encontrado o finalizado' });
    socket.join(`evento:${e.codigo}`);
    cb?.({ ok: true, personas: e.usuarios.size, nombre: e.nombre, expiraEn: e.expiraEn });
  });

  /* Unirse al evento con un perfil temporal (o reconectar con token) */
  socket.on('unirse', (datos = {}, cb) => {
    const e = eventoActivo(String(datos.codigo || '').toUpperCase());
    if (!e) return cb?.({ error: 'Este evento no existe o ya ha finalizado.' });

    const esReconexion =
      datos.userId && datos.token && e.usuarios.get(datos.userId)?.token === datos.token;

    // Entrada con cuenta guardada: el perfil sale de la cuenta
    let cuenta = null;
    if (!esReconexion && datos.cuenta) {
      cuenta = cuentaPorToken(datos.cuenta);
      if (!cuenta) {
        return cb?.({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión en tu cuenta.', cuentaInvalida: true });
      }
    }

    if (!esReconexion) {
      const perfilBase = cuenta ? cuenta.perfil : datos;
      if (!limpiarTexto(perfilBase.nombre, 30)) {
        return cb?.({ error: 'Elige un nombre para tu perfil.' });
      }
      // Equilibrio: si es chico y no hay hueco, pasa a la cola de espera
      const sexo = ['h', 'm', 'x'].includes(perfilBase.sexo) ? perfilBase.sexo : 'x';
      if (sexo === 'h' && !hayHuecoParaChico(e)) {
        sacarDeCola(e, socket); // por si reintenta: no duplicar
        e.cola.push({ socket, datos, cuenta });
        socket.data.enCola = e;
        return cb?.({ enEspera: true, posicion: e.cola.length, total: e.cola.length });
      }
    }

    const carga = admitir(socket, e, datos, cuenta);
    cb?.(carga);
    socket.to(`evento:${e.codigo}`).emit('usuarios:cambio', listaUsuarios(e));
    revisarCola(e); // si entró una chica, puede abrir hueco a alguien en espera
  });

  /* Mensaje al canal general (texto y/o foto) */
  socket.on('general:mensaje', (datos = {}, cb) => {
    const { ev, yo } = socket.data;
    if (!ev || !yo) return;
    const texto = limpiarTexto(datos.texto, 1000);
    const foto = fotoValida(datos.foto) ? datos.foto : null;
    if (!texto && !foto) return cb?.({ error: 'Mensaje vacío' });

    const msg = { id: crypto.randomUUID(), de: yo.id, texto, foto, ts: Date.now() };
    ev.general.push(msg);
    if (ev.general.length > MAX_MENSAJES_GENERAL) ev.general.shift();
    io.to(`evento:${ev.codigo}`).emit('general:mensaje', msg);
    cb?.({ ok: true });
  });

  /* Mensaje privado 1 a 1 */
  socket.on('privado:mensaje', (datos = {}, cb) => {
    const { ev, yo } = socket.data;
    if (!ev || !yo) return;
    const destino = ev.usuarios.get(String(datos.para || ''));
    if (!destino || destino.id === yo.id) return cb?.({ error: 'Persona no disponible' });
    if (destino.bloqueados.has(yo.id)) {
      // No revelamos el bloqueo: el mensaje simplemente no llega.
      return cb?.({ ok: true });
    }
    const texto = limpiarTexto(datos.texto, 1000);
    const foto = fotoValida(datos.foto) ? datos.foto : null;
    if (!texto && !foto) return cb?.({ error: 'Mensaje vacío' });

    const clave = clavePrivada(yo.id, destino.id);
    if (!ev.privados.has(clave)) ev.privados.set(clave, []);
    const hilo = ev.privados.get(clave);
    const msg = { id: crypto.randomUUID(), de: yo.id, para: destino.id, texto, foto, ts: Date.now() };
    hilo.push(msg);
    if (hilo.length > MAX_MENSAJES_PRIVADO) hilo.shift();

    if (destino.online && destino.socketId) {
      io.to(destino.socketId).emit('privado:mensaje', msg);
    }
    cb?.({ ok: true, mensaje: msg });
  });

  /* Bloquear / desbloquear: sus privados dejan de llegarte */
  socket.on('bloquear', ({ userId, bloquear } = {}) => {
    const { ev, yo } = socket.data;
    if (!ev || !yo) return;
    if (!ev.usuarios.has(userId)) return;
    if (bloquear) yo.bloqueados.add(userId);
    else yo.bloqueados.delete(userId);
  });

  /* Editar el propio perfil */
  socket.on('perfil:editar', (datos = {}, cb) => {
    const { ev, yo } = socket.data;
    if (!ev || !yo) return;
    if (datos.nombre !== undefined) yo.nombre = limpiarTexto(datos.nombre, 30) || yo.nombre;
    if (datos.emoji !== undefined) yo.emoji = limpiarTexto(datos.emoji, 4) || yo.emoji;
    if (datos.bio !== undefined) yo.bio = limpiarTexto(datos.bio, 120);
    if (datos.foto !== undefined) yo.foto = fotoValida(datos.foto) ? datos.foto : null;
    // Con cuenta guardada, los cambios de perfil se guardan también en ella
    if (yo.cuentaAlias && cuentas.has(yo.cuentaAlias)) {
      const cuenta = cuentas.get(yo.cuentaAlias);
      cuenta.perfil = { nombre: yo.nombre, sexo: yo.sexo, emoji: yo.emoji, bio: yo.bio, foto: yo.foto };
      guardarCuentas();
    }
    io.to(`evento:${ev.codigo}`).emit('usuarios:cambio', listaUsuarios(ev));
    cb?.({ ok: true, perfil: perfilPublico(yo) });
  });

  /* Abandonar el espacio: se borra TODO lo de esta persona al instante */
  socket.on('salir', (datos = {}) => {
    if (socket.data.enCola) {
      sacarDeCola(socket.data.enCola, socket);
      socket.data.enCola = null;
      return;
    }
    const { ev, yo } = socket.data;
    if (!ev || !yo) return;
    const motivo = datos.motivo === 'fuera-de-zona' ? 'salió del espacio' : 'salida voluntaria';
    socket.data.ev = null;
    socket.data.yo = null;
    purgarUsuario(ev, yo.id, motivo);
  });

  socket.on('disconnect', () => {
    if (socket.data.enCola) {
      sacarDeCola(socket.data.enCola, socket);
      socket.data.enCola = null;
    }
    const { ev, yo } = socket.data;
    if (!ev || !yo) return;
    yo.online = false;
    yo.socketId = null;
    yo.desconectadoEn = Date.now();
    socket.to(`evento:${ev.codigo}`).emit('usuarios:cambio', listaUsuarios(ev));
  });
});

/* ────────────────────────────────── Arranque ─────────────────────────────── */

server.listen(PORT, () => {
  console.log(`[qrchat] Servidor escuchando en http://localhost:${PORT}`);
});
