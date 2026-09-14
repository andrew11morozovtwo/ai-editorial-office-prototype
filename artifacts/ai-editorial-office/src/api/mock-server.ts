import { agentRuns, calendarSlots, claims, commands, drafts, editorRequests, history, ids, packagesByTask, platforms, publicationAttempts, radarRuns, results, signals, sources, targets, tasks, visuals } from './fixtures';
import { API_PREFIX, ENUMS, type ApiError, type Collection, type DecisionResponse, type EditorCommand, type ErrorCode, type SubmitCommandInput, type Task, type TaskDetail } from './contracts';

let requestCounter = 1;
const idempotent = new Map<string, { body: string; response: unknown }>();

export class MockApiException extends Error {
  envelope: { error: ApiError };
  constructor(code: ErrorCode, http_status: number, message: string, details: Record<string, unknown> = {}, task_id: string | null = null) {
    super(message);
    this.envelope = { error: { code, http_status, message, details, task_id, request_id: `req-mock-${String(requestCounter++).padStart(4, '0')}` } };
  }
}

const fail = (code: ErrorCode, status: number, message: string, details: Record<string, unknown> = {}, taskId: string | null = null): never => { throw new MockApiException(code, status, message, details, taskId); };
const paginate = <T>(items: T[], query: URLSearchParams): Collection<T> => {
  const limit = Number(query.get('limit') ?? 50);
  const offset = Number(query.get('offset') ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) fail('VALIDATION_FAILED', 422, 'Параметры пагинации имеют недопустимое значение.', { limit, offset });
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
};
const findTask = (id: string) => tasks.find((task) => task.id === id) ?? fail('NOT_FOUND', 404, 'Задача не найдена.', {}, id);
const taskDetail = (task: Task): TaskDetail => ({ ...task, history, agent_runs: agentRuns, results: task.id === ids.waiting ? results : [], claims: task.id === ids.waiting ? claims : [], drafts: task.id === ids.waiting ? drafts : [], packages: packagesByTask[task.id] ?? [], visuals: task.id === ids.waiting ? visuals : [], calendar_slots: task.id === ids.waiting ? calendarSlots : [], publication_attempts: publicationAttempts.filter((attempt) => attempt.target_id === task.id) });
const checkFilter = (query: URLSearchParams) => {
  const allowed = new Set(['state', 'platform', 'command_type', 'factual_risk', 'created_from', 'created_to', 'limit', 'offset']);
  for (const key of query.keys()) if (!allowed.has(key)) fail('VALIDATION_FAILED', 422, `Неизвестный фильтр: ${key}.`, { filter: key });
  const state = query.get('state');
  if (state && !ENUMS.TASK_STATE.includes(state as never)) fail('VALIDATION_FAILED', 422, `Неизвестное значение фильтра state: ${state}.`, { filter: 'state', value: state });
};

export async function mockGet(path: string, query: Record<string, string | undefined> = {}): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const url = new URL(path, 'http://mock.local');
  Object.entries(query).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, value));
  const pathname = url.pathname;
  if (!pathname.startsWith(API_PREFIX)) fail('REQUEST_INVALID', 422, 'Путь не использует базовый префикс /api/v1.');
  if (pathname === `${API_PREFIX}/enums`) return ENUMS;
  if (pathname === `${API_PREFIX}/me`) return { authenticated: true, role: 'EDITOR_IN_CHIEF' };
  if (pathname === `${API_PREFIX}/commands`) return paginate([...commands].sort((a, b) => b.created_at.localeCompare(a.created_at)), url.searchParams);
  const commandMatch = pathname.match(new RegExp(`^${API_PREFIX}/commands/([^/]+)$`));
  if (commandMatch) return commands.find((item) => item.id === commandMatch[1]) ?? fail('NOT_FOUND', 404, 'Команда не найдена.');
  if (pathname === `${API_PREFIX}/tasks`) {
    checkFilter(url.searchParams);
    let filtered = [...tasks].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '') || a.id.localeCompare(b.id));
    const state = url.searchParams.get('state');
    if (state) filtered = filtered.filter((task) => state.split(',').includes(task.current_state));
    return paginate(filtered, url.searchParams);
  }
  const taskMatch = pathname.match(new RegExp(`^${API_PREFIX}/tasks/([^/]+)$`));
  if (taskMatch) return taskDetail(findTask(taskMatch[1]));
  const collectionMatch = pathname.match(new RegExp(`^${API_PREFIX}/tasks/([^/]+)/(history|agent_runs|results|claims|drafts|packages|visuals|calendar_slots|publication_attempts)$`));
  if (collectionMatch) {
    const detail = taskDetail(findTask(collectionMatch[1]));
    return paginate(detail[collectionMatch[2] as keyof TaskDetail] as never[], url.searchParams);
  }
  if (pathname === `${API_PREFIX}/radar_runs`) return paginate(radarRuns, url.searchParams);
  const signalMatch = pathname.match(new RegExp(`^${API_PREFIX}/radar_runs/([^/]+)/signals$`));
  if (signalMatch) {
    const run = radarRuns.find((item) => item.id === signalMatch[1]);
    if (!run) fail('NOT_FOUND', 404, 'Прогон радара не найден.');
    return paginate(run!.outcome === 'NO_SIGNIFICANT_SIGNALS' ? [] : signals, url.searchParams);
  }
  if (pathname === `${API_PREFIX}/sources`) return paginate(sources, url.searchParams);
  if (pathname === `${API_PREFIX}/publication_targets`) return paginate(targets, url.searchParams);
  if (pathname === `${API_PREFIX}/platforms`) return paginate(platforms, url.searchParams);
  if (pathname === `${API_PREFIX}/editor_requests`) return paginate([...editorRequests].sort((a, b) => Number(b.request_status === 'OPEN') - Number(a.request_status === 'OPEN')), url.searchParams);
  return fail('NOT_FOUND', 404, 'Ресурс не найден.');
}

