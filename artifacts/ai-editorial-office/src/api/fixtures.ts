import type {
  AgentResult, AgentRun, CalendarSlot, Claim, Draft, EditorCommand, EditorRequest, HistoryEvent, PlatformLimit, PublicationAttempt, PublicationPackage, PublicationTarget, RadarRun, Signal, Source, Task, Visual,
} from './contracts';

export const ids = {
  research: '10000000-0000-4000-8000-000000000001',
  waiting: '10000000-0000-4000-8000-000000000002',
  error: '10000000-0000-4000-8000-000000000003',
  archived: '10000000-0000-4000-8000-000000000004',
  published: '10000000-0000-4000-8000-000000000005',
  radar: '20000000-0000-4000-8000-000000000001',
  signalDuplicate: '30000000-0000-4000-8000-000000000010',
  request: '40000000-0000-4000-8000-000000000001',
  sourcePrimary: '50000000-0000-4000-8000-000000000001',
  targetSandbox: '60000000-0000-4000-8000-000000000001',
  targetProduction: '60000000-0000-4000-8000-000000000002',
};

const date = (day: string, hour = '10:00:00') => `2026-09-${day}T${hour}Z`;
const action = (name: string, taskId: string) => ({ action: name, path: `/api/v1/tasks/${taskId}/decisions/${name}` });

export const tasks: Task[] = [
  { id: ids.waiting, human_id: 'TASK-002', title: 'Защита базы от роя дронов', command_type: 'DISCOVER', depth_mode: 'FULL_PUBLICATION_PACKAGE', current_state: 'WAITING_FOR_EDITOR', platforms: ['TG', 'VK'], priority: 'HIGH', urgency: 'HIGH', editorial_priority: null, factual_risk: 'MEDIUM', source_date: date('10'), context: 'Результат радара выбран для редакторского решения.', editor_command_id: null, series_id: null, current_result_id: '70000000-0000-4000-8000-000000000002', error_class: null, retry_count: 0, created_at: date('10', '08:00:00'), updated_at: date('14', '09:40:00'), available_actions: [action('approve', ids.waiting), action('rework', ids.waiting), action('reject', ids.waiting), action('schedule', ids.waiting), action('publish', ids.waiting), action('answer_request', ids.waiting), action('set_priority', ids.waiting)] },
  { id: ids.research, human_id: 'TASK-001', title: 'CARI swarm defense (Lockheed Martin)', command_type: 'DISCOVER', depth_mode: 'BRIEFING', current_state: 'RESEARCH', platforms: null, priority: null, urgency: null, editorial_priority: null, factual_risk: null, source_date: date('10'), context: null, editor_command_id: null, series_id: null, current_result_id: null, error_class: null, retry_count: null, created_at: date('10', '08:02:00'), updated_at: date('10', '08:03:00'), available_actions: [action('rework', ids.research), action('set_priority', ids.research)] },
  { id: ids.error, human_id: 'TASK-003', title: 'Разбор сбоя маршрута материалов', command_type: 'CHECK', depth_mode: 'CHECK_ONLY', current_state: 'ERROR', platforms: ['TG'], priority: 'MEDIUM', urgency: 'MEDIUM', editorial_priority: null, factual_risk: 'HIGH', source_date: null, context: 'Маршрут остановлен с сохранённым контекстом.', editor_command_id: null, series_id: null, current_result_id: null, error_class: 'PROMPT_VERSION_MISMATCH', retry_count: 2, created_at: date('12', '13:20:00'), updated_at: date('14', '08:20:00'), available_actions: [action('rework', ids.error), action('reject', ids.error), action('set_priority', ids.error)] },
  { id: ids.archived, human_id: 'TASK-004', title: 'Архивный прогон без значимого сигнала', command_type: 'DISCOVER', depth_mode: null, current_state: 'ARCHIVED', platforms: null, priority: null, urgency: null, editorial_priority: null, factual_risk: null, source_date: date('08'), context: null, editor_command_id: null, series_id: null, current_result_id: null, error_class: null, retry_count: 0, created_at: date('08', '09:00:00'), updated_at: date('08', '09:30:00'), available_actions: [] },
  { id: ids.published, human_id: 'TASK-005', title: 'Отчёт по инженерным системам', command_type: 'PUBLISH', depth_mode: 'SINGLE_POST', current_state: 'PUBLISHED', platforms: ['TG'], priority: 'LOW', urgency: 'LOW', editorial_priority: null, factual_risk: 'LOW', source_date: date('07'), context: null, editor_command_id: null, series_id: null, current_result_id: '70000000-0000-4000-8000-000000000005', error_class: null, retry_count: 0, created_at: date('07', '11:00:00'), updated_at: date('07', '16:30:00'), available_actions: [] },
];

