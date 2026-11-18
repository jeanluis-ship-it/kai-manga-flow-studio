export function cloudflareImageConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_WORKERS_AI_TOKEN?.trim();
  return accountId && /^[a-f0-9]{32}$/i.test(accountId) && token ? { accountId, token } : null;
}

const dimensions: Record<string, [number, number]> = {
  '1:1': [1024, 1024],
  '3:4': [768, 1024],
  '4:3': [1024, 768],
  '16:9': [1280, 720],
  '9:16': [720, 1280],
};

export async function generateCloudflareImage(
  config: NonNullable<ReturnType<typeof cloudflareImageConfig>>,
  prompt: string,
  aspectRatio: string,
  references: File[],
) {
  const [width, height] = dimensions[aspectRatio] ?? dimensions['1:1'];
  const body = new FormData();
  body.set('prompt', prompt);
  body.set('width', String(width));
  body.set('height', String(height));
  references.slice(0, 4).forEach((reference, index) => {
    body.set(`input_image_${index}`, reference);
  });

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!response.ok) return { status: response.status };

  const payload = (await response.json()) as { result?: { image?: unknown } };
  const encoded = payload.result?.image;
  if (typeof encoded !== 'string') return { status: 502 };

  const header = Buffer.from(encoded.slice(0, 20), 'base64');
  if (header.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return { image: `data:image/png;base64,${encoded}` };
  }
  if (header.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) {
    return { image: `data:image/jpeg;base64,${encoded}` };
  }
  if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') {
    return { image: `data:image/webp;base64,${encoded}` };
  }
  return { status: 502 };
}
