# ATMO · Landing de pre-lanzamiento

Web estática del plan de marketing (fase PRE-LANZAMIENTO): posicionamiento,
cuenta atrás, propuesta de valor para usuarios y empresas con precios, y
**lista de espera**.

**Esta sí va en Netlify** (la app de chat, en cambio, necesita un servidor
permanente → ver `qrchat/README.md`).

## Subirla a Netlify (2 minutos)

1. En [app.netlify.com](https://app.netlify.com): **Add new site → Import an
   existing project** → conecta el repo `carmelomacario/App-`.
2. En **Base directory** pon `atmo-landing` (build command vacío,
   publish directory `atmo-landing`).
3. Deploy. Netlify te da una URL tipo `atmo.netlify.app`; luego puedes
   conectar el dominio `atmo.app`.

## Lista de espera (Netlify Forms)

El formulario usa **Netlify Forms**: los apuntados aparecen en el panel de
Netlify → *Forms → lista-espera* (nombre, email y si es usuario, local o
inversor). Gratis hasta 100 envíos/mes. Puedes activar notificación por email
en *Forms → Settings → Form notifications*.

## Cuenta atrás

La fecha de lanzamiento se cambia en una sola línea de `index.html`:
`const LANZAMIENTO = new Date('2026-10-01T22:00:00');`