export const radarRuns: RadarRun[] = [
  { id: ids.radar, scan_type: 'DAILY_RADAR_SCAN', period: 'LAST_24_HOURS', raw_detections_count: 10, outcome: 'SIGNALS_FOUND', schedule_id: null, created_at: date('10', '07:00:00') },
  { id: '20000000-0000-4000-8000-000000000002', scan_type: 'DAILY_RADAR_SCAN', period: 'LAST_24_HOURS', raw_detections_count: 0, outcome: 'NO_SIGNIFICANT_SIGNALS', schedule_id: null, created_at: date('09', '07:00:00') },
];

export const signals: Signal[] = [
  { id: '30000000-0000-4000-8000-000000000001', title: 'CARI swarm defense (Lockheed Martin)', disposition: 'TASK_CREATED', duplicate_of_id: null, related_task_id: ids.research, signal_score: null, score_breakdown: null, source_ids: null, detected_at: null },
  ...['Lumberjack quantum navigation', 'российская subsea technology', 'захваченный Dive-LD', 'DRDO SHIELD HPM', 'Covenant Anthem', 'Warmate 30', 'USAF drone swarm base defense', 'украинские реактивные дроны-перехватчики'].map((title, index) => ({ id: `30000000-0000-4000-8000-00000000000${index + 2}`, title, disposition: 'NEW' as const, duplicate_of_id: null, related_task_id: null, signal_score: null, score_breakdown: null, source_ids: null, detected_at: null })),
  { id: ids.signalDuplicate, title: 'BLAZE interceptor', disposition: 'DUPLICATE', duplicate_of_id: null, related_task_id: null, signal_score: null, score_breakdown: null, source_ids: null, detected_at: null },
];

export const platforms: PlatformLimit[] = [
  { platform: 'TG', max_characters: 1024, visual_required: false, caption_required: false },
  { platform: 'VK', max_characters: 4096, visual_required: false, caption_required: false },
];

export const sources: Source[] = [
  { id: ids.sourcePrimary, human_id: 'SRC-001', title: 'Официальные материалы разработчика / производителя', kind: 'PRIMARY', reliability: 'A', reliability_max: 'B', status: 'APPROVED', domain: null, note: 'Учитывать маркетинговый уклон в ТТХ', approved_decision_id: null },
  { id: '50000000-0000-4000-8000-000000000002', human_id: 'SRC-002', title: 'Официальные ведомственные сообщения (МО, агентства)', kind: 'PRIMARY', reliability: 'B', reliability_max: null, status: 'APPROVED', domain: null, note: 'Заявление ≠ подтверждённый факт', approved_decision_id: null },
  { id: '50000000-0000-4000-8000-000000000003', human_id: 'SRC-003', title: 'Профильные отраслевые издания', kind: 'SECONDARY', reliability: 'B', reliability_max: 'C', status: 'APPROVED', domain: null, note: 'Проверять, не перепечатка ли', approved_decision_id: null },
  { id: '50000000-0000-4000-8000-000000000004', human_id: 'SRC-004', title: 'Государственные медиа', kind: 'SECONDARY', reliability: 'C', reliability_max: null, status: 'CANDIDATE_SOURCE', domain: null, note: 'Требуется независимое подтверждение', approved_decision_id: null },
  { id: '50000000-0000-4000-8000-000000000005', human_id: 'SRC-005', title: 'Сообщения разведки/военных источников через СМИ', kind: 'SECONDARY', reliability: 'C', reliability_max: 'D', status: 'CANDIDATE_SOURCE', domain: null, note: 'Обязательна фиксация SOURCE_CHAIN', approved_decision_id: null },
  { id: '50000000-0000-4000-8000-000000000006', human_id: 'SRC-006', title: 'Соцсети, OSINT-аккаунты, каналы', kind: 'SECONDARY', reliability: 'D', reliability_max: 'E', status: 'CANDIDATE_SOURCE', domain: null, note: 'Только как сигнал, не как доказательство', approved_decision_id: null },
  { id: '50000000-0000-4000-8000-000000000007', human_id: 'SRC-007', title: 'Агрегаторы и новостные перепечатки', kind: 'DERIVED', reliability: 'E', reliability_max: null, status: 'RESTRICTED', domain: null, note: 'Не считается независимым подтверждением', approved_decision_id: null },
];

