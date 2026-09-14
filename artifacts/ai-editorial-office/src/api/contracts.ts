export const API_PREFIX = '/api/v1';

export const ENUMS = {
  COMMAND_TYPE: ['DISCOVER', 'CHECK', 'CREATE', 'SERIES', 'REWORK', 'SCHEDULE', 'PUBLISH', 'ANSWER_REQUEST', 'ADMIN'],
  DEPTH_MODE: ['CHECK_ONLY', 'BRIEFING', 'SINGLE_POST', 'SERIES', 'FULL_PUBLICATION_PACKAGE'],
  TASK_STATE: ['NEW', 'RADAR', 'NORMALIZATION', 'DEDUPLICATION', 'RANKING', 'RESEARCH', 'FACT_CHECK', 'TECH_ANALYSIS', 'SERIES_PLANNING', 'WRITING', 'VISUAL', 'FINAL_EDIT_TG', 'FINAL_EDIT_VK', 'WAITING', 'WAITING_FOR_EDITOR', 'REWORK', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'ERROR'],
  LEVEL_4: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  CONFIDENCE: ['LOW', 'MEDIUM', 'HIGH'],
  SOURCE_RELIABILITY: ['A', 'B', 'C', 'D', 'E'],
  SOURCE_STATUS: ['APPROVED', 'CANDIDATE_SOURCE', 'RESTRICTED', 'REJECTED', 'UNKNOWN'],
  SOURCE_KIND: ['PRIMARY', 'SECONDARY', 'DERIVED'],
  CLAIM_CLASSIFICATION: ['FACT', 'CLAIM', 'HYPOTHESIS', 'EDITORIAL_CONCLUSION', 'UNKNOWN'],
  VERIFICATION_STATUS: ['CONFIRMED', 'PROBABLE', 'UNCONFIRMED', 'CONTRADICTED', 'NOT_CHECKED'],
  RISK_LEVEL: ['LOW', 'MEDIUM', 'HIGH'],
  AGENT_ID: ['AI_RADAR', 'RESEARCHER', 'FACT_CHECKER', 'TECH_ANALYST', 'KNOWLEDGE_BASE', 'SERIES_EDITOR', 'WRITER', 'VISUAL_AGENT', 'FINAL_EDITOR_TG', 'FINAL_EDITOR_VK', 'CALENDAR'],
  RUN_STATUS: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'INVALID_RESULT', 'CANCELLED'],
  SIGNAL_DISPOSITION: ['NEW', 'DUPLICATE', 'UPDATE_EXISTING_TOPIC', 'TASK_CREATED', 'ARCHIVED', 'EDITOR_REVIEW'],
  VISUAL_STATUS: ['VISUAL_READY', 'VISUAL_READY_LICENSE_CHECK', 'VISUAL_READY_WITH_FALLBACK', 'VISUAL_SCHEME_RECOMMENDED', 'NOT_REQUIRED', 'VISUAL_BLOCKED', 'LINK_PREVIEW_ONLY'],
  VISUAL_TYPE: ['DOCUMENTARY_PHOTO', 'OFFICIAL_RENDER', 'SCHEME', 'INFOGRAPHIC', 'LICENSED_ILLUSTRATION', 'AI_ILLUSTRATION_MARKED'],
  LINK_PREVIEW_STATUS: ['NOT_REQUIRED', 'EXPECTED', 'UNRELIABLE', 'NOT_AVAILABLE', 'NOT_CHECKED'],
  DOWNLOAD_STATUS: ['AVAILABLE', 'NOT_AVAILABLE', 'REQUIRES_MANUAL_DOWNLOAD', 'LICENSE_CHECK_REQUIRED'],
  LICENSE_STATUS: ['CONFIRMED', 'REQUIRES_CHECK', 'RESTRICTED', 'UNKNOWN'],
  PLATFORM: ['TG', 'VK'],
  ENVIRONMENT: ['SANDBOX', 'PRODUCTION'],
  CONTENT_ORIGIN: ['MOCK', 'AI', 'HUMAN'],
  LENGTH_CHECK: ['PASS', 'FAIL', 'NOT_CHECKED'],
  GATEWAY_MODE: ['MOCK', 'PRODUCTION'],
  DECISION_TYPE: ['APPROVE', 'REJECT', 'REWORK', 'SCHEDULE', 'PUBLISH', 'ANSWER_REQUEST', 'SET_PRIORITY', 'APPROVE_SOURCE', 'PROMOTE_TARGET'],
  ROLE: ['EDITOR_IN_CHIEF', 'OPERATOR', 'SYSTEM'],
  ATTEMPT_STATUS: ['SUCCESS', 'FAILED', 'RATE_LIMITED', 'REJECTED_BY_PLATFORM'],
  COMMAND_SUBTYPE: ['NEWS_RESEARCH', 'FACT_CHECK', 'TECHNICAL_ANALYSIS', 'BRIEFING', 'SINGLE_POST', 'PUBLICATION_PACKAGE', 'SERIES_PLAN', 'REWRITE', 'SCHEDULE_ITEM', 'PUBLISH_ITEM', 'EDITOR_ANSWER', 'SOURCE_REVIEW', 'TARGET_PROMOTION', 'RADAR_SCAN', 'SUMMARY', 'TRANSLATION', 'OTHER'],
  COMMAND_STATUS: ['RECEIVED', 'PROCESSING', 'TASK_CREATED', 'EDITOR_REVIEW', 'REJECTED'],
  ATTACHMENT_KIND: ['TEXT', 'LINK', 'IMAGE', 'PDF', 'AUDIO', 'VIDEO_LINK', 'OTHER'],
  ATTACHMENT_STATUS: ['ACCEPTED', 'NOT_SUPPORTED_MVP'],
} as const;

