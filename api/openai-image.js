/**
 * MANGAI v0.6 — OpenAI Images (private development mode).
 * The OpenAI key never leaves the server. Public launch requires real accounts,
 * quotas, billing, and durable rate limiting; a shared access code is NOT that.
 */
const crypto = require('node:crypto');
const MAX_REQUEST_BYTES = 3500 * 1024;
const MAX_IMAGE_B64 = 1500 * 1024;

function constantTimeEquals(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function normalizeReference(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const input = typeof ref.dataUrl === 'string' ? ref.dataUrl :
    typeof ref.url === 'string' && ref.url.startsWith('data:image/') ? ref.url :
    typeof ref.base64 === 'string' ? 'data:' + (ref.mimeType || 'image/png') + ';base64,' + ref.base64 : '';
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(input);
  if (!match || match[2].length > MAX_IMAGE_B64) return null;
  return { mimeType: match[1].toLowerCase(), data: Buffer.from(match[2], 'base64') };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Solo POST.' });

  const key = (process.env.OPENAI_API_KEY || '').trim();
  const requiredCode = (process.env.MANGAI_STUDIO_ACCESS_TOKEN || '').trim();
  if (!key || !requiredCode) {
    return res.status(503).json({ ok: false, error: 'El administrador debe configurar OPENAI_API_KEY y MANGAI_STUDIO_ACCESS_TOKEN en Vercel.' });
  }
  if (!constantTimeEquals(req.headers['x-mangai-studio-key'], requiredCode)) {
    return res.status(401).json({ ok: false, error: 'Código de acceso del Studio incorrecto.' });
  }
  if (Number(req.headers['content-length'] || 0) > MAX_REQUEST_BYTES) {
    return res.status(413).json({ ok: false, error: 'La solicitud o referencia visual es demasiado grande.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (prompt.length < 10 || prompt.length > 6000) {
      return res.status(400).json({ ok: false, error: 'Describe la escena (10–6000 caracteres).' });
    }
    const refs = Array.isArray(body.castReferences) ? body.castReferences : [];
    if (refs.length > 2) {
      return res.status(400).json({ ok: false, error: 'Máximo dos referencias visuales por imagen.' });
    }
    const references = refs.map(normalizeReference);
    if (references.some(r => !r)) {
      return res.status(400).json({ ok: false, error: 'Referencia no válida: solo PNG, JPG o WEBP en base64, máximo 1 MB aprox.' });
    }
    const width = Number(body.width) || 768, height = Number(body.height) || 1024;
    const size = width > height * 1.12 ? '1536x1024' : height > width * 1.12 ? '1024x1536' : '1024x1024';
    const quality = ['low','medium','high'].includes(body.quality) ? body.quality : 'medium';
    // Model is set server-side, never accepted from untrusted requests.
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';
    const payload = { model, prompt, size, quality, n: 1, output_format: 'webp', output_compression: 85 };
    const edit = references.length > 0;
    let requestBody, requestHeaders = { Authorization: 'Bearer ' + key };
    if (edit) {
      const form = new FormData();
      for (const [field, value] of Object.entries(payload)) form.append(field, String(value));
      references.forEach((ref, index) => {
        const ext = ref.mimeType === 'image/jpeg' ? 'jpg' : ref.mimeType.split('/')[1];
        form.append('image[]', new Blob([ref.data], { type: ref.mimeType }), 'reference-' + index + '.' + ext);
      });
      requestBody = form;
    } else {
      requestHeaders['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(payload);
    }
    const response = await fetch('https://api.openai.com/v1/images/' + (edit ? 'edits' : 'generations'), {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
      signal: AbortSignal.timeout(110000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = typeof result.error?.message === 'string' ? result.error.message.slice(0, 260) : 'Error del proveedor de imágenes.';
      return res.status(response.status === 429 ? 429 : 502).json({ ok: false, error: reason });
    }
    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ ok: false, error: 'La API no devolvió una imagen.' });
    return res.status(200).json({
      ok: true, providerUsed: 'OpenAI Images · ' + model, engineId: 'openai_gpt_image',
      url: 'data:image/webp;base64,' + b64, editedFromReferences: edit
    });
  } catch (err) {
    const message = err?.name === 'TimeoutError' ? 'La generación excedió el tiempo de espera.' : 'No se pudo completar la generación.';
    return res.status(502).json({ ok: false, error: message });
  }
};