export const targets: PublicationTarget[] = [
  { id: ids.targetSandbox, human_id: 'TARGET-001', title: 'Тестовый канал редакции', platform: 'TG', environment: 'SANDBOX', promoted_by_decision_id: null, gateway_mode: 'MOCK' },
  { id: ids.targetProduction, human_id: 'TARGET-002', title: 'Основной канал редакции', platform: 'TG', environment: 'PRODUCTION', promoted_by_decision_id: null, gateway_mode: 'PRODUCTION' },
];

export const editorRequests: EditorRequest[] = [
  { id: ids.request, task_id: ids.waiting, request_status: 'OPEN', question: 'Какой контекст считать главным для финальной версии?', options: ['Инженерная защита инфраструктуры', 'Тактика обнаружения роя', 'Отложить до дополнительной проверки'], answer: null, created_at: date('14', '09:25:00') },
];

const readyPackage: PublicationPackage = { id: '80000000-0000-4000-8000-000000000001', platform: 'TG', package_status: 'READY', post_draft_id: '90000000-0000-4000-8000-000000000001', visual_package_id: 'a0000000-0000-4000-8000-000000000001', visual_status: 'VISUAL_READY', visual_not_required: false, visual_risk: 'LOW', publication_instruction: 'Разместить после первого абзаца', length_check: 'PASS', factual_risk_snapshot: 'MEDIUM', content_origin: 'AI', ready_for_review: true, blocking_reasons: [] };
const noVisualReadyPackage: PublicationPackage = { id: '80000000-0000-4000-8000-000000000003', platform: 'VK', package_status: 'READY', post_draft_id: '90000000-0000-4000-8000-000000000002', visual_package_id: null, visual_status: 'NOT_REQUIRED', visual_not_required: true, visual_risk: 'LOW', publication_instruction: 'публиковать без изображения', length_check: 'PASS', factual_risk_snapshot: 'LOW', content_origin: 'AI', ready_for_review: true, blocking_reasons: [] };
const blockedPackage: PublicationPackage = { id: '80000000-0000-4000-8000-000000000002', platform: 'VK', package_status: 'DRAFT', post_draft_id: '90000000-0000-4000-8000-000000000003', visual_package_id: null, visual_status: null, visual_not_required: false, visual_risk: null, publication_instruction: null, length_check: 'PASS', factual_risk_snapshot: 'MEDIUM', content_origin: 'MOCK', ready_for_review: false, blocking_reasons: ['VISUAL_PACKAGE_MISSING'] };
export const packagesByTask: Record<string, PublicationPackage[]> = { [ids.waiting]: [readyPackage, noVisualReadyPackage, blockedPackage] };

