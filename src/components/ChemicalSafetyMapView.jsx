import { publicUrl } from '../utils/publicUrl'
import './ChemicalSafetyMapView.css'

function ChemicalSafetyMapView({
  theme,
  levels,
  pendingLevelId,
  onLevelClick,
  onExitClick,
  onHelpClick,
}) {
  const skinUrl = publicUrl(theme.assets.map)
  const documentLabel = theme.copy.documentPillLabel || 'Safety Guideline Document'
  const isClickBlocked = pendingLevelId !== null

  return (
    <div
      className={`chemical-safety-map ${theme.themeClass}`}
      style={{ '--chemical-skin-url': `url(${skinUrl})` }}
    >
      <div className="chemical-safety-actions">
        <button type="button" className="chemical-safety-action-button" onClick={onExitClick}>
          Exit
        </button>
      </div>

      <div className="chemical-safety-header">
        <h1 className="chemical-safety-title">
          <span className="chemical-safety-title-accent">{theme.brand.instructionTitleAccent}</span>{' '}
          <span className="chemical-safety-title-rest">{theme.brand.instructionTitleRest}</span>
        </h1>
        <div className="chemical-safety-header-copy">
          {theme.brand.instructionTagline ? (
            <p className="chemical-safety-tagline">{theme.brand.instructionTagline}</p>
          ) : null}
          <button type="button" className="chemical-safety-document-pill" onClick={onHelpClick}>
            {documentLabel}
          </button>
        </div>
      </div>

      <div className="chemical-safety-path" role="navigation" aria-label="Chemical safety modules">
        {levels.map((level) => {
          const isLocked = level.status === 'locked'
          const isActive = level.status === 'active'
          const isCompleted = level.status === 'completed'
          const isPending = pendingLevelId === level.id
          const disabled = (isLocked && !isActive) || isClickBlocked

          return (
            <div
              key={level.id}
              className={[
                'chemical-safety-chevron-wrap',
                `status-${level.status}`,
                isActive ? 'chemical-safety-chevron-wrap--active' : '',
                isPending ? 'chemical-safety-chevron-wrap--pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className={[
                  'chemical-safety-chevron',
                  `status-${level.status}`,
                  isPending ? 'chemical-safety-chevron--pending' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onLevelClick(level)}
                disabled={disabled}
                aria-label={String(level.activityLabel).replace('\n', ' ')}
              >
                <svg
                  className="chemical-safety-chevron-shape"
                  viewBox="0 0 200 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    className="chemical-safety-chevron-shape-fill"
                    d="M28,4 H152 L194,50 L152,96 H28 C13,96 4,87 4,72 V28 C4,13 13,4 28,4 Z"
                  />
                </svg>
                <span className="chemical-safety-chevron-number" aria-hidden="true">
                  {level.id}
                </span>
                <span className="chemical-safety-chevron-label">
                  {String(level.activityLabel)
                    .split('\n')
                    .map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                </span>
                {isCompleted ? (
                  <span className="chemical-safety-chevron-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                <img
                  className={[
                    'chemical-safety-chevron-lock',
                    isLocked ? 'chemical-safety-chevron-lock--locked' : 'chemical-safety-chevron-lock--unlocked',
                  ].join(' ')}
                  src={publicUrl(isLocked ? theme.assets.iconLock : theme.assets.iconUnlock)}
                  alt=""
                  aria-hidden="true"
                  draggable="false"
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChemicalSafetyMapView
