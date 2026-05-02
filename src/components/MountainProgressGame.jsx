import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicUrl } from '../utils/publicUrl'
import './MountainProgressGame.css'

const STORAGE_KEY = 'mountainProgressGameLevels'
const CAMP2_EXTERNAL_URL =
  'https://antiz-digital.com/snake/?topic=Fire%20Safety'
const CAMP3_EXTERNAL_URL = 'https://antiz-digital.com/fire-shield/'

const positions = [
  { top: '95%', left: '60%' },
  { top: '68%', left: '52%' },
  { top: '50%', left: '65%' },
  { top: '30%', left: '50%' },
]

const summitPosition = { top: '15%', left: '50%' }
const MAP_SCALE_X = 0.95
const MAP_SCALE_Y = 0.95

const remapPointToMountain = (point) => {
  const left = parseFloat(point.left)
  const top = parseFloat(point.top)

  return {
    left: `${50 + (left - 50) * MAP_SCALE_X}%`,
    top: `${top * MAP_SCALE_Y}%`,
  }
}

const defaultLevels = [
  { id: 1, title: 'Camp 1', status: 'active', url: '/learn-video' },
  { id: 2, title: 'Camp 2', status: 'locked', url: CAMP2_EXTERNAL_URL },
  { id: 3, title: 'Camp 3', status: 'locked', url: CAMP3_EXTERNAL_URL },
  { id: 4, title: 'Camp 4', status: 'locked', url: '/evacuation' },
]

const campSubtitleById = {
  1: 'Learn Video',
  2: 'Snake & Ladder',
  3: 'Fire Shield',
  4: 'Building Evacuation',
}

const tentImageByStatus = {
  active: publicUrl('assets/tent-yellow.png'),
  locked: publicUrl('assets/tent-red.png'),
  completed: publicUrl('assets/tent-green.png'),
}

function MountainProgressGame() {
  const navigate = useNavigate()

  const [levels, setLevels] = useState(() => {
    const storedLevels = localStorage.getItem(STORAGE_KEY)
    if (!storedLevels) return defaultLevels

    try {
      const parsed = JSON.parse(storedLevels)
      if (Array.isArray(parsed) && parsed.length === defaultLevels.length) {
        return parsed.map((savedLevel, index) => ({
          ...defaultLevels[index],
          status: savedLevel.status ?? defaultLevels[index].status,
        }))
      }
    } catch (error) {
      console.error('Failed to parse level state:', error)
    }

    return defaultLevels
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
  }, [levels])

  const activeIndex = useMemo(
    () => levels.findIndex((level) => level.status === 'active'),
    [levels],
  )

  const mappedPositions = useMemo(
    () => positions.map(remapPointToMountain),
    [],
  )
  const mappedSummitPosition = useMemo(
    () => remapPointToMountain(summitPosition),
    [],
  )

  const playerPosition =
    activeIndex >= 0 ? mappedPositions[activeIndex] : mappedPositions[0]

  const handleTentClick = (level) => {
    if (level.status === 'locked') return
    if (/^https?:\/\//.test(level.url)) {
      window.location.assign(level.url)
      return
    }
    navigate(level.url)
  }

  const completeLevel = () => {
    setLevels((prevLevels) => {
      const currentActiveIndex = prevLevels.findIndex(
        (level) => level.status === 'active',
      )
      if (currentActiveIndex === -1) return prevLevels

      const nextLevels = prevLevels.map((l) => ({ ...l }))
      nextLevels[currentActiveIndex].status = 'completed'

      const nextIndex = currentActiveIndex + 1
      if (nextIndex < nextLevels.length) {
        nextLevels[nextIndex].status = 'active'
      }

      return nextLevels
    })
  }

  const resetProgress = () => {
    localStorage.removeItem(STORAGE_KEY)
    setLevels(defaultLevels)
  }

  return (
    <div
      className="mountain-map"
      style={{
        backgroundImage: `url(${publicUrl('assets/mountain.png')})`,
      }}
    >
      <div className="hud-title">
        <h2>COMBO GAME</h2>
        <p>Fire Safety & Immediate Response</p>
      </div>

      {/* 🔥 PATH LINES */}
      <svg className="path-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {mappedPositions.map((pos, index) => {
          if (index === mappedPositions.length - 1) return null

          const next = mappedPositions[index + 1]
          const startX = parseFloat(pos.left)
          const startY = parseFloat(pos.top) + 2
          const endX = parseFloat(next.left)
          const endY = parseFloat(next.top) + 2
          const segmentOffset =
            index === 1 ? 6 : index % 2 === 0 ? 4 : -4
          const controlX = (startX + endX) / 2 + segmentOffset
          const controlY = (startY + endY) / 2
          const curvePath =
            index === 2
              ? `M ${startX} ${startY} C ${startX + 18} ${startY - 8} ${endX + 18} ${endY + 8} ${endX} ${endY}`
              : `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`

          return (
            <path
              key={index}
              d={curvePath}
              fill="none"
              className={`path-line ${
                index < activeIndex ? 'completed' : ''
              }`}
            />
          )
        })}
      </svg>

      {/* 🎯 TENTS */}
      {levels.map((level, index) => (
        <div
          key={level.id}
          className="tent-node"
          style={{
            top: mappedPositions[index].top,
            left: mappedPositions[index].left,
          }}
        >
          <button
            type="button"
            className={`tent-button status-${level.status}`}
            onClick={() => handleTentClick(level)}
            disabled={level.status === 'locked'}
          >
            <img
              src={tentImageByStatus[level.status]}
              alt={level.title}
              className="tent-image"
            />
          </button>

          <div className={`camp-label status-${level.status}`}>
            <span className="camp-label-title">{level.title}</span>
            <span className="camp-label-subtitle">
              {campSubtitleById[level.id] ?? 'Training Module'}
            </span>
          </div>
        </div>
      ))}

      {/* 🧗 PLAYER */}
      {activeIndex > 0 && (
        <div
          className="player-indicator"
          style={{
            top: playerPosition.top,
            left: playerPosition.left,
          }}
        >
          🧗
        </div>
      )}

      {/* 🏁 SUMMIT */}
      <div
        className="summit-node"
        style={{
          top: mappedSummitPosition.top,
          left: mappedSummitPosition.left,
        }}
      >
        <span className="summit-flag">🏁</span>
        <span className="summit-text">Summit</span>
      </div>

      {/* 🎮 CONTROLS */}
      <div className="map-controls">
        <button
          type="button"
          className="complete-level-btn"
          onClick={completeLevel}
        >
          Complete Level
        </button>

        <button
          type="button"
          className="complete-level-btn complete-level-btn--secondary"
          onClick={resetProgress}
        >
          Reset Color
        </button>
      </div>
    </div>
  )
}

export default MountainProgressGame