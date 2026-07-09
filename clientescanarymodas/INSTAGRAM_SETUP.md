# Publicar en Instagram desde la app (sin precio)

Esta guía te lleva de "no estoy seguro de qué tengo" a **poder pulsar un botón
"Publicar en IG" en el panel de administración** y que la foto aparezca en tu
Instagram con la **descripción del artículo pero sin el precio**.

El código ya está en el repo:

- **Backend:** `netlify/functions/instagram-publish.js` (llama a la API de Instagram).
- **Botón para el panel:** `netlify/functions/instagram-publish-boton.html.txt`
  (fragmento listo para pegar en `admin.html`).

Lo único que falta es lo que **solo puedes hacer tú**: preparar la cuenta y
conseguir 2 datos (un ID y un token) que se pegan en Netlify.

---

## Paso 0 · Comprueba qué tienes ya

1. **¿Tu Instagram es de tipo Empresa (Business)?**
   Instagram → Ajustes → Cuenta → *Cambiar a cuenta profesional* → **Empresa**.
   (Es gratis. Si ya te aparece "Herramientas de empresa", ya lo es.)
2. **¿Tienes una Página de Facebook?** La cuenta de Instagram Business debe estar
   vinculada a una **Página de Facebook** (no a un perfil personal).
   Se vincula desde la app de Instagram → Ajustes → *Cuentas vinculadas* → Facebook.
3. **¿Tienes cuenta en Meta for Developers?** Es la que usaremos para crear la app.

Si algo de esto te falta, hazlo primero. Todo es gratuito.

---

## Paso 1 · Crea la app en Meta

1. Entra en <https://developers.facebook.com/> con tu cuenta de Facebook.
2. **Mis apps → Crear app → tipo "Empresa"**.
3. En el panel de la app, añade el producto **Instagram Graph API**
   (o "Instagram" → *Instagram API con Facebook Login*).

## Paso 2 · Consigue el token y el ID de Instagram

La forma más rápida de obtener ambos datos es el **Graph API Explorer**:

1. Ve a <https://developers.facebook.com/tools/explorer/>.
2. Arriba a la derecha elige tu app.
3. En **Permisos**, añade: `instagram_basic`, `instagram_content_publish`,
   `pages_show_list`, `pages_read_engagement`, `business_management`.
4. Pulsa **Generar token de acceso** y acepta los permisos.
5. Con ese token, ejecuta estas consultas dentro del Explorer:
   - `me/accounts` → te da el **ID de tu Página de Facebook** (`page_id`).
   - `{page_id}?fields=instagram_business_account` → te da el
     **`instagram_business_account.id`** → **este es tu `IG_BUSINESS_ID`**.

> El token del Explorer es de corta duración (1-2 h). Para producción necesitas
> convertirlo en **token de larga duración (60 días)**. Sigue:
> <https://developers.facebook.com/docs/instagram-api/getting-started#long-lived-tokens>
> Resumen: intercambias el token corto por uno largo con una llamada a
> `oauth/access_token?grant_type=fb_exchange_token`. Este token largo es el
> que va en `IG_ACCESS_TOKEN`.

## Paso 3 · Revisión de la app (App Review)

Para publicar **en producción** (fuera de tus propias cuentas de prueba), Meta
exige que la app pase **App Review** aprobando el permiso
`instagram_content_publish`. Mientras estés como *desarrollador/administrador* de
la app, puedes publicar en **tu propia** cuenta de Instagram sin App Review, que
es justo tu caso. Solo necesitarás App Review si más adelante quieres publicar en
cuentas de terceros.

## Paso 4 · Pega los datos en Netlify

En Netlify → tu sitio → **Site settings → Environment variables**, crea:

| Variable | Valor |
|---|---|
| `IG_BUSINESS_ID` | El `instagram_business_account.id` del Paso 2 |
| `IG_ACCESS_TOKEN` | El token de **larga duración** del Paso 2 |
| `IG_HASHTAGS` | *(opcional)* hashtags fijos, p. ej. `#CanaryModas #modamayorista` |
| `INSTAGRAM_FN_SECRET` | *(opcional)* una contraseña inventada para proteger la función |

Vuelve a desplegar el sitio para que las variables tengan efecto.

## Paso 5 · Añade el botón al panel

Abre `admin.html` y pega el contenido de
`netlify/functions/instagram-publish-boton.html.txt`:

- El `<button>` va dentro de la ficha de cada publicación, rellenando
  `data-image-url` con la **URL pública de la foto** y `data-descripcion` con la
  descripción del artículo (sin precio).
- El `<script>` va una sola vez cerca del final del `<body>`.

Si activaste `INSTAGRAM_FN_SECRET`, pon el mismo valor en la constante
`IG_SECRET` del script.

---

## Cómo funciona por dentro

Al pulsar el botón, el panel llama a `/.netlify/functions/instagram-publish` con
la URL de la foto y la descripción. La función:

1. **Limpia cualquier precio** del texto (red de seguridad).
2. Crea el contenedor de media en Instagram con `image_url` + `caption`.
3. Publica el contenedor.
4. Devuelve el `id` del post publicado.

## Notas y límites

- **La foto debe estar en una URL pública** (http/https, JPEG/PNG). Las fotos del
  catálogo ya se sirven así; si alguna viniera directamente de Google Drive habría
  que exponerla en una URL pública primero.
- Instagram permite **~25 publicaciones cada 24 h** por cuenta vía API.
- El **token de larga duración caduca a los 60 días**: hay que renovarlo. Si
  quieres, más adelante puedo añadir una función *cron* que lo refresque solo.
- El pie de foto se limita a **2200 caracteres** (límite de Instagram).

## Renovación del token (recordatorio)

Cuando tengas el token en Netlify, apunta la fecha: caduca en **60 días**. Para
renovarlo, repite el intercambio del Paso 2 o pídeme que monte la renovación
automática.
