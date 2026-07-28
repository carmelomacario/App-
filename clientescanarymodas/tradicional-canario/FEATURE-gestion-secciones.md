# Feature: gestionar SECCIONES / CATEGORÍAS / TIPOS desde el panel admin

## Objetivo
Que el administrador pueda **crear, editar, borrar y reordenar** secciones, categorías y tipos
(y decidir qué se muestra al cliente) **desde el panel**, sin tocar código ni hacer `deploy`.
Hoy la jerarquía está *hardcodeada* en `netlify/functions/lib/jerarquia.js`, por eso cada cambio
exige editar código y republicar.

## Idea central: hacer la jerarquía DATA-DRIVEN
1. **Migrar** el array `JERARQUIA` de `lib/jerarquia.js` a un JSON en Drive:
   `CATALOGO B2B/jerarquia.json` (misma carpeta que `catalogo.json`).
2. `lib/jerarquia.js` deja de tener el array fijo y pasa a **leer `jerarquia.json`** (con caché en
   memoria del lambda, igual que `catalogo.json`), exponiendo la MISMA API (`JERARQUIA`,
   `resolverJerarquia`). Si el JSON no existe, *fallback* al array actual (seed inicial).
3. **Migración inicial**: volcar el `JERARQUIA` actual a `jerarquia.json` una sola vez.

## Backend: nueva Netlify Function `jerarquia.js` (solo rol admin)
Acciones (POST con `{ action, ... }`), que **escriben `jerarquia.json`** vía `store.writeJSON`:
- `list` — devuelve la jerarquía completa.
- `crearSeccion` / `editarSeccion` / `borrarSeccion`
- `crearCategoria` / `editarCategoria` / `borrarCategoria`
- `crearTipo` / `editarTipo` / `borrarTipo`
- `reordenar` — cambia el orden de tiles/categorías.
- IDs **autoincrementales** (guardar un `nextId`), para no colisionar (hoy 700/701 chocan entre
  la sección 605 y la 606 — el modelo data-driven lo evita).
- **Validación de borrado**: si una sección/categoría/tipo tiene artículos, avisar y ofrecer
  *reasignar* o *bloquear* el borrado (no dejar artículos huérfanos).

## Vitrina editable (bonus, resuelve “mostrar/ocultar tiles”)
Hoy lo que ve el cliente está *hardcodeado* en `catalogo.js` (`VITRINA_HOME`). Añadir a cada
sección de `jerarquia.json` estos campos y que `catalogo.js` **derive la vitrina** de ahí:
- `visibleCliente` (bool) — mostrar/ocultar el tile al cliente.
- `proximamente` (bool) — mostrar como “Próximamente”.
- `orden` (num) — posición en el home.
- `portada` (url/id), `icono`.
Así, “quitar el tile del Mundial” = **desmarcar `visibleCliente`** desde el panel. “Abrir
PROGRAMACIÓN” = marcarla visible. Sin `deploy`.

## Admin UI (`admin.html`): nueva tarjeta “Secciones y categorías”
- Árbol **Sección → Categoría → Tipo** con botones **＋ / ✏️ / 🗑️** en cada nivel.
- Toggles por sección: *Visible para cliente* · *Próximamente*.
- Reordenar (arrastrar o flechas ↑↓).
- Al borrar algo con artículos: modal “Tiene N artículos: reasignar a ___ / cancelar”.

## Puesta en marcha
- **Un solo `deploy`** para instalar (backend + `jerarquia.js` data-driven + UI).
- **A partir de ahí, cero deploys** para cambios de estructura: todo es dato en `jerarquia.json`.

## Notas de seguridad
- Todas las acciones exigen `rol === "admin"` (usar `verifyToken`).
- Hacer **backup** de `jerarquia.json` antes de cada escritura (como con `catalogo.json`).
- Mantener `resolverJerarquia` idéntico para no romper la carga de artículos existentes.
