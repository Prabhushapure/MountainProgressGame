import logoIconUrl from '../assets/logo-icon.png'
import './FireShieldBrandHeader.css'

export function FireShieldLogoMark() {
  return (
    <img
      className="brand-header-logo"
      src={logoIconUrl}
      alt=""
      width={96}
      height={96}
      draggable={false}
    />
  )
}

export default function FireShieldBrandHeader({ children, className = '' }) {
  return (
    <div className={`brand-header ${className}`.trim()}>
      <FireShieldLogoMark />
      <div className="brand-header-text">{children}</div>
    </div>
  )
}
