# QRChat 💬✨

Chat **efímero** por código QR para discotecas, fiestas, congresos y eventos.
Pensado para facilitar que la gente se conozca sin la presión de dar el primer
paso en persona.

## ¿Cómo funciona?

1. El organizador entra en la web y **crea un evento** (nombre + duración).
2. La app genera un **código QR** que se puede proyectar en pantalla o imprimir
   (hay una vista `pantalla` a pantalla completa con contador de gente en vivo).
3. Los asistentes **escanean el QR** con el móvil y crean un **perfil temporal**:
   apodo, sexo (🕺 chico / 💃 chica / ✨ otro), avatar emoji o foto, y una
   pequeña bio. El sexo se muestra en los perfiles y hay contadores de
   chicos/chicas en la lista de gente y en la pantalla de proyección.
4. Dentro tienen:
   - 💬 **Canal general** del evento (texto y fotos)
   - 🕺 **Gente**: lista de perfiles de los asistentes
   - 💌 **Privados**: conversaciones 1 a 1 (texto y fotos)
   - 🚫 **Bloqueo**: cualquier persona puede bloquear a otra y dejar de recibir
     sus mensajes (sin que la otra persona lo sepa)
5. Cuando el evento expira (1–48 h), **todo se borra automáticamente**: perfiles,
   fotos y mensajes. No hay base de datos: todo vive solo en memoria.

## Equilibrio chicos/chicas ⚖️

Opcional al crear el evento (activado por defecto). Evita que el chat se llene
solo de chicos:

- Los chicos **nunca pueden superar a las chicas en más del margen** elegido
  (1–20, por defecto 5). El margen inicial permite que el evento arranque
  aunque todavía no haya chicas.
- Cada chica que entra **abre hueco a un chico más**, así que a medida que se
  llena el evento la proporción tiende al 1-1.
- El chico que no cabe **no es rechazado**: pasa a una **cola de espera** con
  su posición visible y **entra automáticamente** en cuanto entra una chica o
  alguien deja el evento.
- Quien elige «✨ Otro» entra siempre libremente y no cuenta en la proporción.
- Es un chat anónimo sin verificación, así que el sexo es declarativo: el
  equilibrio ordena el ambiente, pero no puede impedir que alguien mienta.

## Cuentas guardadas ⭐ (gratis ahora, de pago en el futuro)

Opción para quien va a muchos eventos: **crear una cuenta** con alias + PIN que
guarda el perfil (nombre, sexo, avatar/foto y bio) y lo reutiliza en cualquier
evento con un solo toque («⭐ Entrar como…»). Los usuarios con cuenta lucen
una ⭐ junto a su nombre.

- Es la **única persistencia real** de la app: se guarda en `data/cuentas.json`
  (fuera de git) con el PIN cifrado (scrypt + sal). Los chats siguen siendo
  100 % efímeros: la cuenta solo guarda el perfil, jamás mensajes.
- Los cambios de perfil hechos dentro de un evento se guardan automáticamente
  en la cuenta.
- **Monetización preparada**: con la variable de entorno
  `QRCHAT_CUENTAS_DE_PAGO=1` la creación de cuentas nuevas queda bloqueada con
  el mensaje «es una opción de pago» (HTTP 402) — ahí es donde se integrará la
  pasarela de pago (p. ej. Stripe). Las cuentas ya creadas siguen funcionando.
- La interfaz ya avisa: «Gratis por ahora · más adelante será de pago».
- Nota de despliegue: en hostings con disco efímero (Render free) el fichero
  de cuentas se pierde al redesplegar; para producción usa un disco persistente
  o una base de datos.

## Borrado total al abandonar el espacio 🧹

El chat solo existe mientras estás en el sitio. En cuanto alguien **abandona el
espacio del evento**, se elimina TODO lo suyo — perfil, foto, sus mensajes del
canal general y sus conversaciones privadas (también del móvil de la otra
persona) — tanto en el servidor como en las pantallas del resto de asistentes:

| Forma de abandonar | Qué pasa |
|---|---|
| **Salir del recinto** (evento geovallado) | La app vigila la posición; tras ~45 s fuera del radio, purga inmediata |
| **Salir voluntariamente** (botón 👤 → salir) | Purga inmediata |
| **Cerrar la app / quedarse sin conexión** | Purga tras 5 min de gracia (cubre cortes breves de cobertura) |
| **Retirar el permiso de ubicación** (evento geovallado) | Purga inmediata |
| **Fin del evento** | Se borra el evento completo |

El **geovallado** es opcional: al crear el evento, el organizador marca
«Limitar el chat al espacio físico», y el centro del espacio es su posición en
ese momento, con un radio configurable de 30–1000 m (por defecto 100 m). Con
geovallado activo, los asistentes deben conceder permiso de ubicación para
entrar. Se aplica un margen según la precisión del GPS (hasta 100 m) para no
expulsar a nadie por mala señal dentro del local.

La gracia y el barrido se pueden ajustar con variables de entorno:
`QRCHAT_GRACIA_MS` (por defecto 300000) y `QRCHAT_SWEEP_MS` (30000).

## Ejecutar en local

```bash
cd qrchat
npm install
npm start
# → http://localhost:3000
```

Para probar con dos personas: abre una ventana normal y otra de incógnito
(los perfiles se guardan por pestaña en `sessionStorage`).

## Desplegar

⚠️ Esta app usa **WebSockets** (Socket.IO), así que **no puede desplegarse en
Netlify Functions** como las otras apps del repo. Opciones gratuitas o baratas
que funcionan directamente:

- **Render.com** → New Web Service → conectar el repo, *Root Directory* `qrchat`,
  *Build* `npm install`, *Start* `npm start`.
- **Railway.app** / **Fly.io** → igual de sencillo, detectan Node automáticamente.
- Cualquier VPS con Node 18+: `npm install && npm start` (variable `PORT` opcional).

El servidor detecta su URL pública automáticamente (cabeceras
`x-forwarded-proto`/`x-forwarded-host`), así que los QR generados apuntan
siempre al dominio correcto.

> Nota: al ser todo en memoria, si el servidor se reinicia se pierden los
> eventos activos. Para este caso de uso (chats de una noche) es lo deseado,
> pero tenlo en cuenta si el hosting "duerme" la app por inactividad
> (en Render free tier, por ejemplo).

## Estructura

```
qrchat/
├── server.js              Servidor Express + Socket.IO + generación de QR
├── package.json
└── public/
    ├── index.html         Crear evento (organizador)
    ├── pantalla.html      Pantalla de proyección: QR gigante + contador
    ├── app.html           La app de chat (perfil → general/gente/privados)
    ├── app.js             Lógica del cliente
    ├── estilo.css         Estilo compartido (ambiente nocturno/neón)
    ├── manifest.webmanifest
    └── icon.svg
```

## Límites y decisiones

- Fotos: se comprimen en el cliente (máx. 1280 px, JPEG) y el servidor rechaza
  cualquier imagen de más de ~2,5 MB.
- Historial: se conservan los últimos 300 mensajes del general y 200 por privado.
- Privacidad: no se pide email ni teléfono; el perfil vive solo durante el evento.
- El bloqueo corta los privados en el servidor y oculta los mensajes del general
  en el cliente.
