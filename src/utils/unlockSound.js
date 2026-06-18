let audioContext = null

export function playUnlockSound() {
  if (typeof window === 'undefined') return

  try {
    audioContext ??= new window.AudioContext()
    const ctx = audioContext
    const start = ctx.currentTime

    const playTone = (frequency, offset, duration, volume = 0.12) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(frequency, start + offset)
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(volume, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + duration + 0.05)
    }

    playTone(740, 0, 0.12, 0.1)
    playTone(988, 0.1, 0.18, 0.14)
    playTone(1318, 0.2, 0.22, 0.1)
  } catch {
    // Ignore if audio is blocked or unavailable.
  }
}
