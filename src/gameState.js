export function getDefaultStats() {
  return {
    played: 0,
    won: 0,
    streak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  }
}

function getYesterdayDateString(todayKey) {
  return new Date(new Date(todayKey + 'T00:00:00').getTime() - 86400000)
    .toLocaleDateString('en-CA')
}

export function buildTodayGameState(existingTodayGame, { todayKey, cluesRevealed, clueResults, gameStatus, wrongGuesses = [] }) {
  const isSameDay = existingTodayGame?.date === todayKey

  return {
    ...(isSameDay ? existingTodayGame : {}),
    date: todayKey,
    cluesRevealed,
    clueResults,
    wrongGuesses,
    status: gameStatus,
    statsRecorded: isSameDay ? existingTodayGame?.statsRecorded === true : false,
  }
}

export function recordCompletedGame(state, { gameStatus, clueResults, todayKey }) {
  if (gameStatus === 'playing') return state
  if (state.todayGame?.statsRecorded) return state

  const stats = state.stats || getDefaultStats()
  stats.played++

  if (gameStatus === 'won') {
    stats.won++
    stats.distribution[clueResults.length] = (stats.distribution[clueResults.length] || 0) + 1

    const prevDate = state.lastPlayed
    const yesterday = getYesterdayDateString(todayKey)

    if (prevDate === yesterday) {
      stats.streak++
    } else if (prevDate !== todayKey) {
      stats.streak = 1
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.streak)
  } else {
    stats.streak = 0
  }

  return {
    ...state,
    stats,
    lastPlayed: todayKey,
    todayGame: {
      ...state.todayGame,
      statsRecorded: true,
    },
  }
}
