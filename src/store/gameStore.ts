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
import {
  addEmployee,
  createEmployee,
  hireCost,
  removeEmployee,
} from '../core/employees'
import type { Employee, GameEvent, GameState } from '../core/types'

/** Сгенерировать свежий пул кандидатов на найм. */
function rollCandidates(count = 3): Employee[] {
  return Array.from({ length: count }, () => createEmployee())
}

const SAVE_KEY = 'idle-office-drama:save:v1'

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as GameState
    // миграция: поля, добавленные позже
    if (!state.scheduled) state.scheduled = []
    return state
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
  /** эфемерный пул кандидатов на найм (не сохраняется) */
  candidates: Employee[]
  /** один игровой тик (вызывается таймером) */
  tick: () => void
  /** разрешить событие выбором игрока */
  resolve: (eventId: string, outcomeKey: string) => void
  /** нанять кандидата (списывает hireCost) */
  hire: (candidateId: string) => void
  /** уволить сотрудника */
  fire: (employeeId: string) => void
  /** перегенерировать список кандидатов */
  rerollCandidates: () => void
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
  candidates: rollCandidates(),

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

  hire: (candidateId) => {
    const state = get().state
    const candidate = get().candidates.find((c) => c.id === candidateId)
    if (!candidate) return
    const cost = hireCost(candidate)
    if (state.money < cost) return // не хватает денег
    state.money -= cost
    state.employees = addEmployee(state.employees, candidate)
    save(state)
    set({
      state: freshRefs(state),
      candidates: get().candidates.filter((c) => c.id !== candidateId),
    })
  },

  fire: (employeeId) => {
    const state = get().state
    const emp = state.employees.find((e) => e.id === employeeId)
    if (!emp) return
    state.employees = removeEmployee(state.employees, employeeId)
    // убрать связанные нерешённые события
    state.pending = state.pending.filter(
      (ev) => ev.actorId !== employeeId && ev.targetId !== employeeId,
    )
    save(state)
    set({ state: freshRefs(state) })
  },

  rerollCandidates: () => set({ candidates: rollCandidates() }),

  reset: () => {
    const fresh = createInitialState()
    save(fresh)
    set({ state: fresh, offlineSummary: null, candidates: rollCandidates() })
  },

  dismissOffline: () => set({ offlineSummary: null }),
}))
