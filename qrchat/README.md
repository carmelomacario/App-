# QRChat 💬✨

Chat **efímero** por código QR para discotecas, fiestas, congresos y eventos.
Pensado para facilitar que la gente se conozca sin la presión de dar el primer
paso en persona.

## ¿Cómo funciona?

1. El organizador entra en la web y **crea un evento** (nombre + duración).
2. La app genera un **código QR** que se puede proyectar en pantalla o imprimir
   (hay una vista `pantalla` a pantalla completa con contador de gente en vivo).
3. Los asistentes **escanean el QR** con el móvil y crean un **perfil temporal**:
   apodo, avatar emoji o foto, y una pequeña bio.
4. Dentro tienen:
   - 💬 **Canal general** del evento (texto y fotos)
   - 🕺 **Gente**: lista de perfiles de los asistentes
   - 💌 **Privados**: conversaciones 1 a 1 (texto y fotos)
   - 🚫 **Bloqueo**: cualquier persona puede bloquear a otra y dejar de recibir
     sus mensajes (sin que la otra persona lo sepa)
5. Cuando el evento expira (1–48 h), **todo se borra automáticamente**: perfiles,
   fotos y mensajes. No hay base de datos: todo vive solo en memoria.

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
