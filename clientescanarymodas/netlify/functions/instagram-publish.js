// netlify/functions/instagram-publish.js
//
// v1.22.0 — Publicar una publicación del catálogo en Instagram, SIN precio.
//
// Flujo (Instagram Graph API, publicación en 2 pasos):
//   1) POST /{IG_BUSINESS_ID}/media          -> crea el "contenedor" (image_url + caption)
//   2) POST /{IG_BUSINESS_ID}/media_publish  -> publica el contenedor -> devuelve el id del post
//
// Requisitos (se configuran en Netlify → Site settings → Environment variables):
//   IG_BUSINESS_ID     ID de la cuenta de Instagram Business (numérico).
//   IG_ACCESS_TOKEN    Token de acceso de larga duración con permiso instagram_content_publish.
//   IG_GRAPH_VERSION   (opcional) versión de la Graph API. Por defecto: v21.0
//   IG_HASHTAGS        (opcional) bloque de hashtags que se añade al final del pie de foto.
//   INSTAGRAM_FN_SECRET (opcional) si se define, la función exige la cabecera
//                       'x-ig-secret' con ese valor. Úsalo para que solo tu panel
//                       de admin pueda invocarla.
//
// IMPORTANTE: Instagram exige que 'image_url' sea una URL pública accesible por
// internet (JPEG/PNG). Las fotos servidas por el catálogo ya cumplen esto; si en
// algún caso la foto viniera de Google Drive, hay que pasarla por una URL pública.

const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Quita del texto cualquier cosa que parezca un precio, como red de seguridad
// (aunque el panel ya manda solo la descripción). Cubre "12,50 €", "€ 12.50",
// "$9", "12.50 EUR", "PVP: 30", "Precio 30", etc.
function stripPrice(text = '') {
  return String(text)
    // "PVP: 30,00 €" / "Precio 30€" / "P.V.P 30"
    .replace(/\b(?:pvp|p\.v\.p\.?|precio)\b\s*:?\s*[€$]?\s*\d[\d.,]*\s*(?:€|eur|euros?|\$|usd)?/gi, '')
    // "12,50 €" / "12.50€" / "€12,50" / "$ 9" / "30 EUR"
    .replace(/[€$]\s*\d[\d.,]*|\d[\d.,]*\s*(?:[€$]|(?:eur|euros?|usd)\b)/gi, '')
    // Limpia dobles espacios / líneas vacías sobrantes
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Construye el pie de foto final: descripción (sin precio) + hashtags opcionales.
function buildCaption(descripcion) {
  const cuerpo = stripPrice(descripcion || '');
  const hashtags = (process.env.IG_HASHTAGS || '').trim();
  return [cuerpo, hashtags].filter(Boolean).join('\n\n').slice(0, 2200); // límite de IG: 2200 chars
}

async function graphPost(path, params) {
  const url = `${GRAPH_BASE}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: process.env.IG_ACCESS_TOKEN });
  const res = await fetch(url, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const handler = async (event) => {
  const json = (statusCode, obj) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  });

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Método no permitido. Usa POST.' });
  }

  // Auth opcional por secreto compartido
  const secret = process.env.INSTAGRAM_FN_SECRET;
  if (secret) {
    const provided = event.headers?.['x-ig-secret'] || event.headers?.['X-Ig-Secret'];
    if (provided !== secret) {
      return json(401, { ok: false, error: 'No autorizado.' });
    }
  }

  // Comprobación de configuración
  if (!process.env.IG_BUSINESS_ID || !process.env.IG_ACCESS_TOKEN) {
    return json(500, {
      ok: false,
      error: 'Falta configuración: define IG_BUSINESS_ID e IG_ACCESS_TOKEN en Netlify.',
    });
  }

  // Parseo de entrada
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'JSON inválido en el cuerpo de la petición.' });
  }

  const imageUrl = payload.imageUrl || payload.image_url;
  const descripcion = payload.descripcion ?? payload.description ?? '';

  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return json(400, { ok: false, error: 'Falta "imageUrl" (debe ser una URL pública http/https).' });
  }

  const caption = buildCaption(descripcion);

  try {
    // 1) Crear contenedor
    const container = await graphPost(`${process.env.IG_BUSINESS_ID}/media`, {
      image_url: imageUrl,
      caption,
    });

    // 2) Publicar contenedor
    const published = await graphPost(`${process.env.IG_BUSINESS_ID}/media_publish`, {
      creation_id: container.id,
    });

    return json(200, {
      ok: true,
      id: published.id,
      permalink: `https://www.instagram.com/p/${published.id}/`,
      caption,
    });
  } catch (err) {
    return json(502, { ok: false, error: `Instagram rechazó la publicación: ${err.message}` });
  }
};
