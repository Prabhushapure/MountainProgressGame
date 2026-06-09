const PROGRESS_API_BASE = import.meta.env.VITE_PROGRESS_API_BASE || '/api'

const buildProgressUrl = (suffix = '') => {
  const base = PROGRESS_API_BASE.replace(/\/$/, '')
  return `${base}/play/progress${suffix}`
}

export async function fetchPlayProgress({ comboTheme, token, playNo }) {
  const url = new URL(buildProgressUrl(), window.location.origin)
  url.searchParams.set('token', token)
  url.searchParams.set('play_no', playNo)
  if (comboTheme) {
    url.searchParams.set('combo_theme', comboTheme)
  }

  const response = await fetch(url)
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Fetch progress failed (${response.status})`)
  }
  return response.json()
}

export async function savePlayProgress({
  comboTheme,
  token,
  playNo,
  levels,
  campScores,
  updatedAt,
}) {
  const response = await fetch(buildProgressUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      combo_theme: comboTheme,
      token,
      play_no: playNo,
      levels,
      campScores,
      updatedAt,
    }),
  })

  if (response.status === 409) {
    const body = await response.json().catch(() => ({}))
    return { stale: true, progress: body.progress ?? null }
  }

  if (!response.ok) {
    throw new Error(`Save progress failed (${response.status})`)
  }

  return { stale: false, progress: null }
}

export async function deletePlayProgress({ comboTheme, token, playNo }) {
  const url = new URL(buildProgressUrl(), window.location.origin)
  url.searchParams.set('token', token)
  url.searchParams.set('play_no', playNo)
  if (comboTheme) {
    url.searchParams.set('combo_theme', comboTheme)
  }

  const response = await fetch(url, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Delete progress failed (${response.status})`)
  }
}
