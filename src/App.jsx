import { useState, useEffect, useRef, useCallback } from 'react'
import { playSound } from './utils/sound'
import './App.css'

function isPrime(num) {
  if (num <= 1 || !Number.isInteger(num)) return false
  if (num <= 3) return true
  if (num % 2 === 0 || num % 3 === 0) return false
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false
  }
  return true
}

function App() {
  const [count, setCount] = useState(0)
  const [step, setStep] = useState(1)
  const [customStepInput, setCustomStepInput] = useState('')
  const [animationClass, setAnimationClass] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('counter-theme') || 'dark'
  })

  // Limits
  const [useLimits, setUseLimits] = useState(false)
  const [minLimit, setMinLimit] = useState(-100)
  const [maxLimit, setMaxLimit] = useState(100)

  // Auto counter
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const [autoSpeed, setAutoSpeed] = useState(1000)
  const [autoDirection, setAutoDirection] = useState('up')

  // History & Statistics
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({
    clicks: 0,
    max: 0,
    min: 0,
  })

  // Synchronize theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('counter-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    playSound('click', isMuted)
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
    playSound('click', !isMuted)
  }

  // Trigger brief visual animation on value change
  const triggerAnimation = (type) => {
    setAnimationClass(type)
    setTimeout(() => {
      setAnimationClass('')
    }, 180)
  }

  // Record an action in history and update stats
  const logActivity = (type, label, prevVal, nextVal) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const entry = {
      id: Date.now() + Math.random(),
      type,
      label,
      prevVal,
      nextVal,
      time,
    }

    setHistory((prev) => [entry, ...prev.slice(0, 39)])
    setStats((prev) => ({
      clicks: prev.clicks + 1,
      max: Math.max(prev.max, nextVal),
      min: Math.min(prev.min, nextVal),
    }))
  }

  // Increment handler
  const handleIncrement = useCallback((customAmount) => {
    const amount = typeof customAmount === 'number' ? customAmount : step
    setCount((current) => {
      let next = current + amount
      if (useLimits && next > maxLimit) {
        playSound('limit', isMuted)
        return current
      }
      playSound('increment', isMuted)
      triggerAnimation('bump-up')
      logActivity('inc', `+${amount}`, current, next)
      return next
    })
  }, [step, useLimits, maxLimit, isMuted])

  // Decrement handler
  const handleDecrement = useCallback((customAmount) => {
    const amount = typeof customAmount === 'number' ? customAmount : step
    setCount((current) => {
      let next = current - amount
      if (useLimits && next < minLimit) {
        playSound('limit', isMuted)
        return current
      }
      playSound('decrement', isMuted)
      triggerAnimation('bump-down')
      logActivity('dec', `-${amount}`, current, next)
      return next
    })
  }, [step, useLimits, minLimit, isMuted])

  // Reset handler
  const handleReset = useCallback(() => {
    setCount((current) => {
      if (current === 0) return 0
      playSound('reset', isMuted)
      triggerAnimation('flash-reset')
      logActivity('reset', 'Reset to 0', current, 0)
      return 0
    })
  }, [isMuted])

  // Quick mathematical transforms
  const handleMultiply = (multiplier) => {
    setCount((current) => {
      const next = current * multiplier
      playSound('increment', isMuted)
      triggerAnimation('bump-up')
      logActivity('modify', `× ${multiplier}`, current, next)
      return next
    })
  }

  const handleDivide = (divisor) => {
    setCount((current) => {
      const next = Math.round(current / divisor)
      playSound('decrement', isMuted)
      triggerAnimation('bump-down')
      logActivity('modify', `÷ ${divisor}`, current, next)
      return next
    })
  }

  const handleInvert = () => {
    setCount((current) => {
      const next = -current
      playSound('click', isMuted)
      triggerAnimation(next >= 0 ? 'bump-up' : 'bump-down')
      logActivity('modify', '± Invert', current, next)
      return next
    })
  }

  const handleRandomize = () => {
    const randomVal = Math.floor(Math.random() * 101) - 50 // -50 to 50
    setCount((current) => {
      playSound('click', isMuted)
      triggerAnimation('bump-up')
      logActivity('modify', 'Randomize', current, randomVal)
      return randomVal
    })
  }

  // Auto-counter interval logic
  useEffect(() => {
    if (!isAutoRunning) return

    const intervalId = setInterval(() => {
      if (autoDirection === 'up') {
        handleIncrement()
      } else {
        handleDecrement()
      }
    }, autoSpeed)

    return () => clearInterval(intervalId)
  }, [isAutoRunning, autoSpeed, autoDirection, handleIncrement, handleDecrement])

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't interfere when typing inside inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleIncrement()
      } else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault()
        handleDecrement()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleReset()
      } else if (e.code === 'Space') {
        e.preventDefault()
        setIsAutoRunning((prev) => !prev)
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMute()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleIncrement, handleDecrement, handleReset, toggleMute])

  // Step Preset selection
  const stepPresets = [1, 5, 10, 25, 50, 100]

  const handleCustomStepChange = (e) => {
    const val = e.target.value
    setCustomStepInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num) && num > 0) {
      setStep(num)
    }
  }

  // Clear history
  const handleClearHistory = () => {
    setHistory([])
    playSound('click', isMuted)
  }

  return (
    <>
      {/* Dynamic atmospheric mesh background */}
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
        <div className="ambient-blob blob-3"></div>
      </div>

      <div className="app-container">
        {/* Navigation & Header */}
        <header className="app-header">
          <div className="brand-section">
            <div className="brand-icon">⚡</div>
            <div className="brand-text">
              <h1>
                Quantum Counter
                <span className="brand-badge">Vite + React</span>
              </h1>
              <p>Dynamic precision counter with interactive feedback</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleMute}
              title={isMuted ? 'Unmute Sound (M)' : 'Mute Sound (M)'}
              aria-label="Toggle Sound"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Main Interface Layout */}
        <main className="app-main">
          {/* Main Stage (Counter & Controls) */}
          <section className="glass-card counter-stage">
            <div className="display-wrapper">
              <span className={`count-value ${animationClass}`} id="counter-readout">
                {count}
              </span>

              {/* Status Badges */}
              <div className="badge-group">
                <span className={`chip ${count > 0 ? 'active-positive' : count < 0 ? 'active-negative' : ''}`}>
                  {count > 0 ? '● Positive' : count < 0 ? '● Negative' : '● Zero'}
                </span>
                <span className="chip">
                  {count % 2 === 0 ? 'Even' : 'Odd'}
                </span>
                {isPrime(count) && (
                  <span className="chip active-prime">
                    ★ Prime Number
                  </span>
                )}
                {useLimits && count >= maxLimit && (
                  <span className="chip active-prime">Max Limit</span>
                )}
                {useLimits && count <= minLimit && (
                  <span className="chip active-negative">Min Limit</span>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="controls-primary">
              <button
                type="button"
                id="decrement-btn"
                className="btn-counter btn-decrement"
                onClick={() => handleDecrement()}
                disabled={useLimits && count <= minLimit}
                title="Decrement (- or ↓)"
              >
                <span>−</span>
                <span className="btn-sub">{step}</span>
              </button>

              <button
                type="button"
                id="reset-btn"
                className="btn-reset-center"
                onClick={handleReset}
                title="Reset to 0 (R)"
              >
                ↺
              </button>

              <button
                type="button"
                id="increment-btn"
                className="btn-counter btn-increment"
                onClick={() => handleIncrement()}
                disabled={useLimits && count >= maxLimit}
                title="Increment (+ or ↑)"
              >
                <span>+</span>
                <span className="btn-sub">{step}</span>
              </button>
            </div>

            {/* Sub-panels: Step Selection & Quick Math */}
            <div className="sub-panel">
              {/* Step Presets */}
              <div className="control-row">
                <div className="row-label">
                  <span>Step Interval</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>Step: {step}</span>
                </div>
                <div className="step-chips">
                  {stepPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`step-chip ${step === preset && customStepInput === '' ? 'active' : ''}`}
                      onClick={() => {
                        setStep(preset)
                        setCustomStepInput('')
                        playSound('click', isMuted)
                      }}
                    >
                      +{preset}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    placeholder="Custom"
                    className="custom-step-input"
                    value={customStepInput}
                    onChange={handleCustomStepChange}
                    title="Enter custom step"
                  />
                </div>
              </div>

              {/* Quick Math Tools */}
              <div className="control-row">
                <div className="row-label">
                  <span>Math Operations</span>
                </div>
                <div className="quick-math-bar">
                  <button type="button" className="quick-math-btn" onClick={() => handleMultiply(2)}>
                    × 2
                  </button>
                  <button type="button" className="quick-math-btn" onClick={() => handleDivide(2)}>
                    ÷ 2
                  </button>
                  <button type="button" className="quick-math-btn" onClick={handleInvert}>
                    ± Invert
                  </button>
                  <button type="button" className="quick-math-btn" onClick={handleRandomize}>
                    🎲 Random
                  </button>
                </div>
              </div>

              {/* Automation Engine */}
              <div className="control-row">
                <div className="row-label">
                  <span>Auto-Pulse Engine</span>
                </div>
                <div className="auto-counter-bar">
                  <button
                    type="button"
                    className={`btn-toggle-auto ${isAutoRunning ? 'running' : ''}`}
                    onClick={() => {
                      setIsAutoRunning((prev) => !prev)
                      playSound('click', isMuted)
                    }}
                  >
                    <span className="pulse-dot"></span>
                    <span>{isAutoRunning ? 'Stop Pulse' : 'Start Auto'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      className="speed-select"
                      value={autoDirection}
                      onChange={(e) => setAutoDirection(e.target.value)}
                    >
                      <option value="up">Increment (+)</option>
                      <option value="down">Decrement (−)</option>
                    </select>

                    <select
                      className="speed-select"
                      value={autoSpeed}
                      onChange={(e) => setAutoSpeed(Number(e.target.value))}
                    >
                      <option value={2000}>2.0s</option>
                      <option value={1000}>1.0s</option>
                      <option value={500}>0.5s</option>
                      <option value={200}>0.2s</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Limits Configuration */}
              <div className="control-row">
                <div className="row-label">
                  <span>Boundary Guard</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    <input
                      type="checkbox"
                      checked={useLimits}
                      onChange={(e) => {
                        setUseLimits(e.target.checked)
                        playSound('click', isMuted)
                      }}
                    />
                    Enable Limits
                  </label>
                </div>
                {useLimits && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Min:
                      <input
                        type="number"
                        className="custom-step-input"
                        value={minLimit}
                        onChange={(e) => setMinLimit(Number(e.target.value))}
                        style={{ marginLeft: '6px', width: '70px' }}
                      />
                    </label>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Max:
                      <input
                        type="number"
                        className="custom-step-input"
                        value={maxLimit}
                        onChange={(e) => setMaxLimit(Number(e.target.value))}
                        style={{ marginLeft: '6px', width: '70px' }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right Sidebar: Statistics & Activity Timeline */}
          <aside className="sidebar-panel">
            {/* Live Stats */}
            <div className="glass-card">
              <div className="card-header-row">
                <span className="card-title">📊 Live Analytics</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Clicks</span>
                  <span className="stat-val">{stats.clicks}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Step Size</span>
                  <span className="stat-val">{step}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peak High</span>
                  <span className="stat-val" style={{ color: 'var(--accent-emerald)' }}>
                    {stats.max}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peak Low</span>
                  <span className="stat-val" style={{ color: 'var(--accent-rose)' }}>
                    {stats.min}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="glass-card">
              <div className="card-header-row">
                <span className="card-title">⏱ Activity Feed</span>
                {history.length > 0 && (
                  <button type="button" className="btn-clear" onClick={handleClearHistory}>
                    Clear
                  </button>
                )}
              </div>

              <div className="history-list">
                {history.length === 0 ? (
                  <div className="empty-history">
                    No operations recorded yet.<br />
                    Click + or − to start!
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className={`history-item ${item.type}`}>
                      <span className="history-action">{item.label}</span>
                      <div className="history-meta">
                        <span className="history-result">
                          {item.prevVal} → {item.nextVal}
                        </span>
                        <span className="history-time">{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </main>

        {/* Keyboard shortcuts helpful bar */}
        <footer className="shortcuts-footer">
          <span className="kbd-badge"><kbd>+</kbd> or <kbd>↑</kbd> Increment</span>
          <span className="kbd-badge"><kbd>−</kbd> or <kbd>↓</kbd> Decrement</span>
          <span className="kbd-badge"><kbd>R</kbd> Reset</span>
          <span className="kbd-badge"><kbd>Space</kbd> Auto-pulse</span>
          <span className="kbd-badge"><kbd>M</kbd> Mute Audio</span>
        </footer>
      </div>
    </>
  )
}

export default App
