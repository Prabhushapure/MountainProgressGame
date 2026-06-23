import { publicUrl } from '../utils/publicUrl'
import './FireShieldBrandHeader.css'
import './FactorySafetyBrandHeader.css'

export function FactorySafetyLogoMark({ iconSrc }) {
  return (
    <img
      className="brand-header-logo factory-brand-header-logo"
      src={publicUrl(iconSrc)}
      alt=""
      width={96}
      height={96}
      draggable={false}
    />
  )
}

export default function FactorySafetyBrandHeader({ iconSrc, children, className = '' }) {
  return (
    <div className={`brand-header factory-brand-header ${className}`.trim()}>
      <FactorySafetyLogoMark iconSrc={iconSrc} />
      <div className="brand-header-text">{children}</div>
    </div>
  )
}
