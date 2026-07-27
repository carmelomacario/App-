# Organizar Drive: una sola carpeta con todo lo de la web (sin romper nada)

Objetivo: tener en Drive **una carpeta única y ordenada** con todo lo necesario para la web.
Pero OJO: la app **lee datos en vivo** desde una carpeta fija de Drive, así que hay cosas que
**NO se pueden mover** sin romper la tienda. Aquí está el mapa.

## Estructura propuesta
```
📁 CANARY MODAS B2B            ← carpeta raíz única
├── 📁 1-APP (código)          ← el proyecto que se despliega a Netlify
│   ├── index.html · admin.html · almacen.html · sw.js
│   ├── manifest.webmanifest · icon.svg · netlify.toml · package.json
│   ├── deploy-staging.ps1
│   └── 📁 netlify/functions/  (auth.js, catalogo.js, clientes.js, pedidos.js… + 📁 lib/)
│
├── 📁 2-DATOS  ⚠️ NO MOVER    ← lo que la app lee EN VIVO (CATALOGO_B2B_FOLDER_ID)
│   ├── catalogo.json · clientes.json · pedidos.json · comerciales.json
│   ├── accesos.json · eventos.json · llegadas.json
│   ├── 📁 fotos/   (fotos de artículos, servidas públicas)
│   └── 📁 portadas/
│
├── 📁 3-PROVEEDORES           ← catálogos PDF de proveedores (La Carreta, etc.)
│
├── 📁 4-BACKUPS               ← copias catalogo-antes-*.json
│
└── 📁 5-ENTREGABLES-CLAUDE    ← lo que hemos desarrollado (esta carpeta del repo)
    ├── articulos_lacarreta.json · generar-articulos.py
    ├── INSTRUCCIONES.md · README.md
    └── 📁 herramientas/  (vista-previa · revisión · editor)
```

## 🚦 Reglas para no romper la web
- **`2-DATOS` es sagrada:** esa carpeta es la que hoy lee la app (variable `CATALOGO_B2B_FOLDER_ID`
  en Netlify). Si la mueves/renombras, **actualiza esa variable de entorno en Netlify** al nuevo
  ID de carpeta; si no, la tienda deja de cargar catálogo, clientes y pedidos. Lo más seguro:
  **dejar `2-DATOS` donde está** y solo ordenar el resto a su alrededor.
- **El código (`1-APP`) sí se puede reubicar**: no afecta a la web hasta que hagas `netlify deploy`
  desde esa carpeta. Manten dentro la estructura `netlify/functions/lib/…`.
- **Fotos públicas:** si mueves `fotos/`, sus enlaces `drive.google.com/thumbnail?id=…` siguen
  funcionando (el ID no cambia al mover), pero el backend las busca por carpeta: mejor no moverla.

## Cómo hacerlo (opciones)
- **A) En tu PC (recomendado):** organiza la carpeta del proyecto (código) en tu disco y usa Drive
  para escritorio, o sube la estructura `1-APP` ordenada. El deploy sale de ahí.
- **B) En Drive a mano:** crea `CANARY MODAS B2B` y arrastra dentro las carpetas, **dejando `2-DATOS`
  en su sitio actual** (o moviéndola y actualizando `CATALOGO_B2B_FOLDER_ID`).
- **C) Que lo haga yo:** necesito que el acceso a Drive deje de pedir aprobación. Entonces puedo
  **crear la carpeta y copiar** dentro los entregables y los PDFs (lo que es seguro copiar), sin
  tocar `2-DATOS`.
```
```