export async function mockPost(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 260));
  if (path === `${API_PREFIX}/commands`) {
    const serialized = JSON.stringify(body);
    if (/(file_content|content_base64|base64|multipart|binary)/i.test(serialized)) fail('ATTACHMENT_CONTENT_NOT_ACCEPTED', 422, 'В MVP принимаются только метаданные вложения.', { field: 'attachments' });
    const input = body as unknown as SubmitCommandInput;
    const rawText = typeof input.raw_text === 'string' ? input.raw_text.trim() : '';
    const attachments = Array.isArray(input.attachments) ? input.attachments : [];
    if (!rawText && attachments.length === 0) fail('EMPTY_COMMAND', 422, 'Введите команду или добавьте метаданные вложения.', { field: 'raw_text' });
    const mapped = attachments.map((item, index) => ({
      ...item,
      id: `attachment-${requestCounter}-${index + 1}`,
      attachment_status: (item.attachment_kind === 'TEXT' || item.attachment_kind === 'LINK') ? 'ACCEPTED' as const : 'NOT_SUPPORTED_MVP' as const,
      rejection_reason: (item.attachment_kind === 'TEXT' || item.attachment_kind === 'LINK') ? null : 'Получено, не разобрано в MVP',
    }));
    const usable = Boolean(rawText) || mapped.some((item) => item.attachment_status === 'ACCEPTED');
    const commandSequence = requestCounter++;
    const command: EditorCommand = {
      id: `command-${commandSequence}`,
      human_id: `CMD-2026-09-14-${String(commands.length + 1).padStart(3, '0')}`,
      raw_text: rawText,
      role: 'EDITOR_IN_CHIEF',
      command_status: usable ? 'TASK_CREATED' : 'REJECTED',
      parsed_command_type: usable ? 'DISCOVER' : null,
      parsed_command_subtype: usable ? 'NEWS_RESEARCH' : null,
      parsed_depth_mode: usable ? 'BRIEFING' : null,
      parsed_platforms: usable ? ['TG'] : null,
      ambiguity_flags: {},
      classification_run_id: usable ? `classification-${commandSequence}` : null,
      task_id: usable ? ids.research : null,
      attachments: mapped,
      created_at: new Date().toISOString(),
    };
    commands.unshift(command);
    if (!usable) fail('NO_USABLE_COMMAND_CONTENT', 422, 'Пригодного содержимого нет: вложения получены, но не разбираются в MVP.', { command_id: command.id, attachments: mapped });
    return command;
  }
  const actionMatch = path.match(new RegExp(`^${API_PREFIX}/tasks/([^/]+)/decisions/(approve|rework|reject|schedule|publish|answer_request|set_priority)$`));
  const sourceMatch = path.match(new RegExp(`^${API_PREFIX}/sources/([^/]+)/decisions/approve$`));
  const targetMatch = path.match(new RegExp(`^${API_PREFIX}/publication_targets/([^/]+)/decisions/promote$`));
  if (!actionMatch && !sourceMatch && !targetMatch) fail('NOT_FOUND', 404, 'Операция решения не найдена.');
  const actionName = actionMatch?.[2] ?? (sourceMatch ? 'approve_source' : 'promote_target');
  const taskId = actionMatch?.[1] ?? null;
  const task = taskId ? findTask(taskId) : null;
  const keyRequired = ['approve', 'schedule', 'publish'].includes(actionName);
  const key = headers['Idempotency-Key'];
  if (keyRequired && !key) fail('IDEMPOTENCY_KEY_REQUIRED', 400, 'Для этой операции требуется Idempotency-Key.', {}, taskId);
  const scopeKey = key ? `${actionName}:${key}` : null;
  const serializedBody = JSON.stringify(body);
  if (scopeKey && idempotent.has(scopeKey)) {
    const previous = idempotent.get(scopeKey)!;
    if (previous.body !== serializedBody) fail('IDEMPOTENCY_KEY_CONFLICT', 409, 'Тело решения изменилось, начните заново.', {}, taskId);
    return { ...(previous.response as object), replayed: true };
  }
  if (actionName === 'approve') {
    const packageIds = body.publication_package_ids;
    if (!Array.isArray(packageIds) || packageIds.length === 0) fail('VALIDATION_FAILED', 422, 'Укажите хотя бы один пакет для одобрения.', { field: 'publication_package_ids' }, taskId);
    const packages = packagesByTask[taskId!] ?? [];
    const requestedPackageIds = packageIds as unknown[];
    const invalid = packages.filter((item) => requestedPackageIds.includes(item.id) && !item.ready_for_review);
    if (invalid.length) fail('PACKAGE_NOT_VALID', 409, 'Пакет не готов к рассмотрению: есть блокирующие причины.', { publication_package_ids: invalid.map((item) => item.id), blocking_reasons: invalid.flatMap((item) => item.blocking_reasons) }, taskId);
  }
  if (actionName === 'rework' || actionName === 'reject') {
    if (typeof body.reason !== 'string' || !body.reason.trim()) fail('VALIDATION_FAILED', 422, 'Укажите обязательную причину решения.', { field: 'reason' }, taskId);
  }
  if (actionName === 'schedule') {
    if (typeof body.calendar_slot_id !== 'string') fail('VALIDATION_FAILED', 422, 'Укажите calendar_slot_id.', { field: 'calendar_slot_id' }, taskId);
    if (!Array.isArray(body.publication_package_ids) || body.publication_package_ids.length === 0) fail('VALIDATION_FAILED', 422, 'Укажите хотя бы один одобренный пакет.', { field: 'publication_package_ids' }, taskId);
  }
  if (actionName === 'publish') {
    const pairs = body.package_target_pairs;
    if (!Array.isArray(pairs) || pairs.length === 0) fail('VALIDATION_FAILED', 422, 'Укажите пары «пакет — цель».', { field: 'package_target_pairs' }, taskId);
    const productionMock = (pairs as Array<{ target_id: string; package_id: string }>).some((pair) => targets.find((target) => target.id === pair.target_id)?.environment === 'PRODUCTION' && packagesByTask[taskId!]?.find((item) => item.id === pair.package_id)?.content_origin === 'MOCK');
    if (productionMock) fail('MOCK_TO_PRODUCTION_FORBIDDEN', 409, 'Публикация MOCK-контента в PRODUCTION запрещена инвариантом И-03.', { package_content_origin: 'MOCK', target_environment: 'PRODUCTION' }, taskId);
    fail('STUB_NOT_IMPLEMENTED', 501, 'Публикация — заглушка MVP до этапа Э7. Успешная попытка не создаётся.', { gateway_mode: 'MOCK' }, taskId);
  }
  if (actionName === 'promote_target') {
    const target = targets.find((item) => item.id === targetMatch?.[1]);
    if (!target) fail('NOT_FOUND', 404, 'Цель публикации не найдена.');
    target!.environment = 'PRODUCTION';
    target!.promoted_by_decision_id = `decision-${requestCounter}`;
    return { target: target!, decision_id: `decision-${requestCounter++}` };
  }
  if (actionName === 'answer_request') {
    const request = editorRequests.find((item) => item.id === body.editor_request_id);
    if (!request) fail('NOT_FOUND', 404, 'Запрос редактору не найден.', {}, taskId);
    if (request!.request_status === 'ANSWERED') fail('EDITOR_REQUEST_ALREADY_ANSWERED', 409, 'На этот запрос редактор уже ответил.', { editor_request_id: request!.id }, taskId);
    request!.request_status = 'ANSWERED';
    request!.answer = typeof body.answer === 'string' ? body.answer : null;
  }
  const response: DecisionResponse = { task: task!, decision_id: `decision-${requestCounter++}`, history_event_id: `history-${requestCounter++}` };
  if (scopeKey) idempotent.set(scopeKey, { body: serializedBody, response });
  return response;
}