// Платформо-независимые типы ядра игры.
// Никаких импортов React / Telegram здесь быть не должно.

export type Trait =
  | 'амбициозный'
  | 'ленивый'
  | 'интриган'
  | 'трудоголик'
  | 'токсичный'
  | 'миротворец'
  | 'гений'
  | 'паникёр'
  | 'душа компании'
  | 'выгоревший'

export type Department =
  | 'продажи'
  | 'разработка'
  | 'HR'
  | 'маркетинг'
  | 'бухгалтерия'

export interface EmployeeStats {
  productivity: number // 0–100
  mood: number // 0–100
  loyalty: number // 0–100
  stress: number // 0–100
}

export interface HistoryEntry {
  tick: number
  text: string
}

export interface Employee {
  id: string
  name: string
  role: string
  department: Department
  level: number // 1–10
  salary: number // зарплата за тик
  traits: Trait[]
  stats: EmployeeStats
  relationships: Record<string, number> // employeeId → [-100, 100]
  history: HistoryEntry[]
}

// ——— События ———

/** Применяемые изменения при исходе. Все поля опциональны. */
export interface OutcomeEffect {
  /** дельта отношений actor↔target */
  relationship?: number
  /** дельта mood у вовлечённых */
  mood?: number
  /** дельта stress у вовлечённых */
  stress?: number
  /** дельта productivity у вовлечённых */
  productivity?: number
  /** дельта loyalty у вовлечённых */
  loyalty?: number
  /** дельта mood у всей команды (отдела) */
  teamMood?: number
  /** стоимость в деньгах для компании */
  cost?: number
  /** уволить actor */
  removeActor?: boolean
  /** запланировать следующее событие (цепочка) */
  chain?: ChainSpec
}

/** Описание отложенного продолжения цепочки. */
export interface ChainSpec {
  /** id шаблона, который сработает */
  templateId: string
  /** через сколько тиков */
  afterTicks: number
}

/** Запланированное (отложенное) событие в очереди. */
export interface ScheduledEvent {
  templateId: string
  fireTick: number
  actorId: string
  targetId?: string
}

export interface Choice {
  /** ключ исхода в outcomes */
  outcome: string
  label: string
}

export interface EventConditions {
  /** требуемые черты у actor (хотя бы одна) */
  actorTraits?: Trait[]
  /** actor и target в одном отделе */
  sameDepartment?: boolean
  /** триггер только если отношения actor↔target < N */
  relationshipBelow?: number
  /** минимальный stress у actor */
  minStress?: number
  /** настроение компании ниже N */
  companyMoodBelow?: number
  /** нужен ли target (второй участник) */
  needsTarget?: boolean
}

export interface EventTemplate {
  id: string
  /** "{actor} {action} {target}" — подстановка имён */
  template: string
  conditions: EventConditions
  /** ключ → эффект */
  outcomes: Record<string, OutcomeEffect>
  choices: Choice[]
  /** перезарядка в тиках, прежде чем шаблон сможет сработать снова */
  cooldown: number
}

/** Конкретное сгенерированное событие, ждущее решения игрока. */
export interface GameEvent {
  id: string // уникальный инстанс
  templateId: string
  tick: number
  text: string
  actorId: string
  targetId?: string
  outcomes: Record<string, OutcomeEffect>
  choices: Choice[]
  /** уже разрешённое игроком? */
  resolved: boolean
  /** какой outcome выбран (после разрешения) */
  chosenOutcome?: string
}

export interface GameState {
  /** игровое время в тиках */
  tick: number
  /** реальное время последнего сейва (ms epoch) для офлайн-расчёта */
  lastSeen: number
  money: number
  employees: Employee[]
  /** активные нерешённые события */
  pending: GameEvent[]
  /** последние срабатывания шаблонов: templateId → tick */
  lastFired: Record<string, number>
  /** отложенные события цепочек */
  scheduled: ScheduledEvent[]
  /** лента (история) уже свершившихся событий, новые сверху */
  feed: GameEvent[]
}
