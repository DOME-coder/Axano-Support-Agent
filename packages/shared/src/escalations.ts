// Shared types for escalations. The widget never sees these — only
// the dashboard's replay UI renders the banner. Phase 2 ships the
// schema + agent tool stub only; phase 3 adds notification dispatch
// and a resolve flow (status flips to 'resolved').

export const ESCALATION_STATUSES = ['pending', 'resolved'] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export const ESCALATION_TARGETS = ['email', 'human-agent'] as const;
export type EscalationTarget = (typeof ESCALATION_TARGETS)[number];

export interface EscalationItem {
  reason: string;
  status: EscalationStatus;
  target: EscalationTarget;
  createdAt: string; // ISO
}
