/*
 * QRChat — chat efímero por código QR para eventos (discotecas, fiestas, congresos…)
 *
 * Todo se guarda SOLO en memoria: cuando un evento expira (o el servidor se
 * reinicia) desaparecen perfiles, fotos y mensajes. No hay base de datos.
 */

const path = require('path');
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

/** @type {Map<string, Evento>} */
const eventos = new Map();

/*
Evento = {
  codigo, nombre, creadoEn, expiraEn, adminToken,
  usuarios: Map<userId, { id, token, nombre, emoji, bio, foto, online, socketId, bloqueados:Set }>,
  general: [mensaje],
  privados: Map<claveOrdenada, [mensaje]>,
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
  io.in(`evento:${ev.codigo}`).disconnectSockets(true);
  eventos.delete(ev.codigo);
  console.log(`[qrchat] Evento ${ev.codigo} finalizado y borrado`);
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
    emoji: u.emoji,
    bio: u.bio,
    foto: u.foto,
    online: u.online,
  };
}

function listaUsuarios(ev) {
  return Array.from(ev.usuarios.values()).map(perfilPublico);
}

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

  const codigo = generarCodigo();
  const ev = {
    codigo,
    nombre,
    geo,
    creadoEn: Date.now(),
    expiraEn: Date.now() + horas * 3600 * 1000,
    adminToken: crypto.randomUUID(),
    usuarios: new Map(),
    general: [],
    privados: new Map(),
  };
  eventos.set(codigo, ev);

  const url = `${baseUrl(req)}/e/${codigo}`;
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });
  console.log(`[qrchat] Evento creado: ${codigo} («${nombre}», ${horas} h)`);
  res.json({
    codigo,
    nombre,
    geo: ev.geo,
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
    url,
    qr,
    expiraEn: ev.expiraEn,
    personas: ev.usuarios.size,
  });
});

// Rutas de página (SPA sencilla: cada pantalla es un HTML propio)
app.get('/e/:codigo', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'app.html')));
app.get('/pantalla/:codigo', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'pantalla.html')));

/* ─────────────────────────────── Socket.IO ───────────────────────────────── */

io.on('connection', (socket) => {
  let ev = null; // evento al que está unido este socket
  let yo = null; // usuario de este socket

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

    let usuario = null;
    if (datos.userId && datos.token) {
      const previo = e.usuarios.get(datos.userId);
      if (previo && previo.token === datos.token) usuario = previo; // reconexión
    }

    if (!usuario) {
      const nombre = limpiarTexto(datos.nombre, 30);
      if (!nombre) return cb?.({ error: 'Elige un nombre para tu perfil.' });
      usuario = {
        id: crypto.randomUUID(),
        token: crypto.randomUUID(),
        nombre,
        emoji: limpiarTexto(datos.emoji, 4) || '🙂',
        bio: limpiarTexto(datos.bio, 120),
        foto: fotoValida(datos.foto) ? datos.foto : null,
        online: true,
        socketId: socket.id,
        desconectadoEn: null,
        bloqueados: new Set(),
      };
      e.usuarios.set(usuario.id, usuario);
    } else {
      usuario.online = true;
      usuario.socketId = socket.id;
      usuario.desconectadoEn = null;
    }

    ev = e;
    yo = usuario;
    socket.join(`evento:${e.codigo}`);

    // Historial de privados en los que participa (para reconexiones)
    const misPrivados = {};
    for (const [clave, msgs] of e.privados) {
      if (clave.split('|').includes(yo.id)) misPrivados[clave] = msgs;
    }

    cb?.({
      ok: true,
      userId: usuario.id,
      token: usuario.token,
      perfil: perfilPublico(usuario),
      evento: { codigo: e.codigo, nombre: e.nombre, geo: e.geo, expiraEn: e.expiraEn },
      usuarios: listaUsuarios(e),
      general: e.general,
      privados: misPrivados,
      bloqueados: Array.from(usuario.bloqueados),
    });
    socket.to(`evento:${e.codigo}`).emit('usuarios:cambio', listaUsuarios(e));
  });

  /* Mensaje al canal general (texto y/o foto) */
  socket.on('general:mensaje', (datos = {}, cb) => {
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
    if (!ev || !yo) return;
    if (!ev.usuarios.has(userId)) return;
    if (bloquear) yo.bloqueados.add(userId);
    else yo.bloqueados.delete(userId);
  });

  /* Editar el propio perfil */
  socket.on('perfil:editar', (datos = {}, cb) => {
    if (!ev || !yo) return;
    if (datos.nombre !== undefined) yo.nombre = limpiarTexto(datos.nombre, 30) || yo.nombre;
    if (datos.emoji !== undefined) yo.emoji = limpiarTexto(datos.emoji, 4) || yo.emoji;
    if (datos.bio !== undefined) yo.bio = limpiarTexto(datos.bio, 120);
    if (datos.foto !== undefined) yo.foto = fotoValida(datos.foto) ? datos.foto : null;
    io.to(`evento:${ev.codigo}`).emit('usuarios:cambio', listaUsuarios(ev));
    cb?.({ ok: true, perfil: perfilPublico(yo) });
  });

  /* Abandonar el espacio: se borra TODO lo de esta persona al instante */
  socket.on('salir', (datos = {}) => {
    if (!ev || !yo) return;
    const motivo = datos.motivo === 'fuera-de-zona' ? 'salió del espacio' : 'salida voluntaria';
    const e = ev;
    const id = yo.id;
    ev = null;
    yo = null;
    purgarUsuario(e, id, motivo);
  });

  socket.on('disconnect', () => {
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
