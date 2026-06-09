import { useEffect, useRef, useState } from 'react'
import { publicUrl } from '../utils/publicUrl'
import './FactorySafetyProgress.css'

const PATH_CURVE = {
  start: { x: 15, y: 84 },
  control: { x: 50, y: 80 },
  end: { x: 94, y: 14 },
}

const ARROW_T_VALUES = [0.1, 0.3, 0.5, 0.7, 0.9]

function quadraticPoint(p0, p1, p2, t) {
  const mt = 1 - t
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  }
}

function quadraticTangent(p0, p1, p2, t) {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  }
}

function ArrowConnector({ left, top, angle }) {
  return (
    <div
      className="factory-safety-connector"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
      }}
      aria-hidden="true"
    />
  )
}

function FactorySafetyMapView({ theme, levels, onLevelClick, onExitClick }) {
  const positions = theme.layout.positions
  const stageRef = useRef(null)
  const [stageAspect, setStageAspect] = useState(1.5)
  const backgroundStyle = theme.assets.map
    ? { '--factory-bg-url': `url(${publicUrl(theme.assets.map)})` }
    : undefined

  const { start, control, end } = PATH_CURVE
  const arrows = ARROW_T_VALUES.map((t) => {
    const point = quadraticPoint(start, control, end, t)
    const tangent = quadraticTangent(start, control, end, t)
    const angle =
      (Math.atan2(tangent.y, tangent.x * stageAspect) * 180) / Math.PI
    return { t, ...point, angle }
  })

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const updateAspect = () => {
      if (stage.offsetWidth > 0 && stage.offsetHeight > 0) {
        setStageAspect(stage.offsetWidth / stage.offsetHeight)
      }
    }

    updateAspect()
    const observer = new ResizeObserver(updateAspect)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`factory-safety-map ${theme.themeClass}`}
      style={backgroundStyle}
    >
      <button type="button" className="factory-safety-exit-button" onClick={onExitClick}>
        Exit
      </button>

      <h1 className="factory-safety-title">{theme.brand.pageTitle}</h1>

      {theme.assets.mascot ? (
        <img
          src={`${publicUrl(theme.assets.mascot)}?v=5`}
          alt=""
          className="factory-safety-mascot"
          width={576}
          height={1024}
          draggable={false}
        />
      ) : null}

      <div className="factory-safety-stage" ref={stageRef}>
        <svg
          className="factory-safety-path-curve"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 15 84 Q 50 80 94 14"
            fill="none"
            stroke="rgba(200, 210, 220, 0.55)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {arrows.map((arrow) => (
          <ArrowConnector
            key={arrow.t}
            left={arrow.x}
            top={arrow.y}
            angle={arrow.angle}
          />
        ))}

        {levels.map((level, index) => {
          const position = positions[index]
          if (!position) return null
          const iconUrl = publicUrl(level.icon ?? theme.assets.markerActive)

          return (
            <div
              key={level.id}
              className="factory-safety-node"
              style={{ top: position.top, left: position.left }}
            >
              <button
                type="button"
                className={`factory-safety-node-button status-${level.status}`}
                onClick={() => onLevelClick(level)}
                disabled={level.status === 'locked'}
                aria-label={level.activityLabel}
              >
                <span className={`factory-safety-node-ring status-${level.status}`}>
                  <img
                    src={iconUrl}
                    alt=""
                    className="factory-safety-node-icon"
                    draggable={false}
                  />
                </span>
              </button>
              <p className="factory-safety-node-label">{level.activityLabel}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FactorySafetyMapView
