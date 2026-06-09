import ComboProgressGame from './ComboProgressGame'
import { createProgressEngine } from '../progress/createProgressEngine'
import { getActiveTheme } from '../themes'

export function shouldSkipIntroScreens(searchParams) {
  const theme = getActiveTheme()
  const engine = createProgressEngine(theme)
  return engine.shouldSkipIntroScreens(searchParams)
}

export default ComboProgressGame
