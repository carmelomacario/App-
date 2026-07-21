# Alta apartado «Trajes típicos y accesorios» (proveedor La Carreta)

> Brief de traspaso para ejecutar en **Claude Code en el PC** (donde hay acceso a Drive
> y a Netlify). Todo el trabajo de extracción y cálculo ya está hecho; aquí solo queda
> **aplicar 3 cambios de código + subir los datos + desplegar**.

## Objetivo
Crear en la web B2B un apartado nuevo **«Trajes típicos y accesorios»** con **filtros por
prenda** (Camisas · Chalecos · Pantalones y calzones · Complementos · Blusas · Faldas) y
cargar los **122 artículos** del catálogo *La Carreta – Colección Canarias 2027*.

## Reglas de negocio (ya aplicadas en los datos)
- **Precio de venta = coste × 1,5**, redondeado al **,95 más cercano**.
  (Ej.: 19,00 → 18,95 · 19,50 → 19,95 · 12,50 → 18,95.)
- **1 artículo por modelo**; cuando el precio cambia entre **niño y adulto**, se desdobla
  (`Infantil` / `Adulto`).
- **NOVEDADES**: todos los artículos llevan `novedad: true` y `creado` reciente, para que
  **siempre aparezcan en Novedades** (requisito del cliente: todo lo que se suba va a
  Novedades, sea nuevo o no).
- **Fotos**: pendientes. Los artículos van con `fotos: []`. Las imágenes están dentro del
  PDF `LA CARRETA.pdf` (Drive); se extraen y suben después (ver «Fotos» abajo).

## Datos ya generados
- `articulos_lacarreta.json` — los **122 artículos** en el esquema exacto de `catalogo.json`
  (`seccionId: 606`, `categoriaId: 810–815`). Listos para fusionar/importar.
- `generar-articulos.py` — script fuente que los genera (por si hay que reajustar precios,
  colores o tallas). Reejecutar: `python3 generar-articulos.py`.

---

## PASO 1 — Editar el CÓDIGO (3 ficheros)

### 1a) `netlify/functions/lib/jerarquia.js`
Añadir esta sección al array `JERARQUIA` (junto a las 60x, antes del `];` de cierre).
Los `id` de categoría (810–815) **coinciden** con los `categoriaId` de los artículos:

```js
  // Trajes típicos canarios (proveedor La Carreta). Sección PLANA: las categorías
  // actúan como FILTRO lateral por prenda (añadir 606 a SECCIONES_PLANAS en index.html).
  { id: 606, nombre: "Trajes típicos y accesorios", icono: "🌺", categorias: [
    { id: 810, nombre: "Camisas",               tipos: [] },
    { id: 811, nombre: "Chalecos",              tipos: [] },
    { id: 812, nombre: "Pantalones y calzones", tipos: [] },
    { id: 813, nombre: "Complementos",          tipos: [] },
    { id: 814, nombre: "Blusas",                tipos: [] },
    { id: 815, nombre: "Faldas",                tipos: [] },
  ] },
```

### 1b) `netlify/functions/catalogo.js`
Dentro de `VITRINA_HOME.destacadas`, añadir un tile para que los CLIENTES vean el apartado
(sin esto, la sección existe pero queda oculta al cliente). Ponerlo donde quieras que salga
en el home:

```js
    { id: "trajes-tipicos", nombre: "Trajes típicos y accesorios", icono: "🌺", seccionId: 606 },
```

> Nota: como el tile NO fija `fabricantes`, `categorias` ni `soloRevisados`, la sección abre
> entera y todos los artículos con `seccionId: 606` serán visibles al cliente.

### 1c) `index.html`
Buscar la constante `SECCIONES_PLANAS` (donde ya está la sección **602** de Ropa térmica) y
**añadir `606`**. Así las 6 categorías salen como **filtro lateral** sobre la rejilla de
producto (que es lo que se pidió), en vez de tiles de navegación.

---

## PASO 2 — Subir los DATOS (los 122 artículos)

**Antes de nada, copia de seguridad** del catálogo (patrón que ya usas):
- Duplica en Drive `CATALOGO B2B/catalogo.json` → `catalogo-antes-trajes-tipicos-AAAAMMDD.json`.

Luego, cualquiera de estas dos vías (elige la que encaje con tu flujo):

- **A) Importador del admin** (recomendado, es la vía prevista): despliega primero el código
  del Paso 1 para que `jerarquia.js` conozca la sección 606, y luego usa **Admin → Importar**
  para cargar `articulos_lacarreta.json`.
- **B) Fusión directa en `catalogo.json`**: añade los 122 objetos de `articulos_lacarreta.json`
  al array `articulos` del `catalogo.json` de Drive (evitando `codigo` duplicados) y vuelve a
  subir el fichero. Los artículos ya traen `seccionId/categoriaId` resueltos.

Verificación rápida tras subir: en el panel admin deben aparecer 122 artículos con sección
«Trajes típicos y accesorios» y precios acabados en ,95.

---

## PASO 3 — Desplegar

```powershell
# Vista previa (NO toca producción, te da una URL de prueba):
netlify deploy --dir . --functions netlify/functions --skip-functions-cache

# Si todo bien → PRODUCCIÓN (sube a b2b.canarymodas.com):
netlify deploy --prod --dir . --functions netlify/functions --skip-functions-cache
```
Abre la URL de preview, entra en el apartado «Trajes típicos y accesorios», comprueba los
filtros por prenda y los precios, y solo entonces lanza `--prod`.

---

## Fotos (paso posterior)
Las fotos están **incrustadas** en `LA CARRETA.pdf` (Drive, 27 MB). Para añadirlas:
1. Extraer las imágenes: `pdfimages -all "LA CARRETA.pdf" out/` (o `pdftoppm` por página).
2. Emparejar cada foto con su modelo (mismo orden que el PDF / la vista previa).
3. Subir a Drive en `CATALOGO B2B/fotos/<CODIGO>/1.jpg …`, hacerlas **públicas** y poner el
   enlace `https://drive.google.com/thumbnail?id=<ID>&sz=w1000` en el array `fotos` del
   artículo. (La función `uploadFoto` de `store.js` ya hace exactamente esto.)

## Revisiones pendientes (ver vista previa)
- **Colores**: interpretados del PDF; conviene repasarlos.
- **Blusa Tais / Delia**: bloque de precios ambiguo en el PDF (marcado con nota).
- **¿Falta algo tras «Falda Cuadros»?**: el PDF pudo cortarse en la lectura; revisar si hay
  más accesorios de mujer (pañuelos, mantillas…).

## Taxonomía de referencia
| Sección | id | Categorías (filtros) | ids |
|---|---|---|---|
| Trajes típicos y accesorios | 606 | Camisas, Chalecos, Pantalones y calzones, Complementos, Blusas, Faldas | 810–815 |