export const drafts: Draft[] = [{ id: readyPackage.post_draft_id!, platform: 'TG', version: 1, text: 'Системы защиты от роя требуют сочетания раннего обнаружения, распределённой сенсорики и понятного контура принятия решений.', character_count: 132, length_check: 'PASS' }];
export const visuals: Visual[] = [{ id: 'a1000000-0000-4000-8000-000000000001', visual_package_id: readyPackage.visual_package_id!, platform: 'TG', primary_type: 'SCHEME', primary_variant: 'Схема сенсорного контура', fallback_variant: 'Текстовая схема в подписи', source_link: 'SOURCE_LINK не задан', link_preview_status: 'NOT_REQUIRED', download_status: 'AVAILABLE', license_status: 'CONFIRMED', visual_status: 'VISUAL_READY', caption: 'Схема носит пояснительный характер', publication_instruction: 'Разместить после первого абзаца' }];
export const calendarSlots: CalendarSlot[] = [{ id: 'b0000000-0000-4000-8000-000000000001', platform: 'TG', proposed_at: date('16', '09:00:00'), confirmed_at: null, slot_status: 'PROPOSED' }, { id: 'b0000000-0000-4000-8000-000000000002', platform: 'VK', proposed_at: date('17', '12:00:00'), confirmed_at: date('17', '12:00:00'), slot_status: 'CONFIRMED' }];
export const history: HistoryEvent[] = [{ id: 'c0000000-0000-4000-8000-000000000001', event_type: 'TASK_CREATED', decision_type: null, actor_role: 'SYSTEM', route: 'RESEARCH', facts: ['Сигнал создан радаром'], limitations: ['signal_score не задан спецификацией'], unknown: [], created_at: date('10', '08:02:00') }];
export const agentRuns: AgentRun[] = [{ id: 'd0000000-0000-4000-8000-000000000001', agent_id: 'RESEARCHER', attempt_no: 1, stage: 'RESEARCH', run_status: 'COMPLETED', error_class: null, retry_count: 0, started_at: date('10', '08:03:00'), finished_at: date('10', '09:10:00') }];
export const results: AgentResult[] = [{ id: '70000000-0000-4000-8000-000000000002', version: 1, result_type: 'RESEARCH_RESULT', summary: 'Исследование защиты от роя дронов', created_at: date('14', '09:10:00') }];
export const claims: Claim[] = [{ id: 'e0000000-0000-4000-8000-000000000001', text: 'Распределённая сенсорика снижает время реакции на массовую атаку.', classification: 'CLAIM', verification_status: 'PROBABLE', source_count: null, source_reprint_count: null }];
export const publicationAttempts: PublicationAttempt[] = [];
export const commands: EditorCommand[] = [
  { id: 'f0000000-0000-4000-8000-000000000001', human_id: 'CMD-2026-09-14-001', raw_text: 'Подготовить материал о защите базы от роя дронов', role: 'EDITOR_IN_CHIEF', command_status: 'TASK_CREATED', parsed_command_type: 'DISCOVER', parsed_command_subtype: 'PUBLICATION_PACKAGE', parsed_depth_mode: 'FULL_PUBLICATION_PACKAGE', parsed_platforms: ['TG', 'VK'], ambiguity_flags: {}, classification_run_id: 'd0000000-0000-4000-8000-000000000002', task_id: ids.waiting, attachments: [], created_at: date('14', '09:20:00') },
  { id: 'f0000000-0000-4000-8000-000000000002', human_id: 'CMD-2026-09-14-002', raw_text: '', role: 'EDITOR_IN_CHIEF', command_status: 'REJECTED', parsed_command_type: null, parsed_command_subtype: null, parsed_depth_mode: null, parsed_platforms: null, ambiguity_flags: {}, classification_run_id: null, task_id: null, attachments: [{ id: 'fa000000-0000-4000-8000-000000000001', attachment_kind: 'IMAGE', original_filename: 'scheme.png', mime_type: 'image/png', size_bytes: 248000, attachment_status: 'NOT_SUPPORTED_MVP', rejection_reason: 'Получено, не разобрано в MVP' }], created_at: date('14', '09:30:00') },
  { id: 'f0000000-0000-4000-8000-000000000003', human_id: 'CMD-2026-09-14-003', raw_text: 'Проверить неоднозначную формулировку', role: 'EDITOR_IN_CHIEF', command_status: 'EDITOR_REVIEW', parsed_command_type: 'CHECK', parsed_command_subtype: 'FACT_CHECK', parsed_depth_mode: 'CHECK_ONLY', parsed_platforms: null, ambiguity_flags: { subject: true }, classification_run_id: 'd0000000-0000-4000-8000-000000000003', task_id: ids.waiting, attachments: [], created_at: date('14', '09:35:00') },
];