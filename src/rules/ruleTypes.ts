export type RuleStatus =
  | 'implemented'
  | 'unsupported'
  | 'temporary'
  | 'planned'

export type RuleCategory =
  | 'wall'
  | 'turn'
  | 'discard'
  | 'riichi'
  | 'call'
  | 'win'
  | 'kan'
  | 'score'
  | 'debug'

export type RuleSeverity =
  | 'error'
  | 'warning'
  | 'info'

export interface RuleSpec {
  id: string
  category: RuleCategory
  title: string
  status: RuleStatus
  summary: string
  testCases: string[]
  notes?: string
}

export interface RuleViolation {
  ruleId: string
  severity: RuleSeverity
  message: string
  context?: unknown
}

