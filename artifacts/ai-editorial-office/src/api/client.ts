import { MockApiException, mockGet, mockPost } from './mock-server';
import type { Collection, DecisionResponse, EditorCommand, EditorRequest, PlatformLimit, PublicationTarget, RadarRun, Signal, Source, SubmitCommandInput, Task, TaskDetail } from './contracts';

export const api = {
  getEnums: () => mockGet('/api/v1/enums'),
  getMe: () => mockGet('/api/v1/me'),
  getCommands: () => mockGet('/api/v1/commands') as Promise<Collection<EditorCommand>>,
  getCommand: (id: string) => mockGet(`/api/v1/commands/${id}`) as Promise<EditorCommand>,
  submitCommand: (input: SubmitCommandInput) => mockPost('/api/v1/commands', input as unknown as Record<string, unknown>) as Promise<EditorCommand>,
  getTasks: (query: Record<string, string | undefined> = {}) => mockGet('/api/v1/tasks', query) as Promise<Collection<Task>>,
  getTask: (id: string) => mockGet(`/api/v1/tasks/${id}`) as Promise<TaskDetail>,
  getRadarRuns: () => mockGet('/api/v1/radar_runs') as Promise<Collection<RadarRun>>,
  getRadarSignals: (id: string) => mockGet(`/api/v1/radar_runs/${id}/signals`) as Promise<Collection<Signal>>,
  getSources: () => mockGet('/api/v1/sources') as Promise<Collection<Source>>,
  getPublicationTargets: () => mockGet('/api/v1/publication_targets') as Promise<Collection<PublicationTarget>>,
  getPlatforms: () => mockGet('/api/v1/platforms') as Promise<Collection<PlatformLimit>>,
  getEditorRequests: () => mockGet('/api/v1/editor_requests') as Promise<Collection<EditorRequest>>,
  decide: (taskId: string, action: string, body: Record<string, unknown>, idempotencyKey?: string) => mockPost(`/api/v1/tasks/${taskId}/decisions/${action}`, body, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) as Promise<DecisionResponse>,
  approveSource: (sourceId: string) => mockPost(`/api/v1/sources/${sourceId}/decisions/approve`, {}) as Promise<unknown>,
  promoteTarget: (targetId: string) => mockPost(`/api/v1/publication_targets/${targetId}/decisions/promote`, {}) as Promise<unknown>,
};

export { MockApiException };