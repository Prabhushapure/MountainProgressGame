import { publicUrl } from '../utils/publicUrl'
import './ChemicalSafetyMapView.css'

function CertificateIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 80"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="10" y="6" width="44" height="54" rx="3" fill="#fff" stroke="#111" strokeWidth="2.5" />
      <rect x="18" y="16" width="28" height="3" rx="1.5" fill="#64748b" />
      <rect x="18" y="24" width="24" height="3" rx="1.5" fill="#64748b" />
      <rect x="18" y="32" width="20" height="3" rx="1.5" fill="#64748b" />
      <circle cx="42" cy="54" r="13" fill="#f59e0b" stroke="#111" strokeWidth="2" />
      <circle cx="42" cy="54" r="7.5" fill="#fde68a" />
      <circle cx="54" cy="62" r="11" fill="#22c55e" stroke="#111" strokeWidth="2" />
      <path
        d="M49 62.5 L52.2 65.8 L59 58.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChemicalSafetyMapView({
  theme,
  levels,
  pendingLevelId,
  onLevelClick,
  onExitClick,
  onHelpClick,
  allModulesComplete = false,
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

      <button type="button" className="chemical-safety-document-pill" onClick={onHelpClick}>
        {documentLabel}
      </button>

      <div className="chemical-safety-header">
        <h1 className="chemical-safety-title">
          <span className="chemical-safety-title-accent">{theme.brand.instructionTitleAccent}</span>{' '}
          <span className="chemical-safety-title-rest">{theme.brand.instructionTitleRest}</span>
        </h1>
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
              {isActive || isCompleted || isLocked ? (
                <span
                  className={[
                    'chemical-safety-chevron-glow',
                    isActive ? 'chemical-safety-chevron-glow--active' : '',
                    isCompleted ? 'chemical-safety-chevron-glow--completed' : '',
                    isLocked ? 'chemical-safety-chevron-glow--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                className={[
                  'chemical-safety-chevron',
                  `status-${level.status}`,
                  isPending ? 'chemical-safety-chevron--pending' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--chevron-color': level.chevronColor || '#156082' }}
                onClick={() => onLevelClick(level)}
                disabled={disabled}
                aria-label={String(level.activityLabel).replace('\n', ' ')}
              >
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
              </button>
            </div>
          )
        })}

        <div
          className={[
            'chemical-safety-certificate',
            allModulesComplete ? 'chemical-safety-certificate--earned' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden={!allModulesComplete}
        >
          <CertificateIcon className="chemical-safety-certificate-icon" />
        </div>
      </div>
    </div>
  )
}

export default ChemicalSafetyMapView
