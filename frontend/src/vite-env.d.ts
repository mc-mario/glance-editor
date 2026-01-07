/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLANCE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
