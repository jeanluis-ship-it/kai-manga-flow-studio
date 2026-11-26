import { randomInt } from 'node:crypto';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import sharp from 'sharp';
import { fluxDimensions } from './fluxFormats';
import { ImageServiceError, type GenerateImageResultPayload } from './geminiImage';

// Public testing space maintained by the model authors. Keep upstream URLs server-owned.
const kleinOrigin = 'https://black-forest-labs-flux-2-klein-4b.hf.space';
const schnellOrigin = 'https://black-forest-labs-flux-1-schnell.hf.space';


function serviceFailure(message: string, status?: number) {
  if (status === 429 || /quota|rate limit/i.test(message)) {
    return new ImageServiceError('La demo de FLUX agotó su cuota. Conserva la escena y vuelve a probar cuando se renueve.', 429);
  }
  return new ImageServiceError('FLUX no pudo completar la ilustración. Conserva la referencia y vuelve a intentar.', 503);
}

async function call(url: string | URL, signal: AbortSignal, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const host = new URL(url).origin;
  if ((host === kleinOrigin || host === schnellOrigin) && process.env.HF_API_TOKEN) {
    headers.set('Authorization', 'Bearer ' + process.env.HF_API_TOKEN);
  }
  const response = await fetch(url, { ...init, headers, signal, cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw serviceFailure('', response.status);
  return response;
}

async function uploadReference(ref: { data: string }, signal: AbortSignal) {
  let cleaned: Buffer;
  try {
    const input = sharp(Buffer.from(ref.data, 'base64'), { limitInputPixels: 36_000_000 });
    const { format } = await input.metadata();
    if (!['jpeg', 'png', 'webp'].includes(format || '')) throw new Error();
    cleaned = await input.rotate().resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
  } catch {
    throw new ImageServiceError('La referencia debe ser una imagen JPG, PNG o WebP válida de hasta 36 megapíxeles.', 400);
  }
  const form = new FormData();
  form.append('files', new Blob([new Uint8Array(cleaned)], { type: 'image/webp' }), 'referencia.webp');
  const files = await (await call(kleinOrigin + '/gradio_api/upload', signal, { method: 'POST', body: form })).json();
  if (!Array.isArray(files) || typeof files[0] !== 'string') throw serviceFailure('');
  return { image: { path: files[0], orig_name: 'referencia.webp', mime_type: 'image/webp', meta: { _type: 'gradio.FileData' } }, caption: null };
}

async function generateOnSpace(
  origin: string,
  prompt: string, references: { data: string }[], ratio: string, seed?: string, clientSignal?: AbortSignal,
): Promise<GenerateImageResultPayload> {
  const timeout = AbortSignal.timeout(70_000);
  const signal = clientSignal ? AbortSignal.any([timeout, clientSignal]) : timeout;
  const [width, height] = fluxDimensions[ratio] || fluxDimensions['3:4'];
  const api = origin + '/gradio_api';
  const schnell = origin === schnellOrigin;
  try {
    const images = await Promise.all(references.map(ref => uploadReference(ref, signal)));
    const seedNumber = seed ? Number(seed.slice(-9)) : randomInt(0, 2 ** 31 - 1);
    const queued = await call(api + '/call/infer', signal, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: schnell ? [prompt, seedNumber, false, width, height, 4] : [prompt, images, 'Distilled (4 steps)', seedNumber, false, width, height, 4, 1, false] }),
    });
    const { event_id: id } = await queued.json();
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(id)) throw serviceFailure('');
    const stream = await call(api + '/call/infer/' + id, signal);
    if (!stream.body) throw serviceFailure('');
    const reader = stream.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).getReader();
    let asset: URL | undefined;
    try {
      while (!asset) {
        const { done, value } = await reader.read();
        if (done) throw serviceFailure('');
        if (value.event === 'error') throw serviceFailure(value.data);
        if (value.event !== 'complete') continue;
        const file = JSON.parse(value.data)?.[0];
        if (typeof file?.url !== 'string') throw serviceFailure('');
        const url = new URL(file.url);
        if (url.origin !== origin || !url.pathname.startsWith('/gradio_api/file=')) throw serviceFailure('');
        asset = url;
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    const download = await call(asset, signal);
    const bytes = await download.arrayBuffer();
    if (bytes.byteLength > 12_000_000) throw serviceFailure('');
    const source = sharp(bytes, { limitInputPixels: 8_000_000 });
    const output = await source.png().toBuffer();
    const png = output.length < 2_900_000 ? output : await source.png({ palette: true }).toBuffer();
    return { image: 'data:image/png;base64,' + png.toString('base64'), mimeType: 'image/png',
      model: schnell ? 'FLUX.1 [schnell]' : 'FLUX.2 [klein] 4B', provider: 'huggingface', renderKind: 'illustration', fallbackUsed: schnell };
  } catch (err) {
    if (err instanceof ImageServiceError) throw err;
    if (signal.aborted) throw new ImageServiceError('Se agotó la espera en la cola de FLUX. Tu escena sigue disponible para reintentar.', 504);
    throw serviceFailure('');
  }
}

