import type { Metadata } from 'next';
import './demo.css';

export const metadata: Metadata = { title: 'Anacaona · Prototipo visual de MANGAI' };

export default function DemoPage() {
  return (
    <main className="demo-book">
      <header><a href="/studio">← MANGAI Studio</a><span>Prototipo visual</span></header>
      <h1>Anacaona<span>Flor de Guerra</span></h1>
      <p className="demo-intro">En la costa de Quisqueya, Anacaona reconoce las primeras velas en el horizonte. Así toma forma su historia en MANGAI.</p>
      <figure>
        <a href="/demo/anacaona-cover.webp"><img src="/demo/anacaona-cover.webp" alt="Anacaona sostiene una flor roja frente a la costa al amanecer" width="1280" height="720" /></a>
        <figcaption><strong>Estudio de cubierta</strong><span>FLUX.1 Schnell · color</span></figcaption>
      </figure>
      <figure className="demo-character">
        <a href="/demo/anacaona-character.webp"><img src="/demo/anacaona-character.webp" alt="Exploración de Anacaona en tinta, con cabello largo y vestido claro" width="768" height="768" /></a>
        <figcaption><strong>Diseño de personaje</strong><span>FLUX · tinta y trama</span></figcaption>
      </figure>
      <footer>Imágenes generadas previamente con MANGAI Studio. Abre cada ilustración para verla a tamaño completo.</footer>
    </main>
  );
}
