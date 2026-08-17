import { chemicalComboTheme } from './chemicalCombo'
import { factorySafetyComboTheme } from './factorySafetyCombo'
import { fireShieldMountain5CampTheme } from './fireShieldMountain5Camp'
import { fireShieldMountainTheme } from './fireShieldMountain'
import { materialHandlingComboTheme } from './materialHandlingCombo'
import { ppeComboTheme } from './ppeCombo'
import { workingAtHeightComboTheme } from './workingAtHeightCombo'

/**
 * @typedef {object} ComboThemeLevel
 * @property {number} id
 * @property {string} title
 * @property {string} activityLabel
 * @property {'active' | 'locked' | 'completed'} status
 * @property {string} [characterIcon]
 * @property {string} [stepBackground]
 * @property {string} [icon]
 * @property {string} url
 * @property {number} maxPoints
 */

/**
 * @typedef {object} ComboTheme
 * @property {string} id
 * @property {string} storagePrefix
 * @property {string} deployPath
 * @property {string} themeClass
 * @property {'mountain-map' | 'safety-basics-path' | 'chemical-safety-path'} layoutMode
 * @property {object} brand
 * @property {object} copy
 * @property {object} assets
 * @property {object} layout
 * @property {object} [scoring]
 * @property {ComboThemeLevel[]} levels
 * @property {object} urls
 */

const themes = {
  'fire-shield-combo': fireShieldMountainTheme,
  'fire-shield-combo-5': fireShieldMountain5CampTheme,
  Factory_safety_combo: factorySafetyComboTheme,
  PPE_Combo: ppeComboTheme,
  chemical_combo: chemicalComboTheme,
  working_at_height_combo: workingAtHeightComboTheme,
  material_handling_combo: materialHandlingComboTheme,
}

const DEFAULT_THEME_ID = 'fire-shield-combo'

export function getThemeById(themeId) {
  return themes[themeId] ?? null
}

export function getActiveTheme() {
  const themeId = import.meta.env.VITE_COMBO_THEME || DEFAULT_THEME_ID
  const theme = themes[themeId]
  if (!theme) {
    throw new Error(`Unknown combo theme: ${themeId}`)
  }
  return theme
}

export function getActiveThemeId() {
  return import.meta.env.VITE_COMBO_THEME || DEFAULT_THEME_ID
}

export {
  chemicalComboTheme,
  factorySafetyComboTheme,
  fireShieldMountain5CampTheme,
  fireShieldMountainTheme,
  materialHandlingComboTheme,
  ppeComboTheme,
  workingAtHeightComboTheme,
}