async function generateOnCloudflare(prompt: string, refs: {data: string}[], ratio: string, seed: string | undefined, signal: AbortSignal) {
  const [width, height] = fluxDimensions[ratio];
  const form = new FormData();
  form.set('prompt', prompt);
  form.set('width', String(width));
  form.set('height', String(height));
  if (seed) form.set('seed', seed.slice(-9));
  for (const [index, ref] of refs.entries()) {
    const bytes = await sharp(Buffer.from(ref.data, 'base64'), { limitInputPixels: 36_000_000 }).rotate().resize({width:1536,height:1536,fit:'inside',withoutEnlargement:true}).png().toBuffer();
    form.append('input_image_' + index, new Blob([new Uint8Array(bytes)], {type:'image/png'}), 'reference.png');
  }
  const endpoint = 'https://api.cloudflare.com/client/v4/accounts/' + process.env.CLOUDFLARE_ACCOUNT_ID + '/ai/run/@cf/black-forest-labs/flux-2-klein-4b';
  const response = await call(endpoint, signal, {method:'POST', headers:{ Authorization: 'Bearer ' + process.env.CLOUDFLARE_WORKERS_AI_TOKEN }, body:form});
  const data = await response.json();
  if (typeof data?.result?.image !== 'string') throw serviceFailure('');
  const buffer = await sharp(Buffer.from(data.result.image,'base64'),{limitInputPixels:8_000_000}).webp({quality:94}).toBuffer();
  return { image:'data:image/webp;base64,' + buffer.toString('base64'), mimeType:'image/webp', model:'FLUX.2 [klein] 4B', provider:'cloudflare', renderKind:'illustration' as const, fallbackUsed:true };
}

export async function generateFluxImage(prompt: string, refs: { data: string }[], ratio: string, seed?: string, clientSignal?: AbortSignal): Promise<GenerateImageResultPayload> {
  try {
    return await generateOnSpace(kleinOrigin, prompt, refs, ratio, seed, clientSignal);
  } catch (error) {
    if (clientSignal?.aborted || (error instanceof ImageServiceError && error.status === 400)) throw error;
    if (process.env.CLOUDFLARE_WORKERS_AI_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
      const timeout = AbortSignal.timeout(28_000);
      try {
        return await generateOnCloudflare(prompt, refs, ratio, seed, clientSignal ? AbortSignal.any([timeout,clientSignal]) : timeout);
      } catch {
        if (refs.length || clientSignal?.aborted) throw serviceFailure('');
      }
    }
    // Schnell is text-only. Preserve the author's reference for a later retry.
    if (refs.length) throw error;
    return generateOnSpace(schnellOrigin, prompt, [], ratio, seed, clientSignal);
  }
}
