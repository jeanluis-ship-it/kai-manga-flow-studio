# MANGAI — guide for coding agents

Read `README.md`, `.agent/rules/mangai.md`, and `docs/ARQUITECTURA.md` before changing product code.

Priority: maintain the approved visual landing while building a clean creator experience. Do not replace the 3D carousel, Z-space or visual assets without a specific request. Preserve `public/landing/` and work mainly in `app/studio/` and `lib/`.

Security: OpenAI API calls are server-only. Never commit credentials. Maintain explicit canon approval and image references. Mark unfinished modules as future work; never imply KAI's template suggestions are a connected conversational LLM.

Try `npm run typecheck && npm test && npm run build` before declaring a change ready.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
