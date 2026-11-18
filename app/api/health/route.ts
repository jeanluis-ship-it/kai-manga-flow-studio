import { NextResponse } from 'next/server';

export async function GET() {
  const studioTokenConfigured = Boolean(process.env.STUDIO_ACCESS_TOKEN);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json({
    ok: true,
    service: 'mangai-studio',
    imageApiConfigured: Boolean(studioTokenConfigured && (openaiConfigured || geminiConfigured)),
    studioTokenConfigured,
    providers: {
      openai: openaiConfigured,
      gemini: geminiConfigured,
      fluxServerProxy: studioTokenConfigured,
    },
  });
}
