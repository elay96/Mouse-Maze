/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_PASSCODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

