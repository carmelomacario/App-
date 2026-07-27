# TRADICIONAL CANARIO (La Carreta) — todo en un sitio

Carpeta única con **todo lo desarrollado** para dar de alta la colección *La Carreta 2027*
en tu web B2B, dentro de **PROGRAMACIÓN › TRADICIONAL CANARIO**. Así no lo tienes disperso.

## 📁 Qué hay aquí
| Fichero | Qué es |
|---|---|
| `INSTRUCCIONES.md` | **Guía paso a paso**: cambios de código + subir datos + `netlify deploy`. Empieza por aquí. |
| `articulos_lacarreta.json` | Los **122 artículos** listos para el **Importar** del admin (o fusionar en `catalogo.json`). |
| `generar-articulos.py` | Script que genera el JSON (para reajustar precios/colores/tallas: `python3 generar-articulos.py`). |
| `herramientas/vista-previa.html` | Tabla visual de los 122 artículos con precios. |
| `herramientas/revision.html` | Herramienta para **revisar/corregir** (editar colores, precios, marcar OK) y **descargar** cambios. |
| `herramientas/editor.html` | **Editor fácil** para crear/editar artículos (precio automático) y exportar el JSON de Importar. |

> Las herramientas HTML se abren con doble clic en el navegador. También están publicadas como
> enlaces (artifacts) en claude.ai/code/artifacts.

## ✅ Qué está hecho
- 122 artículos con **PVP = coste × 1,5 → ,95**, tallas y colores.
- Alineados a tu estructura real: **PROGRAMACIÓN (606) › TRADICIONAL CANARIO (700) › prenda**
  (tipos 701/702/703/705/706/709). `novedad: false`.

## 🔜 Qué falta (se hace en tu PC)
1. **Subir los 122 artículos** → Admin → *Importar* con `articulos_lacarreta.json`
   (la sección/categoría/tipos ya existen en tu `jerarquia.js`, se colocan solos).
2. **Eliminar el tile «Merchandising Mundial»** → en tu `catalogo.js` del PC, en `VITRINA_HOME.destacadas`,
   borra la entrada con `seccionId: 604`.
3. **Desplegar** → `deploy-staging.ps1` (preview) y luego `netlify deploy --prod`.
   - *PROGRAMACIÓN ya es `destacada`; sale como “Próximamente” solo porque está vacía: se llena al subir los artículos.*

## ⚠️ Importante (no romper el home)
- **NO despliegues el `catalogo.js`/`jerarquia.js` que hay en Drive**: están **desactualizados**
  respecto a lo que tienes en vivo (a tu home le faltarían tiles como *Gaming*, *Merchandising*, y
  cambiarían nombres). Trabaja siempre sobre el **código real de tu PC** (lo último que desplegaste).
- El `deploy` solo se puede lanzar **desde tu PC** (Netlify CLI + tu sesión).

## 🗂️ Referencia de taxonomía
| Nivel | Nombre | id |
|---|---|---|
| Sección | PROGRAMACIÓN | 606 |
| Categoría | TRADICIONAL CANARIO | 700 |
| Tipos (prenda) | Camisas · Chalecos · Pantalones · Blusas · Faldas · Complementos | 701 · 702 · 703 · 705 · 706 · 709 |

## 📷 Pendiente: fotos
Están dentro de `LA CARRETA.pdf` (Drive). Ver sección «Fotos» en `INSTRUCCIONES.md`
(`pdfimages` → subir a `fotos/<CODIGO>/` → enlazar en el campo `fotos`).