export type EnumName = keyof typeof ENUMS;
export type EnumValue<N extends EnumName> = (typeof ENUMS)[N][number];
export type TaskState = EnumValue<'TASK_STATE'>;
export type Platform = EnumValue<'PLATFORM'>;
export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'EMPTY_COMMAND' | 'NO_USABLE_COMMAND_CONTENT' | 'ATTACHMENT_CONTENT_NOT_ACCEPTED' | 'IDEMPOTENCY_KEY_REQUIRED' | 'IDEMPOTENCY_KEY_CONFLICT' | 'STATE_TRANSITION_FORBIDDEN' | 'PACKAGE_NOT_VALID' | 'VISUAL_STATUS_BLOCKING' | 'MOCK_TO_PRODUCTION_FORBIDDEN' | 'TARGET_NOT_PROMOTED' | 'EDITOR_REQUEST_ALREADY_ANSWERED' | 'PLATFORM_LIMIT_EXCEEDED' | 'STUB_NOT_IMPLEMENTED' | 'PRODUCTION_DISABLED_MVP' | 'GATEWAY_TIMEOUT' | 'REQUEST_INVALID' | 'PROMPT_TEMPLATE_NOT_FOUND' | 'PROMPT_TEMPLATE_INACTIVE' | 'PROMPT_VERSION_MISMATCH' | 'FIXTURE_NOT_FOUND' | 'UNEXPECTED_GATEWAY_ERROR';

export interface ApiError {
  code: ErrorCode;
  http_status: number;
  message: string;
  details: Record<string, unknown>;
  task_id: string | null;
  request_id: string;
}

export interface ApiErrorEnvelope {
  error: ApiError;
}

export interface Collection<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AvailableAction {
  action: string;
  path: string;
}

export interface Task {
  id: string;
  human_id: string | null;
  title: string | null;
  command_type: EnumValue<'COMMAND_TYPE'>;
  depth_mode: EnumValue<'DEPTH_MODE'> | null;
  current_state: TaskState;
  platforms: Platform[] | null;
  priority: string | null;
  urgency: EnumValue<'LEVEL_4'> | null;
  editorial_priority: string | null;
  factual_risk: EnumValue<'RISK_LEVEL'> | null;
  source_date: string | null;
  context: string | null;
  editor_command_id: string | null;
  series_id: string | null;
  current_result_id: string | null;
  error_class: string | null;
  retry_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  available_actions: AvailableAction[];
}

