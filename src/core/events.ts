// Движок событий: подбор подходящего шаблона по условиям,
// генерация конкретного GameEvent, применение исхода.

import rawTemplates from './templates/events.json'
import {
  adjustRelationship,
  clampStat,
  companyMood,
  getEmployee,
  relationship,
} from './employees'
import type {
  Employee,
  EventTemplate,
  GameEvent,
  GameState,
  OutcomeEffect,
} from './types'

export const TEMPLATES = rawTemplates as unknown as EventTemplate[]

const TEMPLATE_BY_ID: Record<string, EventTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
)

let instanceCounter = 0
function nextInstanceId(): string {
  instanceCounter += 1
  return `evt_${Date.now().toString(36)}_${instanceCounter}`
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

interface Match {
  template: EventTemplate
  actor: Employee
  target?: Employee
}

/** Все пары (actor[, target]), для которых шаблон проходит условия. */
function findMatches(
  template: EventTemplate,
  state: GameState,
): Match[] {
  const c = template.conditions
  const mood = companyMood(state.employees)
  const matches: Match[] = []

  // фильтр по настроению компании — глобальный
  if (c.companyMoodBelow !== undefined && mood >= c.companyMoodBelow) {
    return matches
  }

  for (const actor of state.employees) {
    // черты актора
    if (
      c.actorTraits &&
      !c.actorTraits.some((t) => actor.traits.includes(t))
    ) {
      continue
    }
    // стресс актора
    if (c.minStress !== undefined && actor.stats.stress < c.minStress) {
      continue
    }

    if (c.needsTarget) {
      for (const target of state.employees) {
        if (target.id === actor.id) continue
        if (
          c.sameDepartment !== undefined &&
          (actor.department === target.department) !== c.sameDepartment
        ) {
          continue
        }
        if (
          c.relationshipBelow !== undefined &&
          relationship(actor, target.id) >= c.relationshipBelow
        ) {
          continue
        }
        matches.push({ template, actor, target })
      }
    } else {
      matches.push({ template, actor })
    }
  }

  return matches
}

function fillTemplate(text: string, actor: Employee, target?: Employee): string {
  return text
    .replace(/\{actor\}/g, actor.name)
    .replace(/\{target\}/g, target?.name ?? '')
}

/** Собрать конкретный GameEvent из шаблона и участников. */
function buildEvent(
  template: EventTemplate,
  actor: Employee,
  target: Employee | undefined,
  tick: number,
): GameEvent {
  return {
    id: nextInstanceId(),
    templateId: template.id,
    tick,
    text: fillTemplate(template.template, actor, target),
    actorId: actor.id,
    targetId: target?.id,
    outcomes: template.outcomes,
    choices: template.choices,
    resolved: false,
  }
}

/**
 * Попытаться сгенерировать ровно одно новое событие.
 * Учитывает cooldown шаблонов. Возвращает событие или null.
 */
export function generateEvent(
  state: GameState,
  rng: () => number = Math.random,
): GameEvent | null {
  // шаблоны не на перезарядке
  const ready = TEMPLATES.filter((t) => {
    const last = state.lastFired[t.id]
    return last === undefined || state.tick - last >= t.cooldown
  })

  // собираем все валидные матчи по всем готовым шаблонам
  const allMatches: Match[] = []
  for (const t of ready) {
    allMatches.push(...findMatches(t, state))
  }
  if (allMatches.length === 0) return null

  const m = pick(allMatches, rng)
  return buildEvent(m.template, m.actor, m.target, state.tick)
}

/**
 * Активировать отложенные события цепочек, у которых наступил fireTick.
 * Возвращает массив новых событий (и чистит scheduled). Мутирует state.
 */
export function fireScheduled(state: GameState): GameEvent[] {
  if (state.scheduled.length === 0) return []
  const due = state.scheduled.filter((s) => s.fireTick <= state.tick)
  if (due.length === 0) return []
  state.scheduled = state.scheduled.filter((s) => s.fireTick > state.tick)

  const events: GameEvent[] = []
  for (const sch of due) {
    const template = TEMPLATE_BY_ID[sch.templateId]
    const actor = getEmployee(state.employees, sch.actorId)
    if (!template || !actor) continue // участник мог уволиться
    const target = sch.targetId
      ? getEmployee(state.employees, sch.targetId)
      : undefined
    events.push(buildEvent(template, actor, target, state.tick))
  }
  return events
}

function applyToEmployee(emp: Employee, fx: OutcomeEffect): void {
  if (fx.mood !== undefined) emp.stats.mood = clampStat(emp.stats.mood + fx.mood)
  if (fx.stress !== undefined)
    emp.stats.stress = clampStat(emp.stats.stress + fx.stress)
  if (fx.productivity !== undefined)
    emp.stats.productivity = clampStat(emp.stats.productivity + fx.productivity)
  if (fx.loyalty !== undefined)
    emp.stats.loyalty = clampStat(emp.stats.loyalty + fx.loyalty)
}

/**
 * Применить выбранный игроком исход к состоянию.
 * Мутирует state. Возвращает текст-резюме для ленты.
 */
export function resolveEvent(
  state: GameState,
  event: GameEvent,
  outcomeKey: string,
): void {
  const fx = event.outcomes[outcomeKey]
  if (!fx) return

  const actor = getEmployee(state.employees, event.actorId)
  const target = event.targetId
    ? getEmployee(state.employees, event.targetId)
    : undefined

  // деньги
  if (fx.cost) state.money -= fx.cost

  // отношения actor↔target
  if (fx.relationship !== undefined && actor && target) {
    adjustRelationship(actor, target, fx.relationship)
  }

  // персональные эффекты на участников
  if (actor) applyToEmployee(actor, fx)
  if (target) applyToEmployee(target, fx)

  // эффект на команду (тот же отдел, что у actor)
  if (fx.teamMood !== undefined && actor) {
    for (const e of state.employees) {
      if (e.department === actor.department) {
        e.stats.mood = clampStat(e.stats.mood + fx.teamMood)
      }
    }
  }

  // увольнение actor
  if (fx.removeActor && actor) {
    state.employees = state.employees.filter((e) => e.id !== actor.id)
    for (const e of state.employees) delete e.relationships[actor.id]
  }

  // цепочка: запланировать следующее событие (если actor ещё в штате)
  if (fx.chain && actor && !fx.removeActor) {
    state.scheduled.push({
      templateId: fx.chain.templateId,
      fireTick: state.tick + fx.chain.afterTicks,
      actorId: actor.id,
      targetId: target?.id,
    })
  }

  // лог в историю участников
  const entry = { tick: state.tick, text: event.text }
  if (actor) actor.history.push(entry)
  if (target) target.history.push(entry)

  // отметить срабатывание шаблона (cooldown)
  state.lastFired[event.templateId] = state.tick

  // зафиксировать решение
  event.resolved = true
  event.chosenOutcome = outcomeKey
}
