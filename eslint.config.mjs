import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Classic React Hooks rules remain active (rules-of-hooks: error, exhaustive-deps: warn);
      // disable React Compiler-only rules not applicable to this codebase.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // Studio renders raw data-URL / blob / canvas manga assets directly via <img>.
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['public/landing/**/*.js'],
    rules: {
      // Public landing is a static vanilla JS bundle, not a Next.js React Client Component.
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '.vercel/**',
    'public/legacy/**',
    'Codigos Manga Flow/**',
  ]),
])

export default eslintConfig
