// Zustand store — мост между чистым ядром и React.
// Держит GameState, гоняет тики, сохраняет в localStorage.

import { create } from 'zustand'
import {
  createInitialState,
  simulateOffline,
  tick as engineTick,
  trimFeed,
} from '../core/engine'
import { resolveEvent } from '../core/events'
import type { GameEvent, GameState } from '../core/types'

const SAVE_KEY = 'idle-office-drama:save:v1'

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

function save(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // квота/приватный режим — молча игнорируем
  }
}

/**
 * Ядро мутирует GameState на месте. Zustand-селекторы сравнивают по Object.is,
 * поэтому отдаём свежие ссылки на массивы, которые читает UI, иначе React
 * не перерисует ленту/команду.
 */
function freshRefs(state: GameState): GameState {
  return {
    ...state,
    employees: [...state.employees],
    pending: [...state.pending],
    feed: [...state.feed],
  }
}

interface OfflineSummary {
  elapsedTicks: number
  newEventCount: number
}

interface GameStore {
  state: GameState
  offlineSummary: OfflineSummary | null
  /** один игровой тик (вызывается таймером) */
  tick: () => void
  /** разрешить событие выбором игрока */
  resolve: (eventId: string, outcomeKey: string) => void
  /** сбросить прогресс */
  reset: () => void
  /** скрыть плашку офлайн-сводки */
  dismissOffline: () => void
}

function boot(): { state: GameState; offlineSummary: OfflineSummary | null } {
  const saved = load()
  if (!saved) {
    const fresh = createInitialState()
    save(fresh)
    return { state: fresh, offlineSummary: null }
  }
  const { state, elapsedTicks, newEvents } = simulateOffline(saved)
  save(state)
  return {
    state,
    offlineSummary:
      elapsedTicks > 0
        ? { elapsedTicks, newEventCount: newEvents.length }
        : null,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...boot(),

  tick: () => {
    const state = get().state
    engineTick(state)
    state.lastSeen = Date.now()
    save(state)
    set({ state: freshRefs(state) })
  },

  resolve: (eventId, outcomeKey) => {
    const state = get().state
    const event = state.pending.find((e: GameEvent) => e.id === eventId)
    if (!event) return
    resolveEvent(state, event, outcomeKey)
    // убрать из pending, добавить в ленту (новые сверху)
    state.pending = state.pending.filter((e: GameEvent) => e.id !== eventId)
    state.feed = [event, ...state.feed]
    trimFeed(state)
    state.lastSeen = Date.now()
    save(state)
    set({ state: freshRefs(state) })
  },

  reset: () => {
    const fresh = createInitialState()
    save(fresh)
    set({ state: fresh, offlineSummary: null })
  },

  dismissOffline: () => set({ offlineSummary: null }),
}))
