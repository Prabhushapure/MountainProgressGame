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

const getFilePath = (token, playNo) => {
  const safeToken = String(token).replace(/[^a-zA-Z0-9._-]/g, '_')
  const safePlayNo = String(playNo).replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(DATA_DIR, `${safeToken}__${safePlayNo}.json`)
}

const readProgress = async (token, playNo) => {
  try {
    const raw = await fs.readFile(getFilePath(token, playNo), 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

const writeProgress = async (token, playNo, payload) => {
  await ensureDataDir()
  await fs.writeFile(getFilePath(token, playNo), JSON.stringify(payload, null, 2), 'utf8')
}

const deleteProgress = async (token, playNo) => {
  try {
    await fs.unlink(getFilePath(token, playNo))
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return
    }
    throw err
  }
}

const isValidLevels = (levels) =>
  Array.isArray(levels) &&
  levels.length === 4 &&
  levels.every((entry) => entry && ['active', 'locked', 'completed'].includes(entry.status))

app.get('/api/play/progress', async (req, res) => {
  try {
    const token = req.query.token?.trim()
    const playNo = req.query.play_no?.trim()
    if (!token || !playNo) {
      return res.status(400).json({ error: 'token and play_no are required' })
    }

    const progress = await readProgress(token, playNo)
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
    const token = req.body?.token?.trim()
    const playNo = req.body?.play_no?.trim()
    const levels = req.body?.levels
    const campScores = req.body?.campScores
    const updatedAt = req.body?.updatedAt

    if (!token || !playNo || !isValidLevels(levels) || !updatedAt) {
      return res.status(400).json({ error: 'invalid payload' })
    }

    const existing = await readProgress(token, playNo)
    if (existing?.updatedAt && new Date(updatedAt) < new Date(existing.updatedAt)) {
      return res.status(409).json({ error: 'stale progress', progress: existing })
    }

    const payload = {
      levels,
      ...(campScores && typeof campScores === 'object' ? { campScores } : {}),
      updatedAt,
    }

    await writeProgress(token, playNo, payload)
    return res.json({ ok: true })
  } catch (err) {
    console.error('POST /api/play/progress failed:', err)
    return res.status(500).json({ error: 'internal error' })
  }
})

app.delete('/api/play/progress', async (req, res) => {
  try {
    const token = req.query.token?.trim()
    const playNo = req.query.play_no?.trim()
    if (!token || !playNo) {
      return res.status(400).json({ error: 'token and play_no are required' })
    }

    await deleteProgress(token, playNo)
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
