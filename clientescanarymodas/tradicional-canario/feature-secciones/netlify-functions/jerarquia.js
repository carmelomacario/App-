/* netlify/functions/jerarquia.js — CRUD de SECCIONES / CATEGORÍAS / TIPOS (solo admin)
   ─────────────────────────────────────────────────────────────────────────
   Lee/escribe la jerarquía como DATO en Drive (`jerarquia.json`). Hace backup
   antes de cada escritura e impide borrar algo que tenga artículos (ofrece
   contar/mover). Tras escribir, invalida la caché de lib/jerarquia.js.

   ⚠️ BORRADOR PARA REVISAR Y PROBAR EN PREVIEW ANTES DE PRODUCCIÓN.
   Ajusta los imports (respond.js / session.js) a las firmas EXACTAS de tu
   proyecto — están calcados del patrón de catalogo.js, revisa `verifyToken`.
   ───────────────────────────────────────────────────────────────────────── */
import { ok, err, parseBody, withHandler } from "./lib/respond.js";
import { verifyToken } from "./lib/session.js";
import { readJSON, writeJSON } from "./lib/store.js";
import { invalidarJerarquia } from "./lib/jerarquia.js";
import SEED from "./lib/jerarquia.seed.json";

/* ── carga / guardado ── */
async function cargar() {
  const { data } = await readJSON("jerarquia.json", null);
  return (Array.isArray(data) && data.length) ? data : JSON.parse(JSON.stringify(SEED));
}
async function guardar(jer) {
  // backup del estado anterior (best-effort)
  try {
    const { data } = await readJSON("jerarquia.json", null);
    if (Array.isArray(data) && data.length) {
      await writeJSON(`jerarquia-antes-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, data);
    }
  } catch { /* sin backup no bloqueamos */ }
  await writeJSON("jerarquia.json", jer);
  invalidarJerarquia();
}

/* ── utilidades ── */
function nextId(jer) {
  let max = 0;
  for (const s of jer) {
    max = Math.max(max, Number(s.id) || 0);
    for (const c of (s.categorias || [])) {
      max = Math.max(max, Number(c.id) || 0);
      for (const t of (c.tipos || [])) max = Math.max(max, Number(t.id) || 0);
    }
  }
  return max + 1;
}
const findSec = (jer, id) => jer.find(s => Number(s.id) === Number(id));
const findCat = (sec, id) => (sec?.categorias || []).find(c => Number(c.id) === Number(id));
const findTipo = (cat, id) => (cat?.tipos || []).find(t => Number(t.id) === Number(id));

/* Cuenta artículos afectados (para no dejar huérfanos al borrar) */
async function contarArticulos({ seccionId, categoriaId, tipoId }) {
  const { data } = await readJSON("catalogo.json", { articulos: [] });
  const arts = data?.articulos || [];
  return arts.filter(a =>
    (seccionId == null || Number(a.seccionId) === Number(seccionId)) &&
    (categoriaId == null || Number(a.categoriaId) === Number(categoriaId)) &&
    (tipoId == null || Number(a.tipoId) === Number(tipoId))
  ).length;
}

export const handler = withHandler(async (event) => {
  // Solo administradores
  const claims = await verifyToken(event);
  if (!claims || claims.rol !== "admin") return err(403, "Solo administradores");

  const body = parseBody(event);
  const action = body?.action;
  const jer = await cargar();

  switch (action) {
    /* ── LEER ── */
    case "list":
      return ok({ jerarquia: jer });

    /* ── SECCIONES ── */
    case "crearSeccion": {
      const id = nextId(jer);
      jer.push({
        id, nombre: String(body.nombre || "Nueva sección").trim(),
        icono: body.icono || "📦",
        visibleCliente: !!body.visibleCliente,
        proximamente: !!body.proximamente,
        orden: jer.length,
        categorias: [],
      });
      await guardar(jer);
      return ok({ id, jerarquia: jer });
    }
    case "editarSeccion": {
      const s = findSec(jer, body.id);
      if (!s) return err(404, "Sección no encontrada");
      for (const k of ["nombre", "icono", "portada", "visibleCliente", "proximamente", "orden", "ocultarHome"]) {
        if (k in body) s[k] = body[k];
      }
      await guardar(jer);
      return ok({ jerarquia: jer });
    }
    case "borrarSeccion": {
      const s = findSec(jer, body.id);
      if (!s) return err(404, "Sección no encontrada");
      const n = await contarArticulos({ seccionId: s.id });
      if (n > 0 && !body.forzar) return err(409, `La sección tiene ${n} artículos. Reasígnalos o marca "forzar".`, { articulos: n });
      const i = jer.indexOf(s); jer.splice(i, 1);
      await guardar(jer);
      return ok({ jerarquia: jer });
    }

    /* ── CATEGORÍAS ── */
    case "crearCategoria": {
      const s = findSec(jer, body.seccionId);
      if (!s) return err(404, "Sección no encontrada");
      s.categorias = s.categorias || [];
      const id = nextId(jer);
      s.categorias.push({ id, nombre: String(body.nombre || "Nueva categoría").trim(), portada: body.portada || null, tipos: [] });
      await guardar(jer);
      return ok({ id, jerarquia: jer });
    }
    case "editarCategoria": {
      const s = findSec(jer, body.seccionId); const c = findCat(s, body.id);
      if (!c) return err(404, "Categoría no encontrada");
      for (const k of ["nombre", "portada"]) if (k in body) c[k] = body[k];
      await guardar(jer);
      return ok({ jerarquia: jer });
    }
    case "borrarCategoria": {
      const s = findSec(jer, body.seccionId); const c = findCat(s, body.id);
      if (!c) return err(404, "Categoría no encontrada");
      const n = await contarArticulos({ seccionId: s.id, categoriaId: c.id });
      if (n > 0 && !body.forzar) return err(409, `La categoría tiene ${n} artículos.`, { articulos: n });
      s.categorias.splice(s.categorias.indexOf(c), 1);
      await guardar(jer);
      return ok({ jerarquia: jer });
    }

    /* ── TIPOS ── */
    case "crearTipo": {
      const s = findSec(jer, body.seccionId); const c = findCat(s, body.categoriaId);
      if (!c) return err(404, "Categoría no encontrada");
      c.tipos = c.tipos || [];
      const id = nextId(jer);
      c.tipos.push({ id, nombre: String(body.nombre || "Nuevo tipo").trim() });
      await guardar(jer);
      return ok({ id, jerarquia: jer });
    }
    case "editarTipo": {
      const s = findSec(jer, body.seccionId); const c = findCat(s, body.categoriaId); const t = findTipo(c, body.id);
      if (!t) return err(404, "Tipo no encontrado");
      if ("nombre" in body) t.nombre = body.nombre;
      await guardar(jer);
      return ok({ jerarquia: jer });
    }
    case "borrarTipo": {
      const s = findSec(jer, body.seccionId); const c = findCat(s, body.categoriaId); const t = findTipo(c, body.id);
      if (!t) return err(404, "Tipo no encontrado");
      const n = await contarArticulos({ seccionId: s.id, categoriaId: c.id, tipoId: t.id });
      if (n > 0 && !body.forzar) return err(409, `El tipo tiene ${n} artículos.`, { articulos: n });
      c.tipos.splice(c.tipos.indexOf(t), 1);
      await guardar(jer);
      return ok({ jerarquia: jer });
    }

    /* ── VISIBILIDAD (mostrar/ocultar tile al cliente, sin deploy) ── */
    case "setVisibilidad": {
      const s = findSec(jer, body.id);
      if (!s) return err(404, "Sección no encontrada");
      if ("visibleCliente" in body) s.visibleCliente = !!body.visibleCliente;
      if ("proximamente" in body) s.proximamente = !!body.proximamente;
      await guardar(jer);
      return ok({ jerarquia: jer });
    }

    default:
      return err(400, `Acción desconocida: ${action}`);
  }
});
