import { NextResponse } from 'next/server';

export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const tokenEnforced = process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);

  return NextResponse.json({
    ok: true,
    service: 'mangai-studio',
    imageApiConfigured: true,
    requiresAccessToken: tokenEnforced,
    providers: {
      gemini: geminiConfigured,
      openai: openaiConfigured,
      builtInMangaEngine: true,
    },
  });
}
