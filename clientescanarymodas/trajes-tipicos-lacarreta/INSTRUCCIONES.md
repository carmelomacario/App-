# Alta «PROGRAMACIONES › TÍPICO CANARIO» (proveedor La Carreta)

> Brief de traspaso para ejecutar en **Claude Code en el PC** (donde hay acceso a Drive
> y a Netlify). La extracción y el cálculo ya están hechos; aquí queda **aplicar 2 cambios
> de código + subir los datos + desplegar**.

## Objetivo
Crear el apartado **PROGRAMACIONES** y dentro la categoría **TÍPICO CANARIO**, con navegación
**por prenda** (Camisas · Chalecos · Pantalones y calzones · Complementos · Blusas · Faldas),
y cargar los **122 artículos** del catálogo *La Carreta – Colección Canarias 2027*.

Estructura (3 niveles de la app):
**PROGRAMACIONES** (sección 607) › **TÍPICO CANARIO** (categoría 820) › **prenda** (tipos 821–826)

## Reglas de negocio (ya aplicadas en los datos)
- **Precio de venta = coste × 1,5**, redondeado al **,95 más cercano**.
  (Ej.: 19,00 → 18,95 · 19,50 → 19,95 · 12,50 → 18,95.)
- **1 artículo por modelo**; cuando el precio cambia entre **niño y adulto**, se desdobla
  (`Infantil` / `Adulto`).
- **NOVEDADES → NO**. Estos artículos llevan `novedad: false` (el típico canario NO va a
  Novedades). ⚠️ Para futuras subidas de OTROS productos, sí van a Novedades (`novedad: true`).
  Al subir, asegúrate de que estos no entren en «Novedades de la semana» (mantén `creado`
  no reciente o usa la opción del importador que no los marque).
- **Fotos**: pendientes. Van con `fotos: []` (ver «Fotos» abajo).

## Datos ya generados
- `articulos_lacarreta.json` — los **122 artículos** en el esquema exacto de `catalogo.json`
  (`seccionId: 607`, `categoriaId: 820`, `tipoId: 821–826`). Listos para importar/fusionar.
- `generar-articulos.py` — script fuente (reajustar precios/colores/tallas y reejecutar:
  `python3 generar-articulos.py`).

---

## PASO 1 — Editar el CÓDIGO (2 ficheros)

### 1a) `netlify/functions/lib/jerarquia.js`
Añadir esta sección al array `JERARQUIA` (junto a las 60x, antes del `];` de cierre). Los
`id` (820 categoría, 821–826 tipos) **coinciden** con los de los artículos:

```js
  // PROGRAMACIONES — mercancía que se programa/encarga por temporada.
  // Primera categoría: TÍPICO CANARIO (proveedor La Carreta), navegable por prenda.
  { id: 607, nombre: "PROGRAMACIONES", icono: "🗓️", categorias: [
    { id: 820, nombre: "TÍPICO CANARIO", icono: "🌺", tipos: [
      { id: 821, nombre: "Camisas" },
      { id: 822, nombre: "Chalecos" },
      { id: 823, nombre: "Pantalones y calzones" },
      { id: 824, nombre: "Complementos" },
      { id: 825, nombre: "Blusas" },
      { id: 826, nombre: "Faldas" },
    ] },
  ] },
```

### 1b) `netlify/functions/catalogo.js`
Dentro de `VITRINA_HOME.destacadas`, añadir el tile para que los CLIENTES vean el apartado:

```js
    { id: "programaciones", nombre: "PROGRAMACIONES", icono: "🗓️", seccionId: 607 },
```

> Como el tile NO fija `fabricantes`/`categorias`/`soloRevisados`, la sección abre entera:
> el cliente entra en PROGRAMACIONES → TÍPICO CANARIO → elige prenda → ve los productos.

> `index.html` NO necesita cambios: al tener la sección categorías y tipos, la navegación
> por prenda funciona sola (3 niveles). Solo si prefieres los filtros como **barra lateral**
> en vez de tiles, añade `607` a la constante `SECCIONES_PLANAS` de `index.html`.

---

## PASO 2 — Subir los DATOS (los 122 artículos)

**Antes de nada, copia de seguridad** (patrón que ya usas):
- Duplica en Drive `CATALOGO B2B/catalogo.json` → `catalogo-antes-tipico-canario-AAAAMMDD.json`.

Luego, una de estas vías:
- **A) Importador del admin** (recomendado): despliega primero el Paso 1 para que `jerarquia.js`
  conozca la sección 607, y usa **Admin → Importar** con `articulos_lacarreta.json`.
- **B) Fusión directa**: añade los 122 objetos al array `articulos` del `catalogo.json` de Drive
  (sin `codigo` duplicados) y vuelve a subir el fichero. Ya traen sección/categoría/tipo resueltos.

Verificación: en admin deben salir 122 artículos en **PROGRAMACIONES › TÍPICO CANARIO**, con
precios acabados en ,95 y **sin** marca de novedad.

---

## PASO 3 — Desplegar

```powershell
# Vista previa (NO toca producción):
netlify deploy --dir . --functions netlify/functions --skip-functions-cache

# Producción (b2b.canarymodas.com):
netlify deploy --prod --dir . --functions netlify/functions --skip-functions-cache
```
Comprueba en la URL de preview: apartado PROGRAMACIONES → TÍPICO CANARIO → prendas → precios.
Solo entonces, `--prod`.

---

## Fotos (paso posterior)
Incrustadas en `LA CARRETA.pdf` (Drive, 27 MB):
1. `pdfimages -all "LA CARRETA.pdf" out/` (o `pdftoppm` por página).
2. Emparejar cada foto con su modelo (orden del PDF / la vista previa).
3. Subir a Drive `CATALOGO B2B/fotos/<CODIGO>/1.jpg…`, hacerlas **públicas** y poner
   `https://drive.google.com/thumbnail?id=<ID>&sz=w1000` en el array `fotos`. La función
   `uploadFoto` de `store.js` ya hace esto.

## Revisiones pendientes (ver vista previa)
- **Colores**: interpretados del PDF; repasar.
- **Blusa Tais / Delia**: bloque de precios ambiguo en el PDF (marcado).
- **¿Falta algo tras «Falda Cuadros»?**: revisar si el PDF traía más accesorios de mujer.

## Taxonomía de referencia
| Nivel | Nombre | id |
|---|---|---|
| Sección | PROGRAMACIONES | 607 |
| Categoría | TÍPICO CANARIO | 820 |
| Tipos (prenda) | Camisas / Chalecos / Pantalones y calzones / Complementos / Blusas / Faldas | 821 / 822 / 823 / 824 / 825 / 826 |

---

## EXTRA — Quitar la carátula de «Merchandising Mundial España»
En `netlify/functions/lib/jerarquia.js`, en la sección **id 604** (Merchandising / Merchan Mundial),
**elimina la propiedad `portada`** para que el mosaico no muestre esa imagen:

```js
// ANTES
{ id: 604, nombre: "Merchan Mundial", icono: "🇪🇸", portada: PORTADA("1DcbrNcDB5c993uasx2sUyKorTpWnE8zH"), categorias: [] },
// DESPUÉS
{ id: 604, nombre: "Merchan Mundial", icono: "🇪🇸", categorias: [] },
```
> Si en tu versión desplegada el nombre es «MERCHANDISING MUNDIAL ESPAÑA», es la misma sección 604:
> localízala por su `id: 604` y borra su `portada: PORTADA("…")`. Luego `netlify deploy --prod`.
