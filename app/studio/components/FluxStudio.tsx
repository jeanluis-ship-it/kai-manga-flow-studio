'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Download, LoaderCircle, Sparkles } from 'lucide-react';
import { Flow } from '../flow-sdk';
import type { Project } from '../types';
import './FluxStudio.css';

const formats = {
  cover_wrap: { title: 'Cubierta completa a color', ratio: '16:9', style: 'Color manga cover, editorial inks and atmospheric painted light.' },
  panel: { title: 'Viñeta en tinta', ratio: '3:4', style: 'Black and white manga, G-pen ink, screentones and clear silhouettes.' },
  portrait: { title: 'Retrato de personaje a color', ratio: '3:4', style: 'Color manga character illustration, consistent facial features, costume and palette.' },
} as const;
type Format = keyof typeof formats;
type Result = { dataUrl: string; format: Format };

async function readReference(file: File): Promise<string> {
  if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error('Selecciona un JPG, PNG o WebP de hasta 12 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la referencia.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.91);
  } finally {
    bitmap.close();
  }
}

export function FluxStudio({ project, updateProject }: {
  project: Project; updateProject: (patch: Partial<Project>) => void;
}) {
  const [format, setFormat] = useState<Format>('cover_wrap');
  const [scene, setScene] = useState('');
  const [reference, setReference] = useState('');
  const [loadingRef, setLoadingRef] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>();
  const [target, setTarget] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const uploadVersion = useRef(0);
  const inFlight = useRef(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const version = ++uploadVersion.current;
    setLoadingRef(true);
    setError('');
    try {
      const image = await readReference(file);
      if (version === uploadVersion.current) setReference(image);
    } catch (err) {
      if (version === uploadVersion.current) setError(err instanceof Error ? err.message : 'No se pudo leer la imagen.');
    } finally {
      if (version === uploadVersion.current) setLoadingRef(false);
    }
  }

  async function generate() {
    if (inFlight.current || loadingRef || !scene.trim()) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const image = await Flow.generate.image({
        provider: 'flux', mode: format, prompt: scene.trim(), aspectRatio: formats[format].ratio,
        style: formats[format].style, referenceImagesBase64: reference ? [reference] : [],
      });
      setResult({ dataUrl: image.dataUrl, format });
      setTarget('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la ilustración.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const destinations = result?.format === 'portrait'
    ? project.characters.map(c => ({ id: c.id, label: c.name }))
    : project.pages.flatMap((page, i) => (page.komas || []).filter(k => k.state !== 'LOCKED')
        .map(k => ({ id: k.id, label: `Página ${i + 1} · Viñeta ${k.panelIndex}` })));

  function apply() {
    if (!result) return;
    const src = result.dataUrl;
    if (result.format === 'cover_wrap') {
      updateProject({ cover: { ...project.cover, fullWrapBase64: src, frontBase64: '', backBase64: '' } });
    } else if (!destinations.some(d => d.id === target)) return;
    else if (result.format === 'portrait') {
      updateProject({ characters: project.characters.map(c => c.id !== target ? c : {
        ...c, referenceBase64: src, referenceMediaId: undefined, referenceViews: { ...c.referenceViews, front: src },
      }) });
    } else {
      updateProject({ pages: project.pages.map(page => ({
        ...page, komas: page.komas?.map(k => k.id === target ? { ...k, inkRenderUrl: src, state: 'PEN_IRE' } : k),
      })) });
    }
    setNotice('Ilustración aplicada al proyecto.');
  }

  return <section className="gf-flux" aria-labelledby="flux-title">
    <header><h1 id="flux-title">Ilustrar con FLUX</h1><p>Crea una escena o usa una imagen para conservar los rasgos de tu personaje.</p></header>
    <form onSubmit={e => { e.preventDefault(); void generate(); }}>
      <label>Formato<select value={format} onChange={e => setFormat(e.target.value as Format)}>
        {Object.entries(formats).map(([id, f]) => <option key={id} value={id}>{f.title} · {f.ratio}</option>)}
      </select></label>
      <label>Referencia opcional<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>
      {reference && <div className="flux-ref"><img src={reference} alt="Referencia seleccionada" />
        <button type="button" onClick={() => { ++uploadVersion.current; setLoadingRef(false); setReference(''); }}>Quitar referencia</button></div>}
      <label>Escena<textarea required rows={4} maxLength={2400} value={scene} onChange={e => setScene(e.target.value)}
        placeholder="Anacaona a la derecha. Mantén sus rizos, adornos y vestuario. A la izquierda, el río entre montañas al atardecer." /></label>
      <small>Al generar, envías esta escena y la referencia seleccionada a la demo de FLUX.2 [klein] 4B en Hugging Face. La beta comparte cola y cuota de GPU.</small>
      <button className="flux-primary" disabled={busy || loadingRef || !scene.trim()} type="submit">
        {busy ? <LoaderCircle size={17} /> : <Sparkles size={17} />} {busy ? 'Generando ilustración…' : 'Generar ilustración'}
      </button>
    </form>
    {error && <p role="alert">{error}</p>}
    {result && <section className="flux-result" aria-label="Resultado de FLUX">
      <h2>{formats[result.format].title}</h2><img src={result.dataUrl} alt={formats[result.format].title + ' generada con FLUX'} />
      <div className="flux-actions">
        <a download={'MANGAI-FLUX-' + result.format + '.png'} href={result.dataUrl}><Download size={16} /> Descargar PNG</a>
        <button onClick={() => { ++uploadVersion.current; setLoadingRef(false); setReference(result.dataUrl); setNotice('Referencia lista para la siguiente escena.'); }}>Usar como referencia</button>
      </div>
      {result.format !== 'cover_wrap' && <label>Destino en el proyecto<select value={target} onChange={e => setTarget(e.target.value)}>
        <option value="">{result.format === 'portrait' ? 'Selecciona una ficha Settei' : 'Selecciona una viñeta desbloqueada'}</option>
        {destinations.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select></label>}
      <button disabled={result.format !== 'cover_wrap' && !destinations.some(d => d.id === target)} onClick={apply}>
        {result.format === 'cover_wrap' ? 'Usar como cubierta del proyecto' : 'Aplicar al destino seleccionado'}</button>
    </section>}
    <p role="status">{notice}</p>
  </section>;
}
