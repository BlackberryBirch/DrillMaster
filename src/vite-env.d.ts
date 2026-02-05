/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BUILD_DATE__: string
declare const __GIT_COMMIT__: string
declare const __CHANGELOG__: string

