import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../public/landing/index.html', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('../lib/plans/catalog.json', import.meta.url), 'utf8'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const cards = Object.values(catalog).map((plan) => {
  const featured = plan.highlighted ? ' is-featured' : '';
  const badge = plan.highlighted ? '<span class="featured-ribbon">Más Popular</span>' : '';
  return `<article class="manga-plan-card plan-tombo-frame${featured}">
          ${badge}<h3>${escape(plan.name)}</h3>
          <div class="plan-price"><strong>${escape(plan.priceLabel)}</strong><span>${escape(plan.periodLabel)}</span></div>
          <ul class="plan-features">${plan.features.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>
          <a class="btn-ink-${plan.highlighted ? 'primary' : 'secondary'}" href="/studio?tab=kai&amp;plan=${plan.id}">${plan.id === 'trial' ? 'Probar el estudio' : 'Ver plan ' + plan.name}</a>
        </article>`;
});
const source = readFileSync(file, 'utf8');
const region = /<!-- plan-cards:start -->[\s\S]*?<!-- plan-cards:end -->/;
if (!region.test(source)) throw new Error('Falta el bloque de planes en la landing');
writeFileSync(file, source.replace(region, () => '<!-- plan-cards:start -->\n        ' + cards.join('\n        ') + '\n        <!-- plan-cards:end -->'));
