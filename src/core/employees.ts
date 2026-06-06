// Модель сотрудника: создание, утилиты, изменение статов.
// Чистые функции, без побочных эффектов на UI.

import type {
  Department,
  Employee,
  EmployeeStats,
  Trait,
} from './types'

const FIRST_NAMES = [
  'Петя', 'Маша', 'Игорь', 'Света', 'Дима', 'Оля',
  'Костя', 'Лена', 'Антон', 'Вика', 'Серёжа', 'Ника',
  'Гена', 'Алла', 'Боря', 'Юля',
]

const ROLES: Record<Department, string[]> = {
  'продажи': ['Менеджер по продажам', 'Сейлз', 'Аккаунт-менеджер'],
  'разработка': ['Разработчик', 'Тимлид', 'QA-инженер'],
  'HR': ['HR-менеджер', 'Рекрутер', 'Офис-менеджер'],
  'маркетинг': ['Маркетолог', 'SMM-щик', 'Контент-менеджер'],
  'бухгалтерия': ['Бухгалтер', 'Финансист', 'Аналитик'],
}

const ALL_TRAITS: Trait[] = [
  'амбициозный', 'ленивый', 'интриган', 'трудоголик', 'токсичный',
  'миротворец', 'гений', 'паникёр', 'душа компании', 'выгоревший',
]

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `emp_${Date.now().toString(36)}_${idCounter}`
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randStat(rng: () => number, min = 40, max = 80): number {
  return Math.round(min + rng() * (max - min))
}

/** Зажать число в диапазон [0, 100]. */
export function clampStat(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)))
}

/** Зажать отношение в диапазон [-100, 100]. */
export function clampRel(v: number): number {
  return Math.max(-100, Math.min(100, Math.round(v)))
}

export interface CreateEmployeeOpts {
  department?: Department
  rng?: () => number
}

export function createEmployee(opts: CreateEmployeeOpts = {}): Employee {
  const rng = opts.rng ?? Math.random
  const department =
    opts.department ??
    pick<Department>(
      ['продажи', 'разработка', 'HR', 'маркетинг', 'бухгалтерия'],
      rng,
    )

  // 1–2 черты характера, без повторов
  const traitCount = 1 + Math.floor(rng() * 2)
  const traits: Trait[] = []
  while (traits.length < traitCount) {
    const t = pick(ALL_TRAITS, rng)
    if (!traits.includes(t)) traits.push(t)
  }

  const stats: EmployeeStats = {
    productivity: randStat(rng),
    mood: randStat(rng, 50, 85),
    loyalty: randStat(rng, 45, 80),
    stress: randStat(rng, 10, 40),
  }

  return {
    id: nextId(),
    name: pick(FIRST_NAMES, rng),
    role: pick(ROLES[department], rng),
    department,
    level: 1,
    salary: 30 + Math.round(rng() * 40), // 30–70 за тик
    traits,
    stats,
    relationships: {},
    history: [],
  }
}

/** Разовая стоимость найма (зависит от зарплаты). */
export function hireCost(emp: Employee): number {
  return emp.salary * 20
}

/**
 * Принять сотрудника в команду: завести нейтральные отношения со всеми.
 * Мутирует массив employees (возвращает новый).
 */
export function addEmployee(
  employees: Employee[],
  emp: Employee,
): Employee[] {
  for (const e of employees) {
    e.relationships[emp.id] = 0
    emp.relationships[e.id] = 0
  }
  return [...employees, emp]
}

/**
 * Уволить сотрудника: убрать из списка и подчистить упоминания в отношениях.
 * Возвращает новый массив.
 */
export function removeEmployee(
  employees: Employee[],
  id: string,
): Employee[] {
  for (const e of employees) delete e.relationships[id]
  return employees.filter((e) => e.id !== id)
}

/** Стартовая команда: 3 сотрудника (Стажёр-CEO). */
export function createStartingTeam(rng: () => number = Math.random): Employee[] {
  const team = [
    createEmployee({ department: 'разработка', rng }),
    createEmployee({ department: 'продажи', rng }),
    createEmployee({ department: 'HR', rng }),
  ]
  // нейтральные стартовые отношения
  for (const a of team) {
    for (const b of team) {
      if (a.id !== b.id) a.relationships[b.id] = 0
    }
  }
  return team
}

export function getEmployee(
  employees: Employee[],
  id: string,
): Employee | undefined {
  return employees.find((e) => e.id === id)
}

/** Среднее настроение по компании. */
export function companyMood(employees: Employee[]): number {
  if (employees.length === 0) return 50
  const sum = employees.reduce((s, e) => s + e.stats.mood, 0)
  return Math.round(sum / employees.length)
}

/** Отношение a→b (0 если незнакомы). */
export function relationship(a: Employee, bId: string): number {
  return a.relationships[bId] ?? 0
}

/** Изменить взаимное отношение двух сотрудников (симметрично). */
export function adjustRelationship(
  a: Employee,
  b: Employee,
  delta: number,
): void {
  a.relationships[b.id] = clampRel(relationship(a, b.id) + delta)
  b.relationships[a.id] = clampRel(relationship(b, a.id) + delta)
}
