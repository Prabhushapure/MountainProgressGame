import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.PROGRESS_DATA_DIR || path.join(__dirname, 'data')
const PORT = Number(process.env.PORT) || 3001

const app = express()
app.use(express.json({ limit: '32kb' }))

const ensureDataDir = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

const sanitizeSegment = (value, fallback = 'default') => {
  const safe = String(value ?? fallback).replace(/[^a-zA-Z0-9._-]/g, '_')
  return safe || fallback
}

const getFilePath = (comboTheme, token, playNo) => {
  const safeTheme = sanitizeSegment(comboTheme, 'fire-shield-combo')
  const safeToken = sanitizeSegment(token)
  const safePlayNo = sanitizeSegment(playNo)
  return path.join(DATA_DIR, `${safeTheme}__${safeToken}__${safePlayNo}.json`)
}

const readProgress = async (comboTheme, token, playNo) => {
  try {
    const raw = await fs.readFile(getFilePath(comboTheme, token, playNo), 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

const writeProgress = async (comboTheme, token, playNo, payload) => {
  await ensureDataDir()
  await fs.writeFile(
    getFilePath(comboTheme, token, playNo),
    JSON.stringify(payload, null, 2),
    'utf8',
  )
}

const deleteProgress = async (comboTheme, token, playNo) => {
  try {
    await fs.unlink(getFilePath(comboTheme, token, playNo))
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return
    }
    throw err
  }
}

const isValidLevels = (levels) =>
  Array.isArray(levels) &&
  levels.length >= 1 &&
  levels.length <= 12 &&
  levels.every((entry) => entry && ['active', 'locked', 'completed'].includes(entry.status))

app.get('/api/play/progress', async (req, res) => {
  try {
    const comboTheme = req.query.combo_theme?.trim()
    const token = req.query.token?.trim()
    const playNo = req.query.play_no?.trim()
    if (!token || !playNo) {
      return res.status(400).json({ error: 'token and play_no are required' })
    }

    const progress = await readProgress(comboTheme, token, playNo)
    if (!progress) {
      return res.status(404).json({ error: 'not found' })
    }

    return res.json(progress)
  } catch (err) {
    console.error('GET /api/play/progress failed:', err)
    return res.status(500).json({ error: 'internal error' })
  }
})

app.post('/api/play/progress', async (req, res) => {
  try {
    const comboTheme = req.body?.combo_theme?.trim()
    const token = req.body?.token?.trim()
    const playNo = req.body?.play_no?.trim()
    const levels = req.body?.levels
    const campScores = req.body?.campScores
    const updatedAt = req.body?.updatedAt

    if (!token || !playNo || !isValidLevels(levels) || !updatedAt) {
      return res.status(400).json({ error: 'invalid payload' })
    }

    const existing = await readProgress(comboTheme, token, playNo)
    if (existing?.updatedAt && new Date(updatedAt) < new Date(existing.updatedAt)) {
      return res.status(409).json({ error: 'stale progress', progress: existing })
    }

    const payload = {
      levels,
      ...(campScores && typeof campScores === 'object' ? { campScores } : {}),
      updatedAt,
    }

    await writeProgress(comboTheme, token, playNo, payload)
    return res.json({ ok: true })
  } catch (err) {
    console.error('POST /api/play/progress failed:', err)
    return res.status(500).json({ error: 'internal error' })
  }
})

app.delete('/api/play/progress', async (req, res) => {
  try {
    const comboTheme = req.query.combo_theme?.trim()
    const token = req.query.token?.trim()
    const playNo = req.query.play_no?.trim()
    if (!token || !playNo) {
      return res.status(400).json({ error: 'token and play_no are required' })
    }

    await deleteProgress(comboTheme, token, playNo)
    return res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/play/progress failed:', err)
    return res.status(500).json({ error: 'internal error' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

await ensureDataDir()
app.listen(PORT, () => {
  console.log(`Mountain progress API listening on http://127.0.0.1:${PORT}`)
})
