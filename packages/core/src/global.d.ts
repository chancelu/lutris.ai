interface ImportMetaEnv {
  readonly VITE_GOOGLE_FONTS_API_KEY?: string
  [key: string]: string | undefined
}

interface ImportMeta {
  readonly env?: ImportMetaEnv
}

interface FontData {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob(): Promise<Blob>
}

interface Window {
  queryLocalFonts?(): Promise<FontData[]>
}
