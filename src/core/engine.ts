// Игровой движок: один тик мира + офлайн-симуляция пропущенного времени.
// Чистое ядро, не знает про React/Telegram/таймеры — вызывается извне.

import { clampStat, companyMood, createStartingTeam } from './employees'
import { generateEvent } from './events'
import type { Employee, GameEvent, GameState } from './types'

/** Сколько реального времени в одном тике (мс). */
export const TICK_MS = 5000

/** Максимум офлайн-тиков за один заход (чтобы не зависнуть). */
export const MAX_OFFLINE_TICKS = 200

/** Максимум одновременно ждущих решения событий. */
export const MAX_PENDING = 6

/** Сколько событий хранить в ленте. */
export const FEED_LIMIT = 50

export function createInitialState(rng: () => number = Math.random): GameState {
  return {
    tick: 0,
    lastSeen: Date.now(),
    money: 5000,
    employees: createStartingTeam(rng),
    pending: [],
    lastFired: {},
    feed: [],
  }
}

/** Медленный дрейф статов каждый тик: работа утомляет, настроение тянется к норме. */
function driftStats(emp: Employee): void {
  // стресс медленно растёт от работы
  emp.stats.stress = clampStat(emp.stats.stress + 0.4)
  // продуктивность зависит от настроения и стресса
  const target = emp.stats.mood * 0.6 + (100 - emp.stats.stress) * 0.4
  emp.stats.productivity = clampStat(
    emp.stats.productivity + (target - emp.stats.productivity) * 0.05,
  )
  // настроение слегка тянется к 50
  emp.stats.mood = clampStat(emp.stats.mood + (50 - emp.stats.mood) * 0.02)
}

/**
 * Один тик мира. Мутирует state.
 * @param rng детерминируемый генератор (для офлайн-расчёта)
 * @param chance вероятность попытки сгенерировать событие за тик
 */
export function tick(
  state: GameState,
  rng: () => number = Math.random,
  chance = 0.5,
): void {
  state.tick += 1

  // пассивный доход от продуктивности
  for (const e of state.employees) driftStats(e)
  const totalProd = state.employees.reduce(
    (s, e) => s + e.stats.productivity,
    0,
  )
  state.money += Math.round(totalProd * 0.1)

  // генерация события
  if (
    state.pending.length < MAX_PENDING &&
    state.employees.length >= 1 &&
    rng() < chance
  ) {
    const ev = generateEvent(state, rng)
    if (ev) {
      state.pending.push(ev)
      // помечаем cooldown сразу при появлении, чтобы не спамить одним шаблоном
      state.lastFired[ev.templateId] = state.tick
    }
  }
}

export interface OfflineResult {
  state: GameState
  elapsedTicks: number
  newEvents: GameEvent[]
}

/**
 * Просчитать время, пока игрока не было.
 * Берёт реальную дельту now - lastSeen, переводит в тики, прогоняет мир.
 */
export function simulateOffline(
  state: GameState,
  now: number = Date.now(),
  rng: () => number = Math.random,
): OfflineResult {
  const elapsedMs = Math.max(0, now - state.lastSeen)
  const rawTicks = Math.floor(elapsedMs / TICK_MS)
  const ticks = Math.min(rawTicks, MAX_OFFLINE_TICKS)

  const beforeIds = new Set(state.pending.map((e) => e.id))
  for (let i = 0; i < ticks; i++) {
    tick(state, rng)
  }
  state.lastSeen = now

  const newEvents = state.pending.filter((e) => !beforeIds.has(e.id))
  return { state, elapsedTicks: ticks, newEvents }
}

/** Утилита для UI: настроение компании. */
export { companyMood }

/** Обрезать ленту до лимита (новые сверху). */
export function trimFeed(state: GameState): void {
  if (state.feed.length > FEED_LIMIT) {
    state.feed = state.feed.slice(0, FEED_LIMIT)
  }
}
