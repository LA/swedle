import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getDefaultStats, buildTodayGameState, recordCompletedGame } from './gameState'
import './App.css'

const TOTAL_CLUES = 6
const LAUNCH_DATE = '2026-04-05'

function getPSTDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
}

function getDayNumber() {
  const launch = new Date(LAUNCH_DATE + 'T00:00:00')
  const today = new Date(getPSTDateString() + 'T00:00:00')
  return Math.floor((today - launch) / (1000 * 60 * 60 * 24))
}

function getTimeUntilMidnightPST() {
  const now = new Date()
  const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const midnight = new Date(pstNow)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  return midnight - pstNow
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem('swedle-state')) || {}
  } catch {
    return {}
  }
}

function saveState(state) {
  localStorage.setItem('swedle-state', JSON.stringify(state))
}

function generateShareText(dayNum, clueResults, won) {
  const usedClues = clueResults.length
  const blocks = []
  for (let i = 0; i < TOTAL_CLUES; i++) {
    if (i < clueResults.length) {
      if (clueResults[i] === 'correct') blocks.push('\u{1F7E9}')
      else blocks.push('\u{1F7E5}')
    } else {
      blocks.push('\u2B1C')
    }
  }
  const score = won ? `${usedClues}/${TOTAL_CLUES}` : `X/${TOTAL_CLUES}`
  return `Swedle #${dayNum + 1} \u2014 ${score} clues\n${blocks.join('')}\nswedle.com`
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export default function App() {
  const [puzzles, setPuzzles] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [cluesRevealed, setCluesRevealed] = useState(1)
  const [clueResults, setClueResults] = useState([])
  const [gameStatus, setGameStatus] = useState('playing') // playing | won | lost
  const [guess, setGuess] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1)
  const [inputError, setInputError] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(getTimeUntilMidnightPST())
  const [newClueIndex, setNewClueIndex] = useState(-1)
  const [stats, setStats] = useState(() => loadState().stats || getDefaultStats())

  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)

  const dayNumber = getDayNumber()

  // Load puzzles
  useEffect(() => {
    fetch('./puzzles.json')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load puzzles')
        return r.json()
      })
      .then(data => {
        setPuzzles(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const puzzle = useMemo(() => {
    if (!puzzles) return null
    const index = ((dayNumber % puzzles.length) + puzzles.length) % puzzles.length
    return puzzles[index]
  }, [puzzles, dayNumber])

  const allAnswers = useMemo(() => {
    if (!puzzles) return []
    return puzzles.map(p => p.answer)
  }, [puzzles])

  // Load saved game state
  useEffect(() => {
    if (!puzzle) return
    const state = loadState()
    const todayKey = getPSTDateString()

    if (state.todayGame?.date === todayKey) {
      setCluesRevealed(state.todayGame.cluesRevealed)
      setClueResults(state.todayGame.clueResults)
      setGameStatus(state.todayGame.status)
    } else {
      setCluesRevealed(1)
      setClueResults([])
      setGameStatus('playing')

      // Check if we need to show how-to for first time
      if (!state.stats) {
        setShowHowTo(true)
      }
    }

    setStats(state.stats || getDefaultStats())
  }, [puzzle])

  // Persist game state
  useEffect(() => {
    if (!puzzle || gameStatus === 'playing' && clueResults.length === 0) return
    const state = loadState()
    const todayKey = getPSTDateString()

    state.todayGame = buildTodayGameState(state.todayGame, {
      todayKey,
      cluesRevealed,
      clueResults,
      gameStatus,
    })
    saveState(state)
  }, [cluesRevealed, clueResults, gameStatus, puzzle])

  // Update stats when game ends
  useEffect(() => {
    if (gameStatus === 'playing' || !puzzle) return
    const nextState = recordCompletedGame(loadState(), {
      gameStatus,
      clueResults,
      todayKey: getPSTDateString(),
    })

    if (!nextState.todayGame?.statsRecorded) return

    saveState(nextState)
    setStats({ ...nextState.stats, distribution: { ...nextState.stats.distribution } })
  }, [gameStatus, puzzle, clueResults])

  // Countdown timer
  useEffect(() => {
    if (gameStatus === 'playing') return
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnightPST())
    }, 1000)
    return () => clearInterval(interval)
  }, [gameStatus])

  // Close autocomplete on outside click
  useEffect(() => {
    function handleClick(e) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredAnswers = useMemo(() => {
    if (!guess.trim() || !allAnswers.length) return []
    const q = normalize(guess)
    if (!q) return []
    return allAnswers
      .filter(a => normalize(a).includes(q))
      .slice(0, 8)
  }, [guess, allAnswers])

  const handleGuess = useCallback(() => {
    if (gameStatus !== 'playing' || !puzzle) return
    const trimmed = guess.trim()
    if (!trimmed) return

    const isCorrect = normalize(trimmed) === normalize(puzzle.answer)
    const isValidAnswer = allAnswers.some(a => normalize(a) === normalize(trimmed))

    if (!isValidAnswer) {
      setInputError(true)
      setTimeout(() => setInputError(false), 400)
      return
    }

    if (isCorrect) {
      setClueResults(prev => [...prev, 'correct'])
      setGameStatus('won')
      setGuess('')
      setShowAutocomplete(false)
    } else {
      setClueResults(prev => [...prev, 'wrong'])
      setGuess('')
      setShowAutocomplete(false)

      if (cluesRevealed >= TOTAL_CLUES) {
        setGameStatus('lost')
      } else {
        setNewClueIndex(cluesRevealed)
        setCluesRevealed(prev => prev + 1)
        setTimeout(() => setNewClueIndex(-1), 500)
      }
    }
  }, [guess, puzzle, gameStatus, cluesRevealed, allAnswers])

  const handleSkip = useCallback(() => {
    if (gameStatus !== 'playing' || !puzzle) return

    setClueResults(prev => [...prev, 'skip'])

    if (cluesRevealed >= TOTAL_CLUES) {
      setGameStatus('lost')
    } else {
      setNewClueIndex(cluesRevealed)
      setCluesRevealed(prev => prev + 1)
      setTimeout(() => setNewClueIndex(-1), 500)
    }
  }, [gameStatus, cluesRevealed, puzzle])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      if (showAutocomplete && autocompleteIndex >= 0 && filteredAnswers[autocompleteIndex]) {
        e.preventDefault()
        setGuess(filteredAnswers[autocompleteIndex])
        setShowAutocomplete(false)
        setAutocompleteIndex(-1)
      } else {
        handleGuess()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIndex(prev => Math.min(prev + 1, filteredAnswers.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
    }
  }, [showAutocomplete, autocompleteIndex, filteredAnswers, handleGuess])

  const handleShare = useCallback(async () => {
    const text = generateShareText(dayNumber, clueResults, gameStatus === 'won')

    try {
      if (navigator.share && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await navigator.share({
          title: `Swedle #${dayNumber + 1}`,
          text,
        })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        throw new Error('Clipboard API unavailable')
      }

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [dayNumber, clueResults, gameStatus])

  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0
  const maxDist = Math.max(1, ...Object.values(stats.distribution))

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner" />
          <div className="loading-text">Loading puzzles...</div>
        </div>
      </div>
    )
  }

  if (error || !puzzle) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-text">Failed to load puzzles. Please refresh.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">swedle</div>
          <span className="puzzle-number">#{dayNumber + 1}</span>
        </div>
        <div className="header-right">
          {stats.streak > 0 && (
            <div className="streak-badge">
              <span>{'\u{1F525}'}</span>
              <span>{stats.streak}</span>
            </div>
          )}
          <button className="icon-btn" onClick={() => setShowHowTo(true)} title="How to play">?</button>
          <button className="icon-btn" onClick={() => setShowStats(true)} title="Statistics">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="10" width="4" height="7" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="7" y="5" width="4" height="12" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="13" y="1" width="4" height="16" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Game */}
      <main className="game">
        {/* Clues */}
        <div className="clues-container">
          {puzzle.clues.map((clue, i) => {
            if (i < cluesRevealed) {
              const result = clueResults[i]
              return (
                <div
                  key={i}
                  className={`clue-card ${result || ''} ${i === newClueIndex ? 'new' : ''}`}
                >
                  <div className="clue-header">
                    <div className="clue-number">{i + 1}</div>
                    <div className="clue-label">Clue {i + 1} of {TOTAL_CLUES}</div>
                  </div>
                  <div className="clue-text">{clue}</div>
                  {result === 'wrong' && (
                    <div className="guess-result wrong">
                      {'\u2717'} Wrong guess
                    </div>
                  )}
                  {result === 'skip' && (
                    <div className="guess-result skip">
                      {'\u2192'} Skipped
                    </div>
                  )}
                  {result === 'correct' && (
                    <div className="guess-result" style={{ color: 'var(--success)' }}>
                      {'\u2713'} Correct!
                    </div>
                  )}
                </div>
              )
            }

            // Show locked clue placeholders
            if (i === cluesRevealed && gameStatus === 'playing') return null // current clue area handled by input
            return (
              <div key={i} className="clue-card locked">
                <div className="clue-header">
                  <div className="clue-number">{i + 1}</div>
                </div>
                <div className="clue-text">Clue locked</div>
              </div>
            )
          })}
        </div>

        {/* Input area */}
        {gameStatus === 'playing' && (
          <div className="input-area">
            <div className="game-status">
              {cluesRevealed}/{TOTAL_CLUES} clues revealed {'\u2014'} guess the SWE problem
            </div>
            <div style={{ height: 12 }} />
            <div className="guess-row">
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={inputRef}
                  className={`guess-input ${inputError ? 'error' : ''}`}
                  type="text"
                  value={guess}
                  onChange={(e) => {
                    setGuess(e.target.value)
                    setShowAutocomplete(true)
                    setAutocompleteIndex(-1)
                  }}
                  onFocus={() => guess.trim() && setShowAutocomplete(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your diagnosis..."
                  autoComplete="off"
                  spellCheck="false"
                />
                {showAutocomplete && filteredAnswers.length > 0 && (
                  <div className="autocomplete" ref={autocompleteRef}>
                    {filteredAnswers.map((a, i) => (
                      <div
                        key={a}
                        className={`autocomplete-item ${i === autocompleteIndex ? 'active' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setGuess(a)
                          setShowAutocomplete(false)
                          setAutocompleteIndex(-1)
                          inputRef.current?.focus()
                        }}
                      >
                        <span className="answer-name">{a}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleGuess}
                disabled={!guess.trim()}
              >
                Guess
              </button>
              <button className="btn btn-skip" onClick={handleSkip}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {gameStatus !== 'playing' && (
          <div className={`result ${gameStatus}`}>
            <div className="result-icon">
              {gameStatus === 'won' ? '\u{1F3AF}' : '\u{1F4A1}'}
            </div>
            <div className="result-title">
              {gameStatus === 'won' ? 'Diagnosed!' : 'Not this time'}
            </div>
            <div className="result-answer">{puzzle.answer}</div>
            <div className="result-explanation">{puzzle.explanation}</div>
            <div className="result-score">
              {gameStatus === 'won'
                ? `Solved in ${clueResults.length}/${TOTAL_CLUES} clues`
                : `${TOTAL_CLUES}/${TOTAL_CLUES} clues used`}
            </div>
            <div className="result-blocks">
              {Array.from({ length: TOTAL_CLUES }, (_, i) => {
                if (i < clueResults.length) {
                  return clueResults[i] === 'correct' ? '\u{1F7E9}' : '\u{1F7E5}'
                }
                return '\u2B1C'
              }).join(' ')}
            </div>
            <div className="result-actions">
              <button className="btn btn-share" onClick={handleShare}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51 15.42 17.49" />
                  <path d="M15.41 6.51 8.59 10.49" />
                </svg>
                Share Result
              </button>
              <button className="btn btn-secondary" onClick={() => setShowStats(true)}>
                View Stats
              </button>
            </div>
            <div className="countdown">
              <div className="countdown-label">Next puzzle in</div>
              <div className="countdown-time">{formatTime(countdown)}</div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-credit">
          {'\u00A9'} <a href="https://adar.la" target="_blank" rel="noopener noreferrer">Adar Butel</a>
        </div>
      </footer>

      {/* Stats Modal */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowStats(false)}>{'\u2715'}</button>
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.played}</div>
                <div className="stat-label">Played</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{winPct}%</div>
                <div className="stat-label">Win %</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.streak}</div>
                <div className="stat-label">Streak</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.maxStreak}</div>
                <div className="stat-label">Max Streak</div>
              </div>
            </div>
            <div className="distribution">
              <h3>Clue Distribution</h3>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="dist-row">
                  <div className="dist-label">{n}</div>
                  <div
                    className={`dist-bar ${gameStatus === 'won' && clueResults.length === n ? 'highlight' : ''}`}
                    style={{ width: `${Math.max(8, (stats.distribution[n] / maxDist) * 100)}%` }}
                  >
                    {stats.distribution[n] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowTo && (
        <div className="modal-overlay" onClick={() => setShowHowTo(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHowTo(false)}>{'\u2715'}</button>
            <h2>How to Play</h2>
            <div className="how-to-play">
              <p>
                Each day there's a new software engineering problem to diagnose.
                You'll receive up to 6 clues, starting vague and getting more specific.
              </p>
              <div className="example-clue">
                <strong>Clue 1:</strong> "A team notices their service response times have been gradually increasing..."
              </div>
              <p>
                After each clue, you can <strong>guess</strong> the problem or <strong>skip</strong> to
                reveal the next clue. Fewer clues = better score!
              </p>
              <div className="example-blocks">
                {'\u{1F7E5}'}{'\u{1F7E5}'}{'\u{1F7E9}'}{'\u2B1C'}{'\u2B1C'}{'\u2B1C'}
              </div>
              <table className="scoring-table">
                <tbody>
                  <tr><td>{'\u{1F7E9}'}</td><td>Correct guess on this clue</td></tr>
                  <tr><td>{'\u{1F7E5}'}</td><td>Wrong guess or skipped</td></tr>
                  <tr><td>{'\u2B1C'}</td><td>Unused clue</td></tr>
                </tbody>
              </table>
              <p>
                Problems are drawn from: the <strong>Google SRE Book</strong>, <strong>Martin
                Fowler's catalog</strong>, the <strong>12 Factor App</strong>,
                and <strong>Designing Data-Intensive Applications</strong>.
              </p>
              <p>A new puzzle appears every day at midnight PST.</p>
            </div>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && <div className="copied-toast">{'\u2713'} Copied to clipboard!</div>}
    </div>
  )
}
