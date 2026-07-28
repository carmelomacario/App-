# Instalar la función «Secciones y categorías» (para quien lleve la parte técnica)

> ⚠️ Es un **borrador funcional**. **Pruébalo en la URL de preview** de Netlify antes de
> publicar en producción. No subas a `--prod` sin verificar que la tienda carga bien.

## Ficheros de esta carpeta y dónde van
| Aquí | Copiar a (en tu proyecto) |
|---|---|
| `netlify-functions/lib/jerarquia.js` | `netlify/functions/lib/jerarquia.js` (**reemplaza** el actual; API compatible) |
| `netlify-functions/lib/jerarquia.seed.json` | `netlify/functions/lib/jerarquia.seed.json` (nuevo — seed de respaldo) |
| `netlify-functions/jerarquia.js` | `netlify/functions/jerarquia.js` (nueva function CRUD) |
| `admin-secciones.html` | raíz del deploy (junto a `admin.html`) → queda en `/admin-secciones.html` |
| `jerarquia.json` | súbelo a Drive en `CATALOGO B2B/` (dato inicial editable). *Opcional:* si no está, el seed hace de fallback. |

## Cómo funciona (resumen)
- La jerarquía deja de estar hardcodeada: `lib/jerarquia.js` la **lee de `jerarquia.json` en Drive**
  (con caché 30 s) y, si falla, usa el **seed** bundleado → sin regresión.
- La nueva function `jerarquia.js` hace CRUD (solo `rol: admin`), con **backup** antes de escribir
  y **bloqueo de borrado** si hay artículos.
- `admin-secciones.html` es la pantalla (crear/editar/borrar + mostrar/ocultar). Enlázala desde
  `admin.html` con una tarjeta nueva “Secciones y categorías” → `/admin-secciones.html`.

## Ajustes que debes revisar (2 min)
1. **Imports del backend** (`jerarquia.js`): están calcados de `catalogo.js`
   (`respond.js` → `ok/err/parseBody/withHandler`; `session.js` → `verifyToken`). Verifica que las
   **firmas coincidan** con tu proyecto (sobre todo cómo `verifyToken` recibe el token del `event`).
2. **Ruta de la API en la página**: `admin-secciones.html` llama a `/.netlify/functions/jerarquia`.
   Si usas redirects tipo `/api/*`, cámbiala.
3. **Consumidores síncronos de `JERARQUIA`**: en `catalogo.js` y `admin.js`, donde hoy se usa
   `JERARQUIA` directamente para **navegar/construir el árbol**, añade `await ensureJerarquia()` al
   principio del handler y usa `getJerarquia()` para leer los datos **vivos** (editados). El export
   `JERARQUIA` sigue existiendo (= seed) para no romper nada, pero no reflejará las ediciones.
   - Ojo con `TIPOS_LICENCIA_IDS` (se calcula al cargar el módulo): recalcúlalo tras
     `ensureJerarquia()` si quieres que respete categorías/tipos editados.

## FASE 2 (opcional) — mostrar/ocultar tiles desde el panel, sin deploy
Hoy la vitrina del cliente está hardcodeada en `catalogo.js` (`VITRINA_HOME`). Para que el
interruptor **👁️ Visible / 🚫 Oculta** de la pantalla funcione en la tienda:
- Deriva `VITRINA_HOME.destacadas` de la jerarquía: cada sección con `visibleCliente:true` genera un
  tile; `proximamente:true` la manda a `proximas`. Mantén los campos `portada`, `icono`, `orden`.
- Con eso, **quitar el tile del Mundial** = poner `visibleCliente:false` en la sección 604 desde el
  panel (sin publicar). Y **abrir PROGRAMACIÓN** = ponerla `visibleCliente:true`.

## Probar (obligatorio antes de prod)
```powershell
netlify deploy --dir . --functions netlify/functions --skip-functions-cache   # preview
```
1. Abre `TU-URL-PREVIEW/admin-secciones.html`, inicia sesión admin.
2. Crea una sección de prueba, una categoría, un tipo; edítalos; bórralos.
3. Comprueba que la tienda y el catálogo del admin **siguen cargando** con normalidad.
4. Solo entonces: `netlify deploy --prod ...`
