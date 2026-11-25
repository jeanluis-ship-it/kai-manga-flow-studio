import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Supabase Backend: migration 003 defines mangas, settei_items, manga_pages with RLS and manga-assets bucket', () => {
  const migPath = 'supabase/migrations/003_mangas_settei_pages_storage.sql';
  assert.ok(existsSync(join(base, migPath)), 'Migration 003 SQL must exist');
  const sql = load(migPath);

  for (const token of [
    'public.mangas',
    'public.settei_items',
    'public.manga_pages',
    'ENABLE ROW LEVEL SECURITY',
    'auth.uid() = user_id',
    "'manga-assets'",
    'manga_assets_public_read',
    'manga_assets_auth_insert',
    'manga_assets_owner_delete',
  ]) {
    assert.ok(sql.includes(token), `Missing SQL token: ${token}`);
  }
});

test('Supabase Storage: lib/supabase/storage.ts uploads to manga-assets under {userId}/{mangaId}/...', () => {
  assert.ok(existsSync(join(base, 'lib/supabase/storage.ts')));
  const src = load('lib/supabase/storage.ts');
  assert.match(src, /MANGA_ASSETS_BUCKET\s*=\s*['"]manga-assets['"]/);
  assert.match(src, /\$\{userId\}\/\$\{mangaId\}\//);
  assert.match(src, /getPublicUrl/);
});

test('Supabase Repository: studioRepository syncs mangas, settei_items, manga_pages and Storage URLs', () => {
  const src = load('lib/storage/studioRepository.ts');
  assert.match(src, /uploadMangaAssetToStorage/);
  assert.match(src, /\.from\(['"]mangas['"]\)/);
  assert.match(src, /\.from\(['"]settei_items['"]\)/);
  assert.match(src, /\.from\(['"]manga_pages['"]\)/);
});

test('Supabase Auth Modal: AuthModal.tsx and AuthModal.css exist and are wired in Studio without blocking Guest mode', () => {
  assert.ok(existsSync(join(base, 'app/studio/components/AuthModal.tsx')));
  assert.ok(existsSync(join(base, 'app/studio/components/AuthModal.css')));
  const modal = load('app/studio/components/AuthModal.tsx');
  assert.match(modal, /signInWithPassword/);
  assert.match(modal, /signUp/);
  assert.match(modal, /Seguir como Invitado/);

  const studio = load('app/studio/page.tsx');
  assert.match(studio, /<AuthModal/);
  assert.match(studio, /Iniciar Sesión/);
});
