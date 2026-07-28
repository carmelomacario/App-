/* lib/jerarquia.js — JERARQUÍA DATA-DRIVEN (v2)
   ─────────────────────────────────────────────────────────────────────────
   Sustituye al jerarquia.js hardcodeado. Ahora la jerarquía vive como DATO en
   Drive (`jerarquia.json`, misma carpeta que catalogo.json) y se puede editar
   desde el panel admin. Si el JSON de Drive no existe o falla la lectura, se
   usa el SEED bundleado (jerarquia.seed.json) → CERO regresión respecto a hoy.

   API pública (compatible):
     - resolverJerarquia(sec, cat, tipo)   ← igual que antes (usa la jerarquía viva)
     - JERARQUIA                            ← export compat (= SEED); para datos VIVOS usa getJerarquia()
     - getJerarquia()                       ← array vivo (tras ensureJerarquia())
     - ensureJerarquia(force?)              ← await al inicio de cada handler que use la jerarquía
     - invalidarJerarquia()                 ← fuerza recarga (tras una escritura)
   ───────────────────────────────────────────────────────────────────────── */
import SEED from "./jerarquia.seed.json";
import { readJSON } from "./store.js";

let _jer = SEED;
let _ts = 0;
const TTL_MS = 30_000; // cache 30s por lambda (igual filosofía que catalogo)

export function getJerarquia() { return _jer; }
export function invalidarJerarquia() { _ts = 0; }

/* Carga jerarquia.json de Drive con caché. Llamar `await ensureJerarquia()` al
   principio de cada handler ANTES de usar resolverJerarquia()/getJerarquia(). */
export async function ensureJerarquia(force = false) {
  const now = Date.now();
  if (!force && _ts && (now - _ts) < TTL_MS) return _jer;
  try {
    const { data } = await readJSON("jerarquia.json", null);
    _jer = (Array.isArray(data) && data.length) ? data : SEED;
  } catch {
    _jer = SEED; // si Drive falla, seguimos con el seed (web no se cae)
  }
  _ts = now;
  return _jer;
}

/* Compat: algunos módulos importan JERARQUIA de forma síncrona al cargar.
   Les damos el SEED. Para datos EDITADOS en vivo, usa getJerarquia() tras ensure. */
export const JERARQUIA = SEED;

function norm(s) {
  return String(s || "").trim().toUpperCase()
    .replace(/Á/g, "A").replace(/É/g, "E").replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U")
    .replace(/Ñ/g, "N");
}
const SECCIONES_FLAT_NIVEL_SECCION = new Set([605]);

export function resolverJerarquia(seccionInput, categoriaInput, tipoInput) {
  const J = _jer;
  const secStr = String(seccionInput || "").trim();
  const catStr = String(categoriaInput || "").trim();
  const tipStr = String(tipoInput || "").trim();

  const sec = J.find(s => norm(s.nombre) === norm(secStr) || String(s.id) === secStr);
  if (!sec) return null;

  if (!sec.categorias || sec.categorias.length === 0 || (!catStr && SECCIONES_FLAT_NIVEL_SECCION.has(sec.id))) {
    return { seccionId: sec.id, seccion: sec.nombre, categoriaId: null, categoria: null, tipoId: null, tipo: null };
  }

  const cat = sec.categorias.find(c => norm(c.nombre) === norm(catStr) || String(c.id) === catStr);
  if (!cat) return null;

  let tip = null;
  if (tipStr) {
    tip = (cat.tipos || []).find(t => norm(t.nombre) === norm(tipStr) || String(t.id) === tipStr);
    if (!tip) return null;
  }
  return {
    seccionId: sec.id, seccion: sec.nombre,
    categoriaId: cat.id, categoria: cat.nombre,
    tipoId: tip?.id ?? null, tipo: tip?.nombre ?? null,
  };
}
