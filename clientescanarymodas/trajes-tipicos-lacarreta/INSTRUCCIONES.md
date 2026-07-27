# Cargar TRADICIONAL CANARIO (La Carreta) en PROGRAMACIÓN — reutilizando lo existente

> Brief para ejecutar en **Claude Code en el PC** (acceso a Drive + Netlify).
> La jerarquía **ya existe** en tu código, así que el trabajo es mínimo:
> **1 cambio de código (hacer visible el tile) + subir los 122 artículos + desplegar.**

## Estructura (YA existe en `jerarquia.js`, NO se toca)
- Sección **PROGRAMACIÓN** → `id 606`
- Categoría **TRADICIONAL CANARIO** → `id 700`
- Tipos usados (prenda): Camisas `701` · Chalecos `702` · Pantalones `703` · Blusas `705` · Faldas `706` · Complementos `709`

## Datos ya generados (alineados a esos IDs)
- `articulos_lacarreta.json` — **122 artículos** con `seccionId:606`, `categoriaId:700`, `tipoId` correcto por prenda.
- `generar-articulos.py` — script fuente (reajustar y reejecutar: `python3 generar-articulos.py`).

## Reglas de negocio (ya aplicadas)
- **PVP = coste × 1,5**, redondeado al **,95** más cercano.
- **1 artículo por modelo**; se desdobla en `Infantil` / `Adulto` cuando cambia el precio.
- **NOVEDADES → NO** (`novedad: false`). El resto de subidas futuras sí (esto es la excepción).
- **Fotos**: pendientes (`fotos: []`). Ver «Fotos» abajo.
- **Nota de mapeo**: mi grupo *Pantalones y calzones* va al tipo existente **Pantalones (703)**;
  todos los complementos (fajines, polainas, cachorro, sombrero) van a **Complementos (709)**.
  Si quieres afinar (p. ej. sombreros → tipo `Sombreros 704`), se cambia en el editor o en el JSON.

---

## PASO 1 — Hacer VISIBLE el tile (único cambio de código)
El tile «PROGRAMACIÓN» sale ahora como **«Próximamente»**, así que sus productos no se ven al cliente.
En `netlify/functions/catalogo.js`, dentro de `VITRINA_HOME`:

1. **Quítalo de `proximas`**: si aparece `proximas: [ …, 606 ]`, borra el `606`.
2. **Asegúrate de que está en `destacadas`** (si no estaba ya) con un tile como:
```js
    { id: "programacion", nombre: "PROGRAMACIÓN", icono: "👘", seccionId: 606 },
```
> Al no fijar `fabricantes`/`categorias`/`soloRevisados`, la sección abre entera: el cliente entra
> en PROGRAMACIÓN → TRADICIONAL CANARIO → elige prenda → ve los productos.
> (Si me pasas el bloque `VITRINA_HOME` de `catalogo.js`, te doy las líneas exactas a cambiar.)

`jerarquia.js` **NO se toca** (la sección, la categoría y los tipos ya existen).

---

## PASO 2 — Subir los 122 artículos
**Copia de seguridad primero**: duplica en Drive `CATALOGO B2B/catalogo.json` →
`catalogo-antes-tradicional-canario-AAAAMMDD.json`.

Luego, una vía:
- **A) Importador del admin** (recomendado): **Admin → Importar** con `articulos_lacarreta.json`.
  Como la jerarquía ya existe, `resolverJerarquia` los coloca solos en 606/700/tipo.
- **B) Fusión directa** en `catalogo.json` de Drive: añade los 122 objetos al array `articulos`
  (sin `codigo` duplicados) y sube el fichero.

Verificación: 122 artículos en **PROGRAMACIÓN › TRADICIONAL CANARIO**, precios en ,95, sin novedad.

---

## PASO 3 — Desplegar
```powershell
# Preview (no toca producción):
netlify deploy --dir . --functions netlify/functions --skip-functions-cache
# Producción (b2b.canarymodas.com):
netlify deploy --prod --dir . --functions netlify/functions --skip-functions-cache
```
Comprueba en la preview: PROGRAMACIÓN → TRADICIONAL CANARIO → prendas → precios. Luego `--prod`.

> Si subes los datos por el **Importador del admin**, el catálogo se actualiza en vivo (Drive) sin
> deploy. El **deploy solo hace falta para el cambio de código del Paso 1** (mostrar el tile).

---

## Fotos (paso posterior)
Incrustadas en `LA CARRETA.pdf` (Drive, 27 MB):
1. `pdfimages -all "LA CARRETA.pdf" out/` (o `pdftoppm` por página).
2. Emparejar cada foto con su modelo (orden del PDF / la vista previa).
3. Subir a `CATALOGO B2B/fotos/<CODIGO>/1.jpg…`, hacerlas **públicas**, y poner
   `https://drive.google.com/thumbnail?id=<ID>&sz=w1000` en el array `fotos`.

## Revisiones pendientes (ver herramienta de revisión)
- **Colores** interpretados del PDF · **Blusa Tais/Delia** (precio dudoso) · ¿algo tras «Falda Cuadros»?

---

## EXTRA — Eliminar el tile «Merchandising Mundial España» del home
Quitar el tile por completo (no solo la carátula). En `catalogo.js`, dentro de `VITRINA_HOME`:
1. **Borra la entrada de `destacadas`** cuyo `seccionId: 604` (el tile «MERCHAN MUNDIAL» /
   «MERCHANDISING MUNDIAL ESPAÑA»).
2. Si el `604` aparece en `proximas`, **quítalo también**.
3. (Opcional) En `jerarquia.js`, a la sección `id 604`, añádele `ocultarHome: true` para que
   tampoco aparezca en el home del admin/comercial.

Luego entra en el mismo `netlify deploy --prod`.
