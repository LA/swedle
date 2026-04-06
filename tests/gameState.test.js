import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayGameState, getDefaultStats, recordCompletedGame } from '../src/gameState.js'

test('buildTodayGameState preserves statsRecorded on same day', () => {
  const todayGame = buildTodayGameState(
    { date: '2026-04-06', statsRecorded: true, cluesRevealed: 3, clueResults: ['wrong'], status: 'playing' },
    { todayKey: '2026-04-06', cluesRevealed: 4, clueResults: ['wrong', 'skip'], gameStatus: 'playing' }
  )

  assert.equal(todayGame.statsRecorded, true)
  assert.equal(todayGame.cluesRevealed, 4)
  assert.deepEqual(todayGame.clueResults, ['wrong', 'skip'])
})

test('buildTodayGameState resets statsRecorded on a new day', () => {
  const todayGame = buildTodayGameState(
    { date: '2026-04-05', statsRecorded: true, cluesRevealed: 6, clueResults: ['correct'], status: 'won' },
    { todayKey: '2026-04-06', cluesRevealed: 1, clueResults: [], gameStatus: 'playing' }
  )

  assert.equal(todayGame.date, '2026-04-06')
  assert.equal(todayGame.statsRecorded, false)
  assert.equal(todayGame.cluesRevealed, 1)
  assert.deepEqual(todayGame.clueResults, [])
})

test('recordCompletedGame records a win, distribution, and streak', () => {
  const nextState = recordCompletedGame(
    {
      stats: {
        ...getDefaultStats(),
        played: 3,
        won: 2,
        streak: 2,
        maxStreak: 2,
        distribution: { 1: 0, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0 },
      },
      lastPlayed: '2026-04-05',
      todayGame: {
        date: '2026-04-06',
        statsRecorded: false,
      },
    },
    {
      gameStatus: 'won',
      clueResults: ['wrong', 'correct'],
      todayKey: '2026-04-06',
    }
  )

  assert.equal(nextState.stats.played, 4)
  assert.equal(nextState.stats.won, 3)
  assert.equal(nextState.stats.streak, 3)
  assert.equal(nextState.stats.maxStreak, 3)
  assert.equal(nextState.stats.distribution[2], 2)
  assert.equal(nextState.todayGame.statsRecorded, true)
})

test('recordCompletedGame records a loss and resets streak', () => {
  const nextState = recordCompletedGame(
    {
      stats: {
        ...getDefaultStats(),
        played: 5,
        won: 4,
        streak: 4,
        maxStreak: 4,
      },
      lastPlayed: '2026-04-05',
      todayGame: {
        date: '2026-04-06',
        statsRecorded: false,
      },
    },
    {
      gameStatus: 'lost',
      clueResults: ['wrong', 'wrong', 'skip', 'wrong', 'skip', 'wrong'],
      todayKey: '2026-04-06',
    }
  )

  assert.equal(nextState.stats.played, 6)
  assert.equal(nextState.stats.won, 4)
  assert.equal(nextState.stats.streak, 0)
  assert.equal(nextState.stats.maxStreak, 4)
  assert.equal(nextState.todayGame.statsRecorded, true)
})

test('recordCompletedGame is idempotent once stats are recorded', () => {
  const initialState = {
    stats: getDefaultStats(),
    lastPlayed: '2026-04-06',
    todayGame: {
      date: '2026-04-06',
      statsRecorded: true,
    },
  }

  const nextState = recordCompletedGame(initialState, {
    gameStatus: 'won',
    clueResults: ['correct'],
    todayKey: '2026-04-06',
  })

  assert.equal(nextState, initialState)
})
