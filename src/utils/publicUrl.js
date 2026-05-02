/** Resolves paths under `public/` for Vite `base` (e.g. /fire-shield-combo/). */
export function publicUrl(path) {
  const base = import.meta.env.BASE_URL || '/'
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${base}${clean}`
}
