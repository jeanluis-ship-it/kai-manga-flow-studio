import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const base = process.cwd();
const load = p => readFileSync(join(base,p),'utf8');
test('preserves the animated landing and asset folders',()=>{
  assert.ok(existsSync(join(base,'public/landing/index.html')));
  assert.ok(existsSync(join(base,'public/landing/landing.js')));
  assert.ok(load('public/landing/index.html').includes('data-open-studio'));
  assert.ok(load('public/landing/landing.js').includes("window.location.assign('/studio')"));
});
test('never puts OpenAI credentials in public assets',()=>{
  assert.doesNotMatch(load('public/landing/landing.js'), /OPENAI_API_KEY|sk-proj-/);
  assert.doesNotMatch(load('public/landing/index.html'), /OPENAI_API_KEY|sk-proj-/);
});
test('API requires access token and server-side credential',()=>{
  const api = load('app/api/images/generate/route.ts');
  assert.match(api,/STUDIO_ACCESS_TOKEN/);
  assert.match(api,/OPENAI_API_KEY/);
  assert.match(api,/client\.images\.edit/);
  assert.match(api,/client\.images\.generate/);
});