export interface HistoryEvent { id: string; event_type: string; decision_type: string | null; actor_role: EnumValue<'ROLE'>; route: string | null; facts: string[]; limitations: string[]; unknown: string[]; created_at: string; }
export interface AgentRun { id: string; agent_id: EnumValue<'AGENT_ID'>; attempt_no: number; stage: TaskState; run_status: EnumValue<'RUN_STATUS'>; error_class: string | null; retry_count: number; started_at: string | null; finished_at: string | null; }
export interface AgentResult { id: string; version: number; result_type: string; summary: string | null; created_at: string | null; }
export interface Claim { id: string; text: string; classification: EnumValue<'CLAIM_CLASSIFICATION'>; verification_status: EnumValue<'VERIFICATION_STATUS'>; source_count: number | null; source_reprint_count: number | null; }
export interface Draft { id: string; platform: Platform; version: number; text: string; character_count: number; length_check: EnumValue<'LENGTH_CHECK'>; }
export interface Visual { id: string; visual_package_id: string; platform: Platform; primary_type: EnumValue<'VISUAL_TYPE'> | null; primary_variant: string | null; fallback_variant: string | null; source_link: string | null; link_preview_status: EnumValue<'LINK_PREVIEW_STATUS'>; download_status: EnumValue<'DOWNLOAD_STATUS'>; license_status: EnumValue<'LICENSE_STATUS'>; visual_status: EnumValue<'VISUAL_STATUS'>; caption: string | null; publication_instruction: string | null; }
export interface PublicationPackage { id: string; platform: Platform; package_status: string; post_draft_id: string | null; visual_package_id: string | null; visual_status: EnumValue<'VISUAL_STATUS'> | null; visual_not_required: boolean; visual_risk: EnumValue<'RISK_LEVEL'> | null; publication_instruction: string | null; length_check: EnumValue<'LENGTH_CHECK'>; factual_risk_snapshot: EnumValue<'RISK_LEVEL'> | null; content_origin: EnumValue<'CONTENT_ORIGIN'>; ready_for_review: boolean; blocking_reasons: string[]; }
export interface CommandAttachmentInput { attachment_kind: EnumValue<'ATTACHMENT_KIND'>; original_filename?: string; mime_type?: string; size_bytes?: number; source_uri?: string; }
export interface CommandAttachment extends CommandAttachmentInput { id: string; attachment_status: EnumValue<'ATTACHMENT_STATUS'>; rejection_reason: string | null; }
export interface EditorCommand { id: string; human_id: string; raw_text: string; role: EnumValue<'ROLE'>; command_status: EnumValue<'COMMAND_STATUS'>; parsed_command_type: EnumValue<'COMMAND_TYPE'> | null; parsed_command_subtype: EnumValue<'COMMAND_SUBTYPE'> | null; parsed_depth_mode: EnumValue<'DEPTH_MODE'> | null; parsed_platforms: Platform[] | null; ambiguity_flags: Record<string, unknown>; classification_run_id: string | null; task_id: string | null; attachments: CommandAttachment[]; created_at: string; }
export interface SubmitCommandInput { raw_text: string; attachments: CommandAttachmentInput[]; }
export interface CalendarSlot { id: string; platform: Platform; proposed_at: string; confirmed_at: string | null; slot_status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED'; }
export interface PublicationAttempt { id: string; platform: Platform; target_id: string; attempt_no: number; attempt_status: EnumValue<'ATTEMPT_STATUS'>; platform_post_id: string | null; error_class: string | null; created_at: string; }
export interface RadarRun { id: string; scan_type: string; period: string; raw_detections_count: number; outcome: 'SIGNALS_FOUND' | 'NO_SIGNIFICANT_SIGNALS'; schedule_id: string | null; created_at: string | null; }
export interface Signal { id: string; title: string; disposition: EnumValue<'SIGNAL_DISPOSITION'>; duplicate_of_id: string | null; related_task_id: string | null; signal_score: number | null; score_breakdown: Record<string, unknown> | null; source_ids: string[] | null; detected_at: string | null; }
export interface Source { id: string; human_id: string; title: string; kind: EnumValue<'SOURCE_KIND'>; reliability: EnumValue<'SOURCE_RELIABILITY'>; reliability_max: EnumValue<'SOURCE_RELIABILITY'> | null; status: EnumValue<'SOURCE_STATUS'>; domain: string | null; note: string | null; approved_decision_id: string | null; }
export interface PublicationTarget { id: string; human_id: string; title: string; platform: Platform; environment: EnumValue<'ENVIRONMENT'>; promoted_by_decision_id: string | null; gateway_mode: EnumValue<'GATEWAY_MODE'>; }
export interface EditorRequest { id: string; task_id: string; request_status: 'OPEN' | 'ANSWERED'; question: string; options: string[]; answer: string | null; created_at: string; }
export interface PlatformLimit { platform: Platform; max_characters: number; visual_required: boolean; caption_required: boolean; }
export interface TaskDetail extends Task { history: HistoryEvent[]; agent_runs: AgentRun[]; results: AgentResult[]; claims: Claim[]; drafts: Draft[]; packages: PublicationPackage[]; visuals: Visual[]; calendar_slots: CalendarSlot[]; publication_attempts: PublicationAttempt[]; }

export interface DecisionResponse { task: Task; decision_id: string; history_event_id: string; replayed?: boolean; }