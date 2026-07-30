# ATMO 💬 · Vivir el momento

App **ATMO** (carpeta técnica `qrchat/`): chat **efímero** por código QR para discotecas, fiestas, congresos y eventos.
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
4. Dentro tienen (no hay canal general: ATMO es descubrir y hablar en privado):
   - 🕺 **Gente**: perfiles de los asistentes, con ficha estilo WhatsApp
     (la foto — o el emoji — en grande)
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

## Guardar contactos 🤝 (función Premium)

Lo único que puede sobrevivir al borrado del evento, y **solo con
consentimiento mutuo**:

- En el perfil de una persona: «🤝 Guardar contacto ✦». La otra persona recibe
  la solicitud y decide. Si ambos aceptan (o se lo piden mutuamente), el
  contacto (alias + nombre + evento donde se conocieron) se guarda en las dos
  cuentas.
- Requiere que **ambos tengan cuenta ATMO** (⭐) — es el gancho natural hacia
  la suscripción Premium del plan (9,99 €/mes); hoy es gratis como las cuentas.
- Los contactos se ven en «Mi perfil → 🤝 Mis contactos» dentro del evento y
  desde la pantalla de entrada de cualquier evento; nombre y foto se resuelven
  en vivo desde la cuenta del contacto.
- Un rechazo no se notifica al solicitante, y el bloqueo hace que las
  solicitudes se pierdan en silencio.

## Panel del local 📊 (analítica B2B)

Cada evento incluye un **panel privado para el organizador** (enlace con clave
propia al crear el evento, ruta `/panel/CODIGO?clave=…`):

- **Aforo en vivo**, pico de aforo, entradas y salidas totales.
- **Proporción chicos/chicas** y personas en cola de espera.
- **Estancia media** por persona (minutos).
- **Actividad**: mensajes del general, privados (solo recuento, jamás
  contenido), fotos compartidas y 🤝 contactos guardados.
- **Gráfica del aforo a lo largo de la noche** (total, chicos, chicas) con
  muestras cada 5 min (`QRCHAT_MUESTRA_MS` para ajustar).
- Los datos son agregados y anónimos, y se borran con el evento.

## Protección anticapturas 🔒

Una aplicación web **no puede impedir** una captura de pantalla: eso lo
controla el sistema operativo del móvil (y ni siquiera una app nativa evita
que alguien fotografíe la pantalla con otro teléfono). La defensa eficaz es
la **disuasión con trazabilidad**, el mismo enfoque de las apps de banca:

- **Marca de agua personal**: todas las conversaciones y fotos llevan
  superpuestos, en diagonal y semitransparentes, el nombre, el ID y el evento
  de **quien está mirando**. Cualquier captura difundida delata a su autor.
  La marca se actualiza si el usuario cambia su nombre.
- **Difuminado en segundo plano**: al cambiar de app o de pestaña el chat se
  emborrona, así las miniaturas del selector de apps no muestran contenido.
- **Sin guardado fácil de imágenes**: bloqueados la pulsación larga
  («guardar imagen» de iOS/Android), el arrastre de fotos, el menú contextual
  y la selección de texto en los mensajes.
- **Aviso disuasorio** antes de entrar: «cualquier captura es rastreable
  hasta su autor».

## Borrado total al abandonar el espacio 🧹

El chat solo existe mientras estás en el sitio. En cuanto alguien **abandona el
espacio del evento**, se elimina TODO lo suyo — perfil, foto, sus mensajes del
canal general y sus conversaciones privadas (también del móvil de la otra
persona) — tanto en el servidor como en las pantallas del resto de asistentes:

| Forma de abandonar | Qué pasa |
|---|---|
| **Salir del recinto** (evento geovallado) | La app vigila la posición; tras ~45 s fuera del radio, purga inmediata |
| **Salir voluntariamente** (botón 👤 → salir) | Purga inmediata |
| **Cerrar la app / quedarse sin conexión** | Purga tras el margen de ausencia del evento (15 min por defecto, configurable 1–60 al crearlo) |
| **Retirar el permiso de ubicación** (evento geovallado) | Purga inmediata |
| **Fin del evento** | Se borra el evento completo |

El **geovallado** es opcional: al crear el evento, el organizador marca
«Limitar el chat al espacio físico», y el centro del espacio es su posición en
ese momento, con un radio configurable de 30–1000 m (por defecto 100 m). Con
geovallado activo, los asistentes deben conceder permiso de ubicación para
entrar. Se aplica un margen según la precisión del GPS (hasta 100 m) para no
expulsar a nadie por mala señal dentro del local.

La gracia y el barrido se pueden ajustar con variables de entorno:
`QRCHAT_GRACIA_MS` (por defecto 900000 = 15 min) y `QRCHAT_SWEEP_MS` (30000).
El móvil bloqueado o un rato en otra app NO expulsan a nadie mientras vuelva
dentro del margen; al volver a la app, la reconexión es inmediata y, si aun
así caducó la sesión, el formulario de entrada aparece relleno con el último
perfil usado en ese móvil para volver con un toque.

## Supervivencia a reinicios 🔁

Un reinicio del servidor (redespliegue, caída, «sueño» del hosting) ya no mata
la fiesta: el estado de los eventos se guarda en disco cada ~45 s
(`QRCHAT_SNAPSHOT_MS`) y al apagarse ordenadamente (SIGTERM), y se restaura al
arrancar. La gente reconecta con su mismo perfil y el historial de texto; las
fotos de los mensajes no se conservan entre reinicios (se marcan como «foto no
disponible») para mantener la instantánea ligera. Al expirar el evento, la
copia en disco se borra también.

> Nota Render free: su disco es efímero y NO sobrevive a redespliegues ni al
> «sueño»; la instantánea protege sobre todo en VPS/Docker o en Render con
> disco persistente (plan de pago, montar `data/`). En el plan gratuito, la
> defensa contra el sueño es el ping de UptimeRobot a `/salud` cada 5 min.

## Ejecutar en local

```bash
cd qrchat
npm install
npm start
# → http://localhost:3000
```

Para probar con dos personas: abre una ventana normal y otra de incógnito
(los perfiles se guardan por pestaña en `sessionStorage`).

## Desplegar 🚀

> ⚠️ **¿Por qué no en Netlify?** QRChat necesita un **servidor permanente con
> WebSockets** (chat en tiempo real, gente conectada a la vez, colas, purgas).
> Netlify solo ejecuta funciones sueltas que se encienden y apagan por
> petición: ahí esta app no puede funcionar. Las alternativas de abajo son
> igual de sencillas y también tienen plan gratuito.

### Opción A — Render.com (recomendada, 1 clic) 🟢

El repo ya incluye `render.yaml` en la raíz con todo configurado:

1. Crea cuenta en [render.com](https://render.com) (puedes entrar con GitHub).
2. **New → Blueprint** → conecta este repositorio (`carmelomacario/App-`).
3. Render lee `render.yaml`, crea el servicio `qrchat` y lo despliega.
4. Te da una URL tipo `https://qrchat.onrender.com` → esa es la app.
   Entra, crea un evento y proyecta el QR. ✅

Notas del plan gratuito de Render:
- La app **se duerme tras ~15 min sin visitas** y tarda ~30 s en despertar.
  Como todo vive en memoria, si se duerme a mitad de un evento, el evento se
  pierde. Para una noche real: entra a la web 5 minutos antes de abrir, o
  paga el plan Starter (~7 $/mes) que no duerme.
- El disco es efímero: las **cuentas** (`data/cuentas.json`) se pierden al
  redesplegar. Con el plan de pago puedes añadir un disco persistente.

### Opción B — Railway.app / Fly.io / Koyeb (con Docker) 🐳

El directorio `qrchat/` incluye un `Dockerfile` listo:

- **Railway**: New Project → Deploy from GitHub repo → Root Directory `qrchat`.
  Detecta el Dockerfile y lo despliega solo.
- Cualquier VPS con Docker:
  `docker build -t qrchat qrchat/ && docker run -d -p 80:3000 qrchat`

### Opción C — Un ordenador del propio local 💻

Para una discoteca con conexión estable, el servidor puede correr en un PC
del local (Node 18+): `cd qrchat && npm install && npm start`. Con un túnel
tipo Cloudflare Tunnel (gratis) obtienes la URL pública para el QR.

En todos los casos el servidor detecta su URL pública automáticamente
(cabeceras `x-forwarded-proto`/`x-forwarded-host`), así que los QR generados
apuntan siempre al dominio correcto. Hay un health check en `/salud`.

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
