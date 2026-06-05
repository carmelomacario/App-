# App- · Canary Modas B2B

Repositorio de trabajo para los proyectos de **Canary Modas** rescatados desde Google Drive.

> Estado: **rescate en curso**. Este repo se está poblando con el código que tenías
> en Drive. Abajo tienes el inventario completo y cómo terminar de subir lo que falta.

---

## 📦 Proyectos / carpetas

En Drive hay **3 aplicaciones** (PWA desplegadas en Netlify) + **1 carpeta de datos**:

### 1. `clientescanarymodas/`  ← app principal (la más completa)
PWA B2B (catálogo + pedidos para clientes y comerciales). Backend en Netlify Functions.

```
clientescanarymodas/
├── package.json            ✅ rescatado   (canary-modas-b2b v1.21.32, dep: pdfkit)
├── netlify.toml            ✅ rescatado
├── manifest.webmanifest    ✅ rescatado
├── icon.svg                ✅ rescatado
├── .gitignore              ✅ rescatado
├── .netlifyignore          ✅ rescatado
├── sw.js                   ⬆️ pendiente subir   (Service Worker, 4,5 KB)
├── index.html              ⬆️ pendiente subir   (240 KB)
├── admin.html              ⬆️ pendiente subir   (165 KB)
├── almacen.html            ⬆️ pendiente subir   (59 KB)
├── logo-canary.png         ⬆️ pendiente subir
├── portada-*.png           ⬆️ pendiente subir   (preventa, licencias, novedades-semana)
└── netlify/functions/      ⬆️ pendiente subir   (backend)
    ├── auth.js  admin.js  catalogo.js  clientes.js  pedidos.js
    ├── tracking.js  preview-pedido.js
    ├── registro-accesos-cron.js   (cron 12:00 y 20:00 UTC)
    ├── analisis-accesos-cron.js   (cron 21:00 UTC, auto-bloqueo accesos)
    └── lib/   (15 módulos: drive.js, session.js, email*.js, pdf-*.js,
                jerarquia.js, store.js, pantone.js, accesos.js, eventos.js,
                proveedores.js, respond.js, …)
```

### 2. `appcanarymodas/`  ← app (panel interno / ventas-facturas)
```
appcanarymodas/
├── index.html              ⬆️ pendiente subir   (893 KB ⚠️ grande)
├── package.json  netlify.toml  sw.js  icon.svg  manifest.webmanifest
└── netlify/functions/      separados.js  articulos.js  facturas.js
                            clientes.js  envios.js  ventas.js  + lib/
```

### 3. `pedidosnuevo/`  ← app (pedidos)
```
pedidosnuevo/
├── index.html              ⬆️ pendiente subir   (515 KB ⚠️ grande)
├── package.json  netlify.toml  sw.js  icon.svg  manifest.webmanifest
└── netlify/functions/      pedidos.js (85 KB)  clientes.js  + lib/
```

### 4. `catalogo-b2b/`  ← DATOS (los consumen las apps)
```
catalogo-b2b/
├── catalogo.json           ⬆️ pendiente subir   (2,5 MB ⚠️)
├── clientes.json           ⬆️ pendiente subir   (1,5 MB ⚠️)
├── catalogo-papelera.json  comerciales.json  pedidos.json
├── accesos.json  eventos.json
├── GESTION_ACCESO_CLIENTES.xlsx
└── fotos/  portadas/  articulos/   (imágenes)
```

---

## ⬆️ Cómo terminar de subir lo que falta (sin usar git)

Los archivos grandes (los `index.html`, los JSON de datos y las imágenes) y el código
backend conviene subirlos por la **web de GitHub**, que es lo más fiable y no requiere
conocimientos de git:

1. En **Google Drive**, entra en la carpeta del proyecto (p. ej. `clientescanarymodas`),
   haz clic derecho → **Descargar**. Drive te la baja como un **ZIP** al PC.
2. **Descomprime** el ZIP en tu PC.
3. Ve a **https://github.com/carmelomacario/App-** → botón **`Add file`** → **`Upload files`**.
4. **Arrastra** los archivos/carpetas descomprimidos a la página (mantén la estructura:
   sube `index.html`, `sw.js`, la carpeta `netlify/`, etc. dentro de su carpeta de proyecto).
5. Abajo, en *Commit changes*, pulsa **`Commit changes`**.

> ⚠️ **No subas** las carpetas `node_modules/` ni `.netlify/` (son regenerables y muy pesadas).
> Para reinstalar dependencias basta con `npm install` gracias a `package.json`.

Repite para `appcanarymodas`, `pedidosnuevo` y la carpeta de datos.

---

## 🛠️ Stack
- **Frontend:** HTML/JS de un solo archivo (PWA con Service Worker).
- **Backend:** Netlify Functions (Node ≥20, ESM). PDFs con `pdfkit`.
- **Datos:** JSON en Google Drive, accedidos vía función `drive.js`.
- **Deploy:** Netlify (`netlify.toml`).
