# Mensaje para pegar en Claude Code (en el PC), sobre la carpeta del proyecto

Copia TODO lo que hay entre las líneas y pégalo:

---

Esta carpeta es mi web B2B **Canary Modas** (PWA + Netlify Functions; se publica con
`deploy-staging.ps1` / `netlify deploy`). Quiero **instalar una función nueva** para gestionar
**secciones y categorías desde el panel admin**, sin tocar código cada vez.

La implementación de referencia está en GitHub: repo **`carmelomacario/App-`**, rama
**`claude/canary-modas-web-access-1dheh5`**, carpeta
**`clientescanarymodas/tradicional-canario/feature-secciones/`** (incluye `INSTALAR.md`).
Descárgala si tienes acceso; si no, impleméntala siguiendo esa guía. Haz esto:

1. Aplica `feature-secciones/INSTALAR.md` a este proyecto:
   - Reemplaza `netlify/functions/lib/jerarquia.js` por la versión **data-driven** (lee
     `jerarquia.json` de Drive con *fallback* al seed) y copia `jerarquia.seed.json` a `lib/`.
   - Añade la function `netlify/functions/jerarquia.js` (CRUD admin). **Ajusta los imports de
     `respond.js`/`session.js`** a las firmas reales de este proyecto (mira `catalogo.js`,
     sobre todo cómo `verifyToken` lee el token del `event`).
   - Copia `admin-secciones.html` a la raíz del deploy y **enlázalo desde `admin.html`** con una
     tarjeta nueva “Secciones y categorías” (→ `/admin-secciones.html`).
   - En `catalogo.js` y `admin.js`: añade `await ensureJerarquia()` al inicio de los handlers que
     usan la jerarquía y usa `getJerarquia()` para datos vivos; recalcula `TIPOS_LICENCIA_IDS`
     después del ensure.
   - Sube el `jerarquia.json` inicial a Drive, en `CATALOGO B2B/`.
2. De paso: en `catalogo.js` (`VITRINA_HOME`), **elimina el tile de Merchandising Mundial**
   (`seccionId: 604`) y confirma que **PROGRAMACIÓN (606)** queda visible.
3. **Importa los 122 artículos** de `clientescanarymodas/tradicional-canario/articulos_lacarreta.json`
   (van a PROGRAMACIÓN › TRADICIONAL CANARIO), si no están ya.
4. **IMPORTANTE — probar antes de producción**: publica primero en **preview**
   (`netlify deploy --dir . --functions netlify/functions --skip-functions-cache`), dame la URL, y
   verifica que **la tienda y el panel admin cargan bien** y que `/admin-secciones.html` funciona.
   **NO publiques a producción hasta que yo lo confirme.** Luego: `netlify deploy --prod …`.

No toques nada más y no borres datos. Ve explicándome cada paso en cristiano.

---
