export type Project = { id: string; name: string; repository?: string; url?: string; mode: 'production' | 'local' | 'research'; owner: string };
export type Observation = { projectId: string; checkedAt: string; source: 'cloud' | 'relay'; status: 'healthy' | 'degraded' | 'down' | 'unobserved'; httpStatus?: number; latencyMs?: number; missingHeaders?: string[] };
export type Task = { id: string; projectId: string; owner: string; kind: 'incident' | 'investigation' | 'proposal'; status: 'queued' | 'blocked' | 'needs_review' | 'done'; title: string; createdAt: string; evidence: string[]; proposal?: string; completedAt?: string };
export type Report = { id: string; sequence: number; projectId?: string; createdAt: string; title: string; markdown: string; notion: { status: 'pending' | 'sending' | 'sent' | 'needs_reconciliation'; pageId?: string } };
export type State = { version: 1; sequence: number; observations: Record<string, Observation>; streaks: Record<string, number>; tasks: Task[]; reports: Report[]; lastCycle?: string; relaySeenAt?: string };
export const emptyState = (): State => ({ version: 1, sequence: 0, observations: {}, streaks: {}, tasks: [], reports: [] });
