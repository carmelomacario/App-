/* ATMO · Vivir el momento — lógica de la app de chat (cliente) */
(() => {
  const $ = (id) => document.getElementById(id);
  const codigo = location.pathname.split('/').pop().toUpperCase();
  const claveSesion = 'qrchat:' + codigo;
  const CLAVE_CUENTA = 'qrchat:cuenta'; // cuenta guardada (persiste entre eventos)

  function cuentaGuardada() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_CUENTA));
    } catch {
      return null;
    }
  }

  const EMOJIS = ['🙂','😎','🥳','😈','🦄','🔥','💃','🕺','🍹','🎧','🌙','⚡','👽','🐯','🌵','💜','🎭','🍒'];
  const SEXO_ICONO = { h: '🕺', m: '💃', x: '✨' };

  const estado = {
    socket: null,
    yo: null,            // { id, token, perfil }
    evento: null,
    usuarios: [],        // perfiles públicos
    general: [],
    privados: new Map(), // otroId -> [mensajes]
    noLeidos: new Map(), // otroId -> nº
    bloqueados: new Set(),
    vistaActual: 'general',
    privadoAbierto: null, // otroId del chat privado abierto
    emojiElegido: '🙂',
    sexoElegido: null,
    fotoPerfil: null,
    personaModal: null,
    vigilanciaGeo: null,  // id de watchPosition
    fueraDesde: null,     // desde cuándo estamos fuera del radio
  };

  // Tiempo seguido fuera del radio antes de expulsar (evita saltos del GPS)
  const FUERA_MS = 45 * 1000;

  /* ───────────────────────── Utilidades ───────────────────────── */

  const escaparHtml = (t) =>
    t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const hora = (ts) =>
    new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const textoPersonas = (n) => `${n} ${n === 1 ? 'persona' : 'personas'} · código ${codigo}`;

  function usuario(id) {
    return estado.usuarios.find((u) => u.id === id) || { nombre: 'Alguien', emoji: '👻', foto: null };
  }

  function avatarHtml(u, clase = 'avatar-mini') {
    const dentro = u.foto ? `<img src="${u.foto}" alt="" />` : (u.emoji || '🙂');
    return `<div class="${clase}" data-user="${u.id || ''}">${dentro}</div>`;
  }

  // Reduce una imagen a máx. 1280 px y la devuelve como data-URL JPEG
  function comprimirImagen(fichero) {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      const url = URL.createObjectURL(fichero);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1280;
        const escala = Math.min(1, MAX / Math.max(img.width, img.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        resolver(lienzo.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
      img.src = url;
    });
  }

  /* Visor de fotos a pantalla completa (toca la foto para ampliarla) */
  function abrirVisor(src) {
    $('visor-img').src = src;
    $('visor').classList.remove('oculto');
  }

  /* ── Protección anticapturas ──────────────────────────────────
     Una web no puede IMPEDIR capturas de pantalla (eso lo controla el
     sistema operativo), así que la defensa real es la disuasión:
     todo lo que ves lleva tu propia identidad en marca de agua, de modo
     que cualquier captura difundida delata a quien la hizo. */

  function aplicarMarcaAgua() {
    const texto = `${estado.yo.perfil.nombre} · ${estado.yo.id.slice(0, 8)} · ${codigo}`;
    const seguro = texto.replace(/[<>&'"]/g, '');
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='190'>` +
      `<text x='10' y='105' font-family='sans-serif' font-size='15' fill='rgba(255,255,255,0.07)' transform='rotate(-24 150 95)'>${seguro}</text>` +
      `</svg>`;
    const fondo = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    $('marca-agua').style.backgroundImage = fondo;
    $('marca-agua-visor').style.backgroundImage = fondo;
  }

  function activarProteccion() {
    // Difuminar el contenido cuando la app pasa a segundo plano
    // (las miniaturas del selector de apps no muestran el chat)
    const alCambiar = () => {
      document.body.classList.toggle('difuminado', document.hidden);
    };
    document.addEventListener('visibilitychange', alCambiar);
    window.addEventListener('blur', () => document.body.classList.add('difuminado'));
    window.addEventListener('focus', () => document.body.classList.remove('difuminado'));

    // Sin menú contextual ni "guardar imagen" con pulsación larga
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('#pantalla-chat, #visor')) e.preventDefault();
    });
    document.addEventListener('dragstart', (e) => {
      if (e.target.tagName === 'IMG') e.preventDefault();
    });
  }

  function mostrarPantalla(id) {
    for (const p of document.querySelectorAll('.pantalla')) p.classList.add('oculto');
    $(id).classList.remove('oculto');
  }

  function mostrarFin(titulo, sub) {
    $('fin-titulo').textContent = titulo;
    if (sub) $('fin-sub').innerHTML = sub;
    mostrarPantalla('pantalla-fin');
  }

  function distanciaMetros(a, b) {
    const R = 6371000;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  /* Abandono del espacio: se borra todo, aquí y en el servidor */
  function salirDelEspacio(motivo, titulo, sub) {
    if (estado.vigilanciaGeo !== null) {
      navigator.geolocation.clearWatch(estado.vigilanciaGeo);
      estado.vigilanciaGeo = null;
    }
    estado.socket?.emit('salir', { motivo });
    sessionStorage.removeItem(claveSesion);
    estado.general = [];
    estado.privados = new Map();
    estado.noLeidos = new Map();
    mostrarFin(titulo, sub);
  }

  /* Vigila la posición: si sales del radio del evento un rato, fuera y borrado */
  function vigilarZona() {
    const geo = estado.evento?.geo;
    if (!geo || !('geolocation' in navigator) || estado.vigilanciaGeo !== null) return;
    estado.vigilanciaGeo = navigator.geolocation.watchPosition(
      (pos) => {
        const d = distanciaMetros(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          geo
        );
        // Margen por imprecisión del GPS (máx. 100 m) para no expulsar dentro del local
        const fuera = d > geo.radio + Math.min(pos.coords.accuracy || 0, 100);
        if (fuera) {
          if (!estado.fueraDesde) estado.fueraDesde = Date.now();
          else if (Date.now() - estado.fueraDesde > FUERA_MS) {
            salirDelEspacio(
              'fuera-de-zona',
              'Has salido del espacio del evento 📍',
              'Tu perfil, tus fotos y todos tus mensajes<br/>se han borrado por completo.'
            );
          }
        } else {
          estado.fueraDesde = null;
        }
      },
      (err) => {
        // Si retiran el permiso de ubicación en un evento geovallado, fuera
        if (err.code === err.PERMISSION_DENIED) {
          salirDelEspacio(
            'fuera-de-zona',
            'Ubicación desactivada 📍',
            'Este evento requiere compartir ubicación mientras estás dentro.<br/>Tu perfil y tus mensajes se han borrado.'
          );
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
    );
  }

  /* ─────────────────────── Pantalla de perfil ─────────────────── */

  function prepararPerfil() {
    const cont = $('lista-emojis');
    for (const e of EMOJIS) {
      const b = document.createElement('button');
      b.textContent = e;
      b.onclick = () => {
        estado.emojiElegido = e;
        estado.fotoPerfil = null;
        $('avatar-preview').innerHTML = e;
        for (const x of cont.children) x.classList.toggle('activo', x === b);
      };
      cont.appendChild(b);
    }
    cont.children[0].classList.add('activo');

    const sexos = $('lista-sexos');
    for (const b of sexos.children) {
      b.onclick = () => {
        estado.sexoElegido = b.dataset.sexo;
        for (const x of sexos.children) x.classList.toggle('activo', x === b);
      };
    }

    // Foto de perfil: selfie con la cámara frontal o foto de la galería
    const ponerFotoPerfil = async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      estado.fotoPerfil = await comprimirImagen(f);
      $('avatar-preview').innerHTML = `<img src="${estado.fotoPerfil}" alt="" />`;
    };
    $('avatar-preview').onclick = () => $('input-foto-perfil').click();
    $('btn-galeria-perfil').onclick = () => $('input-foto-perfil').click();
    $('btn-selfie-perfil').onclick = () => $('input-selfie-perfil').click();
    $('input-foto-perfil').onchange = ponerFotoPerfil;
    $('input-selfie-perfil').onchange = ponerFotoPerfil;

    // Evento geovallado: hace falta permiso de ubicación para entrar
    const pedirUbicacion = async () => {
      if (!estado.geoEvento) return true;
      $('perfil-error').textContent = '';
      try {
        await new Promise((ok, mal) =>
          navigator.geolocation.getCurrentPosition(ok, mal, { timeout: 20000 })
        );
        return true;
      } catch {
        $('perfil-error').textContent =
          'Este evento solo funciona dentro del local: activa la ubicación para entrar.';
        return false;
      }
    };

    const validarPerfil = () => {
      if (!$('perfil-nombre').value.trim()) {
        $('perfil-error').textContent = 'Ponte un nombre o apodo para entrar.';
        return false;
      }
      if (!estado.sexoElegido) {
        $('perfil-error').textContent = 'Indica tu sexo para entrar.';
        return false;
      }
      return true;
    };

    const perfilDelFormulario = () => ({
      nombre: $('perfil-nombre').value.trim(),
      sexo: estado.sexoElegido,
      emoji: estado.emojiElegido,
      bio: $('perfil-bio').value.trim(),
      foto: estado.fotoPerfil,
    });

    $('btn-entrar').onclick = async () => {
      if (!validarPerfil()) return;
      if (!(await pedirUbicacion())) return;
      conectar(perfilDelFormulario());
    };

    /* ── Cuenta guardada: crear / iniciar sesión / entrar con ella ── */

    const refrescarZonaCuenta = () => {
      const c = cuentaGuardada();
      $('cuenta-anonima').classList.toggle('oculto', !!c);
      $('cuenta-conectada').classList.toggle('oculto', !c);
      if (c) $('btn-entrar-cuenta').textContent = `⭐ Entrar como ${c.nombre || c.alias}`;
    };
    refrescarZonaCuenta();

    let modoCuenta = 'crear';
    for (const b of $('cuenta-modos').children) {
      b.onclick = () => {
        modoCuenta = b.dataset.modo;
        for (const x of $('cuenta-modos').children) x.classList.toggle('activo', x === b);
        $('cuenta-aceptar').textContent = modoCuenta === 'crear' ? 'Crear cuenta y entrar' : 'Iniciar sesión y entrar';
        $('cuenta-nota').classList.toggle('oculto', modoCuenta !== 'crear');
        $('cuenta-error').textContent = '';
      };
    }

    $('btn-abrir-cuenta').onclick = () => {
      $('cuenta-error').textContent = '';
      $('modal-cuenta').classList.remove('oculto');
    };
    $('cuenta-cancelar').onclick = () => $('modal-cuenta').classList.add('oculto');
    $('modal-cuenta').onclick = (e) => {
      if (e.target === $('modal-cuenta')) $('modal-cuenta').classList.add('oculto');
    };

    $('cuenta-aceptar').onclick = async () => {
      const alias = $('cuenta-alias').value.trim();
      const pin = $('cuenta-pin').value;
      $('cuenta-error').textContent = '';
      if (modoCuenta === 'crear' && !validarPerfil()) {
        $('cuenta-error').textContent = 'Rellena antes tu perfil (nombre y sexo) en el formulario.';
        return;
      }
      $('cuenta-aceptar').disabled = true;
      try {
        const ruta = modoCuenta === 'crear' ? '/api/cuentas' : '/api/cuentas/login';
        const cuerpo = { alias, pin };
        if (modoCuenta === 'crear') cuerpo.perfil = perfilDelFormulario();
        const r = await fetch(ruta, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
        });
        const datos = await r.json();
        if (!r.ok) throw new Error(datos.error || 'No se pudo completar.');
        localStorage.setItem(
          CLAVE_CUENTA,
          JSON.stringify({ alias: datos.alias, token: datos.token, nombre: datos.perfil.nombre })
        );
        refrescarZonaCuenta();
        $('modal-cuenta').classList.add('oculto');
        if (!(await pedirUbicacion())) return;
        conectar({ cuenta: { alias: datos.alias, token: datos.token } });
      } catch (e) {
        $('cuenta-error').textContent = e.message;
      } finally {
        $('cuenta-aceptar').disabled = false;
      }
    };

    $('btn-entrar-cuenta').onclick = async () => {
      const c = cuentaGuardada();
      if (!c) return refrescarZonaCuenta();
      if (!(await pedirUbicacion())) return;
      conectar({ cuenta: { alias: c.alias, token: c.token } });
    };

    $('btn-cerrar-sesion').onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem(CLAVE_CUENTA);
      refrescarZonaCuenta();
    };

    // Muestra el nombre del evento antes de entrar
    fetch('/api/eventos/' + codigo)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((ev) => {
        estado.geoEvento = ev.geo || null;
        $('perfil-evento').innerHTML =
          '📍 ' + escaparHtml(ev.nombre) +
          (ev.geo ? '<br/><small>Evento limitado al espacio físico: al salir del recinto todo se borra.</small>' : '');
      })
      .catch(() => mostrarFin('Este evento no existe o ya ha finalizado'));
  }

  /* ─────────────────────── Conexión Socket.IO ─────────────────── */

  function conectar(perfilNuevo) {
    const guardado = JSON.parse(sessionStorage.getItem(claveSesion) || 'null');
    const socket = io();
    estado.socket = socket;

    const datos = { codigo, ...(perfilNuevo || {}) };
    if (guardado) Object.assign(datos, { userId: guardado.userId, token: guardado.token });

    const alUnirse = (resp) => {
      if (!resp || resp.error) {
        if (resp?.cuentaInvalida) {
          // La sesión de la cuenta caducó: la olvidamos y volvemos a empezar
          localStorage.removeItem(CLAVE_CUENTA);
          alert(resp.error);
          location.reload();
          return;
        }
        if (guardado) {
          // La sesión guardada ya no vale: pedimos perfil de nuevo
          sessionStorage.removeItem(claveSesion);
          mostrarPantalla('pantalla-perfil');
          return;
        }
        $('perfil-error').textContent = resp?.error || 'No se pudo entrar.';
        mostrarPantalla('pantalla-perfil');
        return;
      }
      // Equilibrio chicos/chicas: a la cola hasta que se libere un hueco
      if (resp.enEspera) {
        $('espera-posicion').textContent = resp.posicion;
        mostrarPantalla('pantalla-espera');
        return;
      }
      sessionStorage.setItem(claveSesion, JSON.stringify({ userId: resp.userId, token: resp.token }));
      estado.yo = { id: resp.userId, token: resp.token, perfil: resp.perfil };
      estado.evento = resp.evento;
      estado.usuarios = resp.usuarios;
      estado.general = resp.general;
      estado.bloqueados = new Set(resp.bloqueados);
      estado.privados = new Map();
      for (const [clave, msgs] of Object.entries(resp.privados)) {
        const otro = clave.split('|').find((x) => x !== resp.userId);
        if (otro) estado.privados.set(otro, msgs);
      }
      iniciarChat();
    };

    socket.emit('unirse', datos, alUnirse);
    socket.on('espera:admitido', alUnirse);
    socket.on('espera:posicion', ({ posicion }) => {
      $('espera-posicion').textContent = posicion;
    });

    socket.on('general:mensaje', (m) => {
      estado.general.push(m);
      if (estado.vistaActual === 'general') pintarGeneral();
    });

    socket.on('privado:mensaje', (m) => {
      if (estado.bloqueados.has(m.de)) return; // ignorar bloqueados
      if (!estado.privados.has(m.de)) estado.privados.set(m.de, []);
      estado.privados.get(m.de).push(m);
      if (estado.vistaActual === 'chat-privado' && estado.privadoAbierto === m.de) {
        pintarPrivado();
      } else {
        estado.noLeidos.set(m.de, (estado.noLeidos.get(m.de) || 0) + 1);
        pintarBadges();
        if (estado.vistaActual === 'privados') pintarListaPrivados();
      }
    });

    // Alguien abandonó el espacio: eliminamos todo rastro suyo también aquí
    socket.on('usuario:purgado', ({ userId }) => {
      if (userId === estado.yo?.id) return; // nuestra propia purga se gestiona en salirDelEspacio
      estado.general = estado.general.filter((m) => m.de !== userId);
      estado.privados.delete(userId);
      estado.noLeidos.delete(userId);
      estado.bloqueados.delete(userId);
      pintarBadges();
      if (estado.vistaActual === 'general') pintarGeneral();
      if (estado.vistaActual === 'privados') pintarListaPrivados();
      if (estado.vistaActual === 'chat-privado' && estado.privadoAbierto === userId) {
        cambiarVista('privados');
      }
    });

    socket.on('usuarios:cambio', (usuarios) => {
      estado.usuarios = usuarios;
      $('chat-info').textContent = textoPersonas(usuarios.length);
      if (estado.vistaActual === 'general') pintarGeneral();
      if (estado.vistaActual === 'gente') pintarGente();
      if (estado.vistaActual === 'privados') pintarListaPrivados();
      if (estado.vistaActual === 'chat-privado') pintarCabeceraPrivado();
    });

    socket.on('evento:finalizado', () => {
      sessionStorage.removeItem(claveSesion);
      mostrarFin('El evento ha finalizado 🌙');
    });

    socket.on('disconnect', () => {
      $('chat-info').textContent = 'Reconectando…';
    });

    socket.io.on('reconnect', () => {
      const s = JSON.parse(sessionStorage.getItem(claveSesion) || 'null');
      if (s) socket.emit('unirse', { codigo, userId: s.userId, token: s.token }, () => {});
    });
  }

  /* ────────────────────────── Chat: vistas ────────────────────── */

  function iniciarChat() {
    mostrarPantalla('pantalla-chat');
    $('chat-evento').textContent = estado.evento.nombre;
    $('chat-info').textContent = textoPersonas(estado.usuarios.length);
    pintarGeneral();
    pintarBadges();
    aplicarMarcaAgua();
    vigilarZona();
  }

  function cambiarVista(nombre) {
    estado.vistaActual = nombre;
    for (const b of document.querySelectorAll('nav.pestanas button')) {
      b.classList.toggle('activa', b.dataset.vista === nombre);
    }
    for (const v of document.querySelectorAll('.vista')) v.classList.remove('activa');
    $('vista-' + nombre).classList.add('activa');
    if (nombre === 'general') pintarGeneral();
    if (nombre === 'gente') pintarGente();
    if (nombre === 'privados') pintarListaPrivados();
  }

  function pintarBadges() {
    const total = Array.from(estado.noLeidos.values()).reduce((a, b) => a + b, 0);
    const badge = $('badge-privados');
    badge.textContent = total;
    badge.classList.toggle('oculto', total === 0);
  }

  function htmlMensaje(m) {
    const autor = usuario(m.de);
    const mio = m.de === estado.yo.id;
    return `
      <div class="msg ${mio ? 'mio' : ''}">
        ${avatarHtml(autor)}
        <div class="burbuja">
          <div class="autor">${escaparHtml(autor.nombre)}</div>
          ${m.texto ? `<div class="texto">${escaparHtml(m.texto)}</div>` : ''}
          ${m.foto ? `<img class="foto" src="${m.foto}" alt="Foto" />` : ''}
          <div class="hora">${hora(m.ts)}</div>
        </div>
      </div>`;
  }

  function pintarLista(contenedor, mensajes) {
    // Solo auto-bajamos si ya estábamos cerca del final (no molestar al leer)
    const cercaDelFinal =
      !contenedor.dataset.pintado ||
      contenedor.scrollHeight - contenedor.scrollTop - contenedor.clientHeight < 140;
    contenedor.innerHTML = mensajes
      .filter((m) => !estado.bloqueados.has(m.de))
      .map(htmlMensaje)
      .join('') || '<div class="aviso-sistema">Aún no hay mensajes. ¡Rompe el hielo! 🧊</div>';
    contenedor.dataset.pintado = '1';
    if (cercaDelFinal) contenedor.scrollTop = contenedor.scrollHeight;
    // Tocar un avatar abre el perfil de esa persona
    for (const av of contenedor.querySelectorAll('.avatar-mini[data-user]')) {
      const id = av.dataset.user;
      if (id && id !== estado.yo.id) av.onclick = () => abrirModalPersona(id);
    }
    // Tocar una foto del chat la amplía a pantalla completa
    for (const img of contenedor.querySelectorAll('img.foto')) {
      img.style.cursor = 'zoom-in';
      img.onclick = () => abrirVisor(img.src);
    }
  }

  const pintarGeneral = () => pintarLista($('mensajes-general'), estado.general);
  const pintarPrivado = () =>
    pintarLista($('mensajes-privado'), estado.privados.get(estado.privadoAbierto) || []);

  function pintarGente() {
    const v = $('vista-gente');
    const otros = estado.usuarios.filter((u) => u.id !== estado.yo.id);
    if (!otros.length) {
      v.innerHTML = '<div class="aviso-sistema">Todavía no hay nadie más… comparte el QR 📲</div>';
      return;
    }
    const c = { h: 0, m: 0, x: 0 };
    for (const u of estado.usuarios) c[u.sexo] = (c[u.sexo] || 0) + 1;
    const barra = `<div class="cuenta-sexos">
        <span>🕺 ${c.h} chico${c.h === 1 ? '' : 's'}</span>
        <span>💃 ${c.m} chica${c.m === 1 ? '' : 's'}</span>
        ${c.x ? `<span>✨ ${c.x}</span>` : ''}
      </div>`;
    v.innerHTML = barra + otros
      .map(
        (u) => `
        <div class="persona" data-user="${u.id}">
          ${avatarHtml(u)}
          <div class="datos">
            <div class="nombre">${escaparHtml(u.nombre)} ${SEXO_ICONO[u.sexo] || ''}${u.registrado ? ' ⭐' : ''} ${estado.bloqueados.has(u.id) ? '🚫' : ''}</div>
            <div class="bio">${escaparHtml(u.bio || '')}</div>
          </div>
          <div class="punto ${u.online ? 'online' : ''}"></div>
        </div>`
      )
      .join('');
    for (const p of v.querySelectorAll('.persona')) {
      p.onclick = () => abrirModalPersona(p.dataset.user);
    }
  }

  function pintarListaPrivados() {
    const v = $('vista-privados');
    const ids = Array.from(estado.privados.keys());
    if (!ids.length) {
      v.innerHTML =
        '<div class="aviso-sistema">No tienes conversaciones privadas.<br/>Entra en «🕺 Gente» y anímate a escribir a alguien 💌</div>';
      return;
    }
    // Ordenadas por último mensaje
    ids.sort((a, b) => {
      const ua = estado.privados.get(a).at(-1)?.ts || 0;
      const ub = estado.privados.get(b).at(-1)?.ts || 0;
      return ub - ua;
    });
    v.innerHTML = ids
      .map((id) => {
        const u = usuario(id);
        const ultimo = estado.privados.get(id).at(-1);
        const noLeidos = estado.noLeidos.get(id) || 0;
        const resumen = ultimo?.texto || (ultimo?.foto ? '📷 Foto' : '');
        return `
        <div class="persona conversacion" data-user="${id}">
          ${avatarHtml(u)}
          <div class="datos">
            <div class="nombre">${escaparHtml(u.nombre)}</div>
            <div class="bio">${escaparHtml(resumen)}</div>
          </div>
          ${noLeidos ? `<span class="badge">${noLeidos}</span>` : `<div class="punto ${u.online ? 'online' : ''}"></div>`}
        </div>`;
      })
      .join('');
    for (const p of v.querySelectorAll('.conversacion')) {
      p.onclick = () => abrirPrivado(p.dataset.user);
    }
  }

  function pintarCabeceraPrivado() {
    const u = usuario(estado.privadoAbierto);
    $('privado-nombre').textContent = `${u.foto ? '' : u.emoji + ' '}${u.nombre}`;
    $('privado-estado').textContent = u.online ? 'En el evento ahora' : 'Ausente';
  }

  function abrirPrivado(id) {
    estado.privadoAbierto = id;
    estado.noLeidos.delete(id);
    pintarBadges();
    if (!estado.privados.has(id)) estado.privados.set(id, []);
    estado.vistaActual = 'chat-privado';
    for (const v of document.querySelectorAll('.vista')) v.classList.remove('activa');
    $('vista-chat-privado').classList.add('activa');
    pintarCabeceraPrivado();
    pintarPrivado();
    $('texto-privado').focus();
  }

  /* ─────────────────────── Modal de persona ───────────────────── */

  function abrirModalPersona(id) {
    const u = usuario(id);
    estado.personaModal = id;
    $('modal-avatar').innerHTML = u.foto ? `<img src="${u.foto}" alt="" />` : u.emoji;
    $('modal-avatar').style.cursor = u.foto ? 'zoom-in' : 'default';
    $('modal-avatar').onclick = u.foto ? () => abrirVisor(u.foto) : null;
    $('modal-nombre').textContent = `${u.nombre} ${SEXO_ICONO[u.sexo] || ''}${u.registrado ? ' ⭐' : ''}`;
    $('modal-bio').textContent = u.bio || 'Sin descripción';
    $('modal-bloquear').textContent = estado.bloqueados.has(id) ? '✅ Desbloquear' : '🚫 Bloquear';
    $('modal-persona').classList.remove('oculto');
  }

  /* ─────────────────────────── Envíos ─────────────────────────── */

  function enviarGeneral(texto, foto) {
    if (!texto && !foto) return;
    estado.socket.emit('general:mensaje', { texto, foto }, () => {});
  }

  function enviarPrivado(texto, foto) {
    if (!texto && !foto) return;
    const para = estado.privadoAbierto;
    estado.socket.emit('privado:mensaje', { para, texto, foto }, (resp) => {
      if (resp?.mensaje) {
        estado.privados.get(para).push(resp.mensaje);
        pintarPrivado();
        pintarListaPrivados();
      }
    });
  }

  /* ──────────────────────────── Eventos UI ────────────────────── */

  function prepararChatUI() {
    for (const b of document.querySelectorAll('nav.pestanas button')) {
      b.onclick = () => cambiarVista(b.dataset.vista);
    }

    $('btn-enviar-general').onclick = () => {
      const t = $('texto-general').value.trim();
      $('texto-general').value = '';
      enviarGeneral(t, null);
    };
    $('btn-enviar-privado').onclick = () => {
      const t = $('texto-privado').value.trim();
      $('texto-privado').value = '';
      enviarPrivado(t, null);
    };

    // Enviar con Enter (Mayús+Enter hace salto de línea)
    for (const [area, boton] of [['texto-general', 'btn-enviar-general'], ['texto-privado', 'btn-enviar-privado']]) {
      $(area).addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          $(boton).click();
        }
      });
    }

    // Fotos en chats
    let destinoFoto = 'general';
    $('btn-foto-general').onclick = () => { destinoFoto = 'general'; $('input-foto-chat').click(); };
    $('btn-foto-privado').onclick = () => { destinoFoto = 'privado'; $('input-foto-chat').click(); };
    $('input-foto-chat').onchange = async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      const foto = await comprimirImagen(f);
      if (destinoFoto === 'general') enviarGeneral('', foto);
      else enviarPrivado('', foto);
    };

    $('btn-volver-privado').onclick = () => cambiarVista('privados');

    // El visor se cierra tocando en cualquier sitio
    $('visor').onclick = () => $('visor').classList.add('oculto');

    // Cancelar la espera en la cola de equilibrio
    $('btn-cancelar-espera').onclick = () => {
      estado.socket?.emit('salir', {});
      estado.socket?.disconnect();
      location.reload();
    };

    // Modal persona
    $('modal-cerrar').onclick = () => $('modal-persona').classList.add('oculto');
    $('modal-persona').onclick = (e) => {
      if (e.target === $('modal-persona')) $('modal-persona').classList.add('oculto');
    };
    $('modal-privado').onclick = () => {
      $('modal-persona').classList.add('oculto');
      abrirPrivado(estado.personaModal);
    };
    $('modal-bloquear').onclick = () => {
      const id = estado.personaModal;
      const bloquear = !estado.bloqueados.has(id);
      if (bloquear) estado.bloqueados.add(id);
      else estado.bloqueados.delete(id);
      estado.socket.emit('bloquear', { userId: id, bloquear });
      $('modal-persona').classList.add('oculto');
      pintarGeneral();
      if (estado.vistaActual === 'gente') pintarGente();
    };

    // Mi perfil: editar nombre, foto y bio en cualquier momento
    let miFotoNueva; // undefined = sin cambios; null = quitar; string = nueva foto
    $('btn-mi-perfil').onclick = () => {
      const p = estado.yo?.perfil;
      if (!p) return;
      miFotoNueva = undefined;
      $('mi-avatar').innerHTML = p.foto ? `<img src="${p.foto}" alt="" />` : p.emoji;
      $('mi-nombre').value = p.nombre;
      $('mi-bio').value = p.bio || '';
      $('modal-mi-perfil').classList.remove('oculto');
    };
    const cambiarMiFoto = async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      miFotoNueva = await comprimirImagen(f);
      $('mi-avatar').innerHTML = `<img src="${miFotoNueva}" alt="" />`;
    };
    $('mi-avatar').onclick = () => $('input-foto-mi-perfil').click();
    $('btn-galeria-mi-perfil').onclick = () => $('input-foto-mi-perfil').click();
    $('btn-selfie-mi-perfil').onclick = () => $('input-selfie-mi-perfil').click();
    $('input-foto-mi-perfil').onchange = cambiarMiFoto;
    $('input-selfie-mi-perfil').onchange = cambiarMiFoto;
    $('mi-guardar').onclick = () => {
      const cambios = {
        nombre: $('mi-nombre').value.trim(),
        bio: $('mi-bio').value.trim(),
      };
      if (miFotoNueva !== undefined) cambios.foto = miFotoNueva;
      estado.socket.emit('perfil:editar', cambios, (resp) => {
        if (resp?.perfil) {
          estado.yo.perfil = resp.perfil;
          aplicarMarcaAgua(); // la marca lleva el nombre: mantenerla al día
        }
        $('modal-mi-perfil').classList.add('oculto');
      });
    };
    $('mi-cerrar').onclick = () => $('modal-mi-perfil').classList.add('oculto');
    $('modal-mi-perfil').onclick = (e) => {
      if (e.target === $('modal-mi-perfil')) $('modal-mi-perfil').classList.add('oculto');
    };
    $('mi-salir').onclick = () => {
      if (confirm('¿Quieres salir del evento? Tu perfil, tus fotos y TODOS tus mensajes se borrarán.')) {
        salirDelEspacio(
          'voluntario',
          'Has salido del evento 👋',
          'Tu perfil, tus fotos y todos tus mensajes se han borrado por completo.'
        );
      }
    };
  }

  /* ───────────────────────────── Inicio ───────────────────────── */

  prepararPerfil();
  prepararChatUI();
  activarProteccion();

  // Si ya teníamos sesión en este evento, reconectamos sin pedir perfil
  if (sessionStorage.getItem(claveSesion)) conectar(null);
})();
