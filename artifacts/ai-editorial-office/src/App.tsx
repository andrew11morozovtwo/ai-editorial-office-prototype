import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { api, MockApiException } from '@/api/client';
import { actionComparisons, confirmationTexts, contractClaims, dashPlaces, screenOperations } from '@/api/operations-table';
import type { ApiError, Collection, CommandAttachmentInput, EditorCommand, EditorRequest, PlatformLimit, PublicationPackage, PublicationTarget, RadarRun, Signal, Source, Task, TaskDetail } from '@/api/contracts';
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, CalendarDays, Check, CircleDot, ClipboardList, Clock3, Code2, FileCheck2, Flag, Gauge, Inbox, Layers3, LifeBuoy, Loader2, LockKeyhole, Menu, Radar, RefreshCw, Search, Send, ShieldCheck, Sparkles, X, XCircle
} from 'lucide-react';
import { useLocation } from 'wouter';

const queryClient = new QueryClient();
const terminalStates = new Set(['PUBLISHED', 'REJECTED', 'ARCHIVED']);
const moscow = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'medium', timeStyle: 'short' });

type Screen = 'queue' | 'task' | 'package' | 'radar' | 'calendar' | 'sources' | 'requests' | 'commands' | 'contract';
type ActionDialog = { action: string; task: Task | null; key: string | null; packageId?: string; slotId?: string; targetId?: string; requestId?: string; sourceId?: string; resourceLabel?: string };

const label: Record<string, string> = {
  WAITING_FOR_EDITOR: 'ЖДЁТ РЕДАКТОРА', PUBLISHED: 'ОПУБЛИКОВАНО', REJECTED: 'ОТКЛОНЕНО', ARCHIVED: 'АРХИВ',
  RESEARCH: 'ИССЛЕДОВАНИЕ', ERROR: 'ОШИБКА', APPROVED: 'ОДОБРЕНО', SCHEDULED: 'ЗАПЛАНИРОВАНО', READY: 'ГОТОВ',
  DRAFT: 'ЧЕРНОВИК', PROPOSED: 'ПРЕДЛОЖЕН', CONFIRMED: 'ПОДТВЕРЖДЁН', OPEN: 'ОТКРЫТ', ANSWERED: 'ОТВЕЧЕН',
  NEW: 'НОВЫЙ', TASK_CREATED: 'ЗАДАЧА СОЗДАНА', DUPLICATE: 'ДУБЛИКАТ', CANDIDATE_SOURCE: 'КАНДИДАТ', RESTRICTED: 'ОГРАНИЧЕН',
  PRIMARY: 'ПЕРВИЧНЫЙ', SECONDARY: 'ВТОРИЧНЫЙ', DERIVED: 'ПРОИЗВОДНЫЙ', SANDBOX: 'SANDBOX', PRODUCTION: 'PRODUCTION',
  MOCK: 'MOCK', AI: 'AI', HUMAN: 'ЧЕЛОВЕК', PASS: 'ПРОЙДЕН', FAIL: 'НЕ ПРОЙДЕН'
};
const actionLabels: Record<string, string> = { approve: 'Одобрить', reject: 'Отклонить', rework: 'На доработку', schedule: 'Запланировать', publish: 'Опубликовать', answer_request: 'Ответить на запрос', set_priority: 'Изменить приоритет', approve_source: 'Одобрить класс источника', promote_target: 'Повысить цель' };

function text(value: unknown): string {
  if (value === null || value === undefined || value === '') return '— значение не задано спецификацией';
  return String(value);
}
function date(value: string | null | undefined): string { return value ? moscow.format(new Date(value)) : text(null); }
function newKey(): string { return globalThis.crypto?.randomUUID?.() ?? `editor-key-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function actionAllowed(task: Task | undefined, action: string): boolean { return Boolean(task?.available_actions.some((item) => item.action === action)); }
function display(value: string): string { return /^[A-Z][A-Z0-9_]*$/.test(value) ? value : (label[value] ?? value.replaceAll('_', ' ')); }
function titleOf(task: Task): string { return task.title ?? task.human_id ?? 'Задача без названия'; }

function ErrorCard({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const envelope: ApiError | null = error instanceof MockApiException ? error.envelope.error : null;
  const code = envelope?.code ?? 'UNEXPECTED_GATEWAY_ERROR';
  const tone = envelope?.http_status === 401 || envelope?.http_status === 403 ? 'error-auth' : envelope?.http_status === 501 ? 'error-stub' : envelope?.http_status === 409 ? 'error-rule' : envelope?.http_status === 422 ? 'error-validation' : envelope?.http_status === 504 ? 'error-timeout' : 'error-default';
  return <section className={`error-card ${tone}`} data-testid="status-api-error">
    <div className="flex items-start gap-3"><AlertTriangle size={20} /><div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><b>{code}</b><span className="mono-chip">{envelope?.http_status ?? 'CLIENT'}</span></div>
      <p className="mt-1 text-sm">{envelope?.message ?? (error instanceof Error ? error.message : 'Не удалось получить данные.')}</p>
      {envelope && <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
        <span><b>details</b><br /><code>{JSON.stringify(envelope.details) || '—'}</code></span>
        <span><b>task_id</b><br /><code>{text(envelope.task_id)}</code></span>
        <span><b>request_id</b><br /><code>{envelope.request_id}</code></span>
      </div>}
    </div>{onRetry && <button className="icon-button" onClick={onRetry} aria-label="Повторить" data-testid="button-retry"><RefreshCw size={16} /></button>}</div>
  </section>;
}

function Skeleton({ rows = 4 }: { rows?: number }) { return <div className="space-y-3 animate-pulse-soft" data-testid="status-loading">{Array.from({ length: rows }, (_, index) => <div className="skeleton-row" key={index} />)}</div>; }

function Badge({ value, className = '' }: { value: string; className?: string }) {
  const semantic = value.includes('ERROR') || value === 'REJECTED' || value === 'FAIL' ? 'badge-danger' : value === 'WAITING_FOR_EDITOR' || value === 'OPEN' ? 'badge-warn' : value === 'PUBLISHED' || value === 'APPROVED' || value === 'PASS' || value === 'CONFIRMED' ? 'badge-success' : 'badge-neutral';
  return <span className={`status-badge ${semantic} ${className}`} data-testid={`status-${value}`}>{display(value)}</span>;
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between">
    <div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>{action}
  </header>;
}

function Sidebar({ screen, onNavigate, mobileOpen, onClose }: { screen: Screen; onNavigate: (screen: Screen) => void; mobileOpen: boolean; onClose: () => void }) {
  const items: { id: Screen; title: string; icon: ReactNode; detail: string }[] = [
    { id: 'queue', title: 'Очередь', icon: <Inbox size={18} />, detail: 'решения' },
    { id: 'commands', title: 'Подать команду', icon: <Send size={18} />, detail: 'Э‑9' },
    { id: 'radar', title: 'Радар', icon: <Radar size={18} />, detail: 'сигналы' },
    { id: 'calendar', title: 'Календарь', icon: <CalendarDays size={18} />, detail: 'слоты' },
    { id: 'sources', title: 'Источники и цели', icon: <ShieldCheck size={18} />, detail: 'контроль' },
    { id: 'requests', title: 'Запросы редактору', icon: <LifeBuoy size={18} />, detail: 'входящие' },
    { id: 'contract', title: 'Контракт', icon: <Code2 size={18} />, detail: 'handoff' },
  ];
  return <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
    <div className="sidebar-brand"><div className="brand-mark"><Sparkles size={17} /></div><div><div className="brand-name">КОНТУР</div><div className="brand-sub">AI editorial office</div></div><button className="sidebar-close md:hidden" onClick={onClose} aria-label="Закрыть меню"><X size={18} /></button></div>
    <div className="sidebar-rule" />
    <div className="sidebar-caption">РАБОЧИЙ КОНТУР</div>
    <nav className="space-y-1" aria-label="Основная навигация">{items.map((item) => <button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} className={`nav-item ${screen === item.id || (screen === 'task' && item.id === 'queue') || (screen === 'package' && item.id === 'queue') ? 'nav-item-active' : ''}`} data-testid={`link-${item.id}`}><span className="nav-icon">{item.icon}</span><span className="flex-1 text-left"><span className="block">{item.title}</span><small>{item.detail}</small></span>{item.id === 'requests' && <span className="nav-ping">1</span>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-caption">СЕССИЯ</div><div className="session-card"><div className="session-dot" /><div><b>Редактор‑главный</b><span>EDITOR_IN_CHIEF</span></div></div><div className="mt-3 flex items-center justify-between text-[11px] text-sidebar-foreground/45"><span>MOCK gateway</span><span className="mono-chip mono-chip-dark">v1</span></div></div>
  </aside>;
}

function Topbar({ screen, onMenu }: { screen: Screen; onMenu: () => void }) {
  const names: Record<Screen, string> = { queue: 'Очередь решений', task: 'Карточка задачи', package: 'Пакет к рассмотрению', radar: 'Прогон радара', calendar: 'Календарь публикаций', sources: 'Источники и цели', requests: 'Запросы редактору', commands: 'Подача команды', contract: 'Contract handoff' };
  return <div className="topbar"><button className="icon-button md:hidden" onClick={onMenu} aria-label="Открыть меню" data-testid="button-menu"><Menu size={19} /></button><div className="breadcrumbs"><span className="text-muted-foreground">Контур</span><span>/</span><b>{names[screen]}</b></div><div className="topbar-right"><span className="live-indicator"><span /> MOCK / LOCAL</span><div className="avatar">ЕГ</div></div></div>;
}

function StatStrip({ tasks }: { tasks: Task[] }) {
  const waiting = tasks.filter((task) => task.current_state === 'WAITING_FOR_EDITOR').length;
  const active = tasks.filter((task) => !terminalStates.has(task.current_state)).length;
  const terminal = tasks.filter((task) => terminalStates.has(task.current_state)).length;
  return <div className="stat-strip"><div><span>ТРЕБУЮТ РЕШЕНИЯ</span><b>{waiting.toString().padStart(2, '0')}</b><small>приоритет очереди</small></div><div><span>В РАБОТЕ</span><b>{active.toString().padStart(2, '0')}</b><small>не терминальные</small></div><div><span>ЗАВЕРШЕНЫ</span><b>{terminal.toString().padStart(2, '0')}</b><small>без действий</small></div><div className="hidden sm:block"><span>ЧАСОВОЙ ПОЯС</span><b className="text-lg">MSK</b><small>Europe/Moscow</small></div></div>;
}

function Queue({ tasks, loading, error, onRetry, onOpen, onNavigate }: { tasks: Task[]; loading: boolean; error: unknown; onRetry: () => void; onOpen: (id: string) => void; onNavigate: (screen: Screen) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => tasks.filter((task) => `${titleOf(task)} ${task.human_id ?? ''} ${task.current_state}`.toLowerCase().includes(query.toLowerCase())), [tasks, query]);
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑1 / OPERATIONS QUEUE" title="Очередь решений" description="Одна рабочая поверхность для traceable решений главного редактора." action={<button className="secondary-button" onClick={() => onNavigate('contract')} data-testid="button-open-contract"><Code2 size={15} /> Контракт handoff</button>} /><StatStrip tasks={tasks} />
    <div className="toolbar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти задачу или состояние" data-testid="input-task-search" /></div><span className="toolbar-count">{filtered.length} из {tasks.length}</span></div>
    {loading ? <Skeleton /> : error ? <ErrorCard error={error} onRetry={onRetry} /> : <div className="queue-list">{filtered.map((task, index) => <TaskRow key={task.id} task={task} index={index} onOpen={onOpen} />)}{filtered.length === 0 && <div className="empty-state"><Search size={22} /><b>Задачи не найдены</b><span>Измените поисковый запрос.</span></div>}</div>}
  </div>;
}

function TaskRow({ task, index, onOpen }: { task: Task; index: number; onOpen: (id: string) => void }) {
  const waiting = task.current_state === 'WAITING_FOR_EDITOR';
  const terminal = terminalStates.has(task.current_state);
  return <button className={`task-row ${waiting ? 'task-row-priority' : ''}`} onClick={() => onOpen(task.id)} data-testid={`card-task-${task.id}`}><div className="task-index">{String(index + 1).padStart(2, '0')}</div><div className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><span className="mono-chip">{task.human_id ?? text(null)}</span>{waiting && <span className="priority-flag"><Flag size={11} /> СЕЙЧАС</span>}</div><h3>{titleOf(task)}</h3><p>{task.command_type} · {text(task.depth_mode)} · обновлено {date(task.updated_at)}</p></div><div className="task-meta"><Badge value={task.current_state} />{task.platforms && <span className="mono-chip">{task.platforms.join(' / ')}</span>}{!terminal && <span className="action-count">{task.available_actions.length} действий</span>}</div><ArrowUpRight size={17} className="row-arrow" /></button>;
}

 function Detail({ detail, loading, error, onRetry, onBack, onAction, onPackage }: { detail: TaskDetail | null; loading: boolean; error: unknown; onRetry: () => void; onBack: () => void; onAction: (action: string, task: Task) => void; onPackage: () => void }) {
  if (loading) return <><button className="back-button" onClick={onBack} data-testid="button-back-queue"><ArrowLeft size={15} /> Очередь</button><Skeleton rows={7} /></>;
  if (error || !detail) return <><button className="back-button" onClick={onBack} data-testid="button-back-queue"><ArrowLeft size={15} /> Очередь</button><ErrorCard error={error ?? new Error('Задача не найдена.')} onRetry={onRetry} /></>;
  return <div className="animate-rise"><button className="back-button" onClick={onBack} data-testid="button-back-queue"><ArrowLeft size={15} /> Очередь</button><SectionTitle eyebrow={`Э‑2 / ${detail.human_id ?? 'TASK'}`} title={titleOf(detail)} description={detail.context ?? 'Трасса задачи и все вложенные коллекции в одном месте.'} action={<Badge value={detail.current_state} />} />
    <div className="detail-hero"><div><span className="eyebrow">СОСТОЯНИЕ</span><div className="detail-state">{display(detail.current_state)}</div><p className="text-sm text-muted-foreground">Команда {detail.command_type} · источник {date(detail.source_date)}</p></div><div className="detail-facts"><Fact label="Приоритет" value={detail.priority} /><Fact label="Риск" value={detail.factual_risk} /><Fact label="Платформы" value={detail.platforms?.join(' / ')} /></div></div>
    <div className="action-panel"><div><span className="eyebrow">ДЕЙСТВИЯ ИЗ API</span><p className="mt-1 text-sm text-muted-foreground">Кнопки отображаются только по available_actions ответа задачи.</p></div><div className="action-buttons">{detail.available_actions.map((item) => <button key={item.action} className={`action-button ${item.action === 'reject' ? 'action-danger' : item.action === 'approve' ? 'action-primary' : ''}`} onClick={() => onAction(item.action, detail)} data-testid={`button-action-${item.action}`}><ActionIcon action={item.action} /> {actionLabels[item.action] ?? item.action}</button>)}{detail.available_actions.length === 0 && <span className="text-sm text-muted-foreground">Действия не предоставлены API.</span>}<button className="secondary-button" onClick={onPackage} data-testid="button-open-package"><FileCheck2 size={15} /> Пакет</button></div></div>
    <div className="detail-grid"><CollectionPanel title="История" icon={<Clock3 size={16} />} count={detail.history.length}>{detail.history.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div><div className="flex flex-wrap gap-2"><b>{item.event_type}</b><span className="mono-chip">{item.actor_role}</span></div><p>{item.facts.join(' · ')}</p><small>{date(item.created_at)}</small></div></div>)}</CollectionPanel><CollectionPanel title="Agent runs" icon={<Gauge size={16} />} count={detail.agent_runs.length}>{detail.agent_runs.map((item) => <div className="compact-row" key={item.id}><div><b>{item.agent_id}</b><small>{item.stage} · попытка {item.attempt_no}</small></div><Badge value={item.run_status} /></div>)}</CollectionPanel><CollectionPanel title="Claims" icon={<ShieldCheck size={16} />} count={detail.claims.length}>{detail.claims.map((item) => <div className="claim-row" key={item.id}><span className="claim-mark">{item.classification.slice(0, 1)}</span><div><b>{item.text}</b><small>{item.classification} · {item.verification_status} · источников {text(item.source_count)}</small></div></div>)}</CollectionPanel><CollectionPanel title="Drafts & visuals" icon={<Layers3 size={16} />} count={detail.drafts.length + detail.visuals.length}>{detail.drafts.map((item) => <div className="compact-row" key={item.id}><div><b>{item.platform} draft v{item.version}</b><small>{item.character_count} знаков</small></div><Badge value={item.length_check} /></div>)}{detail.visuals.map((item) => <div className="compact-row" key={item.id}><div><b>{item.platform} visual</b><small>{text(item.primary_type)} · {item.visual_status}</small></div><Badge value={item.license_status} /></div>)}</CollectionPanel><CollectionPanel title="Calendar slots" icon={<CalendarDays size={16} />} count={detail.calendar_slots.length}>{detail.calendar_slots.map((item) => <div className="compact-row" key={item.id}><div><b>{item.platform}</b><small>{date(item.proposed_at)}</small></div><Badge value={item.slot_status} /></div>)}</CollectionPanel><CollectionPanel title="Publication attempts" icon={<Send size={16} />} count={detail.publication_attempts.length}>{detail.publication_attempts.length ? detail.publication_attempts.map((item) => <div className="compact-row" key={item.id}><div><b>{item.platform}</b><small>{date(item.created_at)}</small></div><Badge value={item.attempt_status} /></div>) : <EmptyInline text="Успешных попыток в mock-слое нет." />}</CollectionPanel></div>
   <div className="detail-extra"><CollectionPanel title="Results" icon={<ClipboardList size={16} />} count={detail.results.length}>{detail.results.length ? detail.results.map((item) => <div className="compact-row" key={item.id}><div><b>{item.result_type} v{item.version}</b><small>{text(item.summary)} · {date(item.created_at)}</small></div></div>) : <EmptyInline text="Результатов нет." />}</CollectionPanel><CollectionPanel title="Packages" icon={<FileCheck2 size={16} />} count={detail.packages.length}>{detail.packages.length ? detail.packages.map((item) => <div className="compact-row" key={item.id}><div><b>{item.platform} · {item.package_status}</b><small>{item.id} · ready_for_review {String(item.ready_for_review)}</small></div><Badge value={item.length_check} /></div>) : <EmptyInline text="Пакетов нет." />}</CollectionPanel></div></div>;
}

function ActionIcon({ action }: { action: string }) { const icons: Record<string, ReactNode> = { approve: <Check size={14} />, reject: <XCircle size={14} />, rework: <RefreshCw size={14} />, schedule: <CalendarDays size={14} />, publish: <Send size={14} />, answer_request: <LifeBuoy size={14} />, set_priority: <Flag size={14} /> }; return icons[action] ?? <CircleDot size={14} />; }
function Fact({ label: factLabel, value }: { label: string; value: unknown }) { return <div><span>{factLabel}</span><b>{text(value)}</b></div>; }
function CollectionPanel({ title, icon, count, children }: { title: string; icon: ReactNode; count: number; children: ReactNode }) { return <section className="collection-panel"><div className="collection-head"><div className="flex items-center gap-2">{icon}<h2>{title}</h2></div><span className="mono-chip">{count}</span></div><div className="collection-body">{children}</div></section>; }
function EmptyInline({ text: emptyText }: { text: string }) { return <div className="empty-inline"><span>—</span>{emptyText}</div>; }

function PackageReview({ detail, loading, error, onRetry, onBack, onAction }: { detail: TaskDetail | null; loading: boolean; error: unknown; onRetry: () => void; onBack: () => void; onAction: (action: string, task: Task) => void }) {
  if (loading) return <Skeleton rows={5} />;
  if (error || !detail) return <ErrorCard error={error ?? new Error('Пакет не найден.')} onRetry={onRetry} />;
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑4 / REVIEW SURFACE" title="Пакет к рассмотрению" description={`${detail.human_id ?? 'Задача'} · ${titleOf(detail)}`} action={<button className="back-button" onClick={onBack} data-testid="button-back-detail"><ArrowLeft size={15} /> Карточка</button>} /><div className="package-callout"><div className="package-callout-icon"><FileCheck2 size={20} /></div><div><b>Готовность приходит из контракта</b><p>ready_for_review и blocking_reasons показаны как получены. Интерфейс ничего не вычисляет.</p></div></div><div className="package-list">{detail.packages.length ? detail.packages.map((item) => <PackageCard key={item.id} item={item} />) : <div className="empty-state"><FileCheck2 size={24} /><b>Пакетов нет</b><span>Вложенная коллекция пуста.</span></div>}</div><section className="data-section mt-6"><div className="section-bar"><div><div className="eyebrow">VISUAL PACKAGES</div><h2>Визуалы — семь полей отдельно</h2></div><span className="mono-chip">{detail.visuals.length}</span></div>{detail.visuals.length ? detail.visuals.map((item) => <article className="package-card" key={item.id} data-testid={`card-visual-${item.id}`}><div className="package-card-head"><div><span className="mono-chip">{item.platform}</span><h3>{item.visual_status}</h3></div><Badge value={item.license_status} /></div><div className="package-specs"><Fact label="Основной вариант" value={item.primary_variant} /><Fact label="Резервный вариант" value={item.fallback_variant} /><Fact label="Источник" value={item.source_link} /><Fact label="Статус скачивания" value={item.download_status} /><Fact label="Статус лицензии" value={item.license_status} /><Fact label="Подпись" value={item.caption} /><Fact label="Инструкция по публикации" value={item.publication_instruction} /></div></article>) : <EmptyInline text="Визуалов нет." />}</section>{actionAllowed(detail, 'approve') && <div className="sticky-review"><div><span className="eyebrow">DECISION GATE</span><b>Одобрение доступно из available_actions</b></div><button className="action-button action-primary" onClick={() => onAction('approve', detail)} data-testid="button-package-approve"><Check size={15} /> Одобрить пакет</button></div>}</div>;
}
function PackageCard({ item }: { item: PublicationPackage }) { return <article className={`package-card ${item.ready_for_review ? 'package-ready' : 'package-blocked'}`} data-testid={`card-package-${item.id}`}><div className="package-card-head"><div><span className="mono-chip">{item.platform}</span><h3>{display(item.package_status)}</h3></div><span className={`readiness ${item.ready_for_review ? 'readiness-ready' : 'readiness-blocked'}`}><span /> {item.ready_for_review ? 'READY_FOR_REVIEW' : 'BLOCKED'}</span></div>{item.visual_not_required && <div className="visual-not-required"><Check size={14} /> визуал не требуется — решение редактора</div>}<div className="package-specs"><Fact label="Длина" value={item.length_check} /><Fact label="Риск" value={item.factual_risk_snapshot} /><Fact label="Происхождение" value={item.content_origin} /><Fact label="Visual package" value={item.visual_package_id} />{item.visual_status === 'NOT_REQUIRED' && <><Fact label="Visual status" value={item.visual_status} /><Fact label="Visual risk" value={item.visual_risk} /><Fact label="Инструкция" value={item.publication_instruction} /></>}</div>{item.blocking_reasons.length > 0 && <div className="blocking-box"><AlertTriangle size={15} /><div><b>blocking_reasons</b>{item.blocking_reasons.map((reason) => <span key={reason}>{reason}</span>)}</div></div>}</article>; }

function RadarScreen({ runs, signals, selectedRun, loading, error, onRetry, onSelect }: { runs: Collection<RadarRun> | null; signals: Collection<Signal> | null; selectedRun: string | null; loading: boolean; error: unknown; onRetry: () => void; onSelect: (id: string) => void }) {
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑3 / DETECTION LAYER" title="Прогоны радара" description="Сигналы остаются отдельной сущностью до редакторского решения." /><div className="radar-layout"><div className="run-list">{loading ? <Skeleton rows={3} /> : error ? <ErrorCard error={error} onRetry={onRetry} /> : runs?.items.map((run) => <button className={`run-card ${selectedRun === run.id ? 'run-card-selected' : ''}`} key={run.id} onClick={() => onSelect(run.id)} data-testid={`card-radar-run-${run.id}`}><div className="flex items-center justify-between"><span className="eyebrow">{run.scan_type}</span><span className="run-outcome">{run.outcome === 'SIGNALS_FOUND' ? 'FOUND' : 'CLEAR'}</span></div><h3>{run.period}</h3><div className="run-footer"><span>{run.raw_detections_count} raw detections</span><span>{date(run.created_at)}</span></div></button>)}</div><section className="signals-panel"><div className="collection-head"><div><div className="eyebrow">SIGNALS</div><h2>{selectedRun ? 'Сигналы выбранного прогона' : 'Выберите прогон'}</h2></div><span className="mono-chip">{signals?.total ?? '—'}</span></div>{selectedRun && (signals ? <div className="signal-list">{signals.items.map((signal) => <div className="signal-row" key={signal.id}><div className="signal-score">{signal.signal_score ?? '—'}</div><div className="min-w-0 flex-1"><b>{signal.title}</b><p>{display(signal.disposition)} · score_breakdown {text(signal.score_breakdown)}</p></div>{signal.related_task_id && <ArrowUpRight size={15} />}</div>)}</div> : <Skeleton rows={5} />)}{!selectedRun && <div className="empty-state compact"><Radar size={24} /><b>Нет выбранного прогона</b><span>Левая колонка — только данные GET /radar_runs.</span></div>}</section></div></div>;
}

function CalendarScreen({ detail, loading, error, onRetry, onOpenTask }: { detail: TaskDetail | null; loading: boolean; error: unknown; onRetry: () => void; onOpenTask: (id: string) => void }) {
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑6 / SCHEDULING" title="Календарь публикаций" description="Предложенные и подтверждённые слоты из задачи, без собственной логики готовности." />{loading ? <Skeleton rows={4} /> : error ? <ErrorCard error={error} onRetry={onRetry} /> : <><div className="calendar-focus"><div><span className="eyebrow">ФОКУС</span><h2>{detail ? titleOf(detail) : 'Задача не выбрана'}</h2><p>{detail?.human_id ?? text(null)}</p></div>{detail && <button className="secondary-button" onClick={() => onOpenTask(detail.id)} data-testid="button-calendar-task"><ArrowUpRight size={15} /> Открыть задачу</button>}</div><div className="calendar-grid">{(detail?.calendar_slots ?? []).map((slot) => <div className="calendar-slot" key={slot.id}><div className="slot-date"><span>{new Date(slot.proposed_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short' })}</span><b>{new Date(slot.proposed_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit' })}</b></div><div><span className="mono-chip">{slot.platform}</span><h3>{date(slot.proposed_at)}</h3><p>Подтверждено: {date(slot.confirmed_at)}</p></div><Badge value={slot.slot_status} /></div>)}{!detail?.calendar_slots.length && <div className="empty-state"><CalendarDays size={24} /><b>Слотов нет</b><span>Вложенная коллекция calendar_slots пуста.</span></div>}</div></>}</div>;
}

function SourcesScreen({ sources, targets, platforms, loading, error, onRetry, onApproveSource, onPromoteTarget }: { sources: Collection<Source> | null; targets: Collection<PublicationTarget> | null; platforms: PlatformLimit[]; loading: boolean; error: unknown; onRetry: () => void; onApproveSource: (source: Source) => void; onPromoteTarget: (target: PublicationTarget) => void }) {
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑7 / TRUST LAYER" title="Источники и цели" description="Классификации источника, цели и gateway не смешиваются с контентом." />{loading ? <Skeleton rows={7} /> : error ? <ErrorCard error={error} onRetry={onRetry} /> : <div className="sources-layout"><section className="data-section"><div className="section-bar"><div><div className="eyebrow">SOURCE CLASSES</div><h2>Классы источников</h2></div><span className="mono-chip">{sources?.total ?? 0}</span></div>{sources?.items.map((source) => <div className="source-row" key={source.id}><div className={`source-grade grade-${source.reliability}`}>{source.reliability}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{source.human_id}</b><Badge value={source.status} /></div><h3>{source.title}</h3><p>{text(source.note)} · максимум {text(source.reliability_max)}</p></div>{source.status !== 'APPROVED' && <button className="small-button" onClick={() => onApproveSource(source)} data-testid={`button-approve-source-${source.id}`}><Check size={14} /> Одобрить класс</button>}</div>)}</section><section className="data-section"><div className="section-bar"><div><div className="eyebrow">PUBLICATION TARGETS</div><h2>Цели публикации</h2></div><span className="mono-chip">{targets?.total ?? 0}</span></div>{targets?.items.map((target) => <div className="target-row" key={target.id}><div className="target-logo">{target.platform}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{target.human_id}</b><Badge value={target.environment} /></div><h3>{target.title}</h3><p>gateway {target.gateway_mode} · decision {text(target.promoted_by_decision_id)}</p></div>{target.environment === 'SANDBOX' && <button className="small-button small-button-warn" onClick={() => onPromoteTarget(target)} data-testid={`button-promote-target-${target.id}`}><ArrowUpRight size={14} /> Promote</button>}</div>)}<div className="platform-limits"><div className="eyebrow">PLATFORM LIMITS</div>{platforms.map((platform) => <div className="limit-row" key={platform.platform}><b>{platform.platform}</b><span>{platform.max_characters} знаков</span><span>visual {platform.visual_required ? 'required' : 'optional'}</span></div>)}</div></section></div>}</div>;
}

function RequestsScreen({ requests, loading, error, onRetry, onAnswer }: { requests: Collection<EditorRequest> | null; loading: boolean; error: unknown; onRetry: () => void; onAnswer: (request: EditorRequest) => void }) {
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑8 / EDITOR LOOP" title="Запросы редактору" description="WAITING_FOR_EDITOR — отдельный приоритетный блок очереди. Ответ фиксируется решением задачи." />{loading ? <Skeleton rows={3} /> : error ? <ErrorCard error={error} onRetry={onRetry} /> : <div className="request-list">{requests?.items.map((request) => <article className={`request-card ${request.request_status === 'OPEN' ? 'request-open' : ''}`} key={request.id} data-testid={`card-request-${request.id}`}><div className="request-head"><span className="mono-chip">{request.id.slice(0, 13)}</span><Badge value={request.request_status} /><span className="ml-auto text-xs text-muted-foreground">{date(request.created_at)}</span></div><h2>{request.question}</h2><div className="request-options">{request.options.map((option, index) => <button key={option} className="request-option" onClick={() => onAnswer({ ...request, options: [option] })} data-testid={`button-answer-request-${request.id}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{option}<ArrowUpRight size={15} /></button>)}</div><p className="request-foot">task_id <code>{request.task_id}</code> · ответ: {text(request.answer)}</p></article>)}{!requests?.items.length && <div className="empty-state"><LifeBuoy size={24} /><b>Открытых запросов нет</b><span>Рабочая очередь редактора чиста.</span></div>}</div>}</div>;
}

function CommandsScreen({ commands, loading, error, onSubmit, onRetry }: { commands: Collection<EditorCommand> | null; loading: boolean; error: any; onSubmit: (rawText: string, kind: string, metadata: { filename: string; uri: string }) => Promise<void>; onRetry: () => void }) {
  const [rawText, setRawText] = useState('');
  const [kind, setKind] = useState('TEXT');
  const [filename, setFilename] = useState('');
  const [uri, setUri] = useState('');
  const submit = async () => { await onSubmit(rawText, kind, { filename, uri }); };
  return <div className="animate-rise"><SectionTitle eyebrow="Э‑9 / COMMAND INTAKE" title="Подача команды" description="Свободная команда без выбора типа, глубины и платформ: маршрут определяет ORCHESTRATOR." /><div className="command-layout"><section className="data-section command-form"><div className="section-bar"><div><div className="eyebrow">POST /api/v1/commands</div><h2>Новая команда</h2></div><span className="mono-chip">метаданные</span></div><label className="field-label">Текст команды<textarea value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="Например: подготовить материал по найденному сигналу" data-testid="input-command" /></label><div className="command-fields"><label className="field-label">Вид вложения<select value={kind} onChange={(event) => setKind(event.target.value)} data-testid="select-attachment-kind">{['TEXT', 'LINK', 'IMAGE', 'PDF', 'AUDIO', 'VIDEO_LINK', 'OTHER'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Имя файла<input value={filename} onChange={(event) => setFilename(event.target.value)} placeholder="только метаданные" data-testid="input-attachment-filename" /></label>{(kind === 'LINK' || kind === 'VIDEO_LINK') && <label className="field-label">source_uri<input value={uri} onChange={(event) => setUri(event.target.value)} placeholder="https://…" data-testid="input-attachment-uri" /></label>}</div><div className="command-guard"><ShieldCheck size={17} /><div><b>Содержимое файла не отправляется</b><p>В запросе есть только attachment_kind, original_filename, mime_type, size_bytes и source_uri. В MVP принимаются только метаданные вложения.</p></div></div>{error && <ErrorCard error={error} />}<button className="action-button action-primary command-submit" onClick={submit} disabled={loading} data-testid="button-submit-command">{loading ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />} Подать команду</button></section><section className="contract-list outcomes-list"><div className="eyebrow">4 ИСХОДА</div><h2>Что может вернуть API</h2>{[['TASK_CREATED', 'Задача создана; тип и подтип определены сервером.'], ['NO_USABLE_COMMAND_CONTENT · 422', 'Вложения сохранены, но пригодного содержимого для задачи нет.'], ['EMPTY_COMMAND · 422', 'Ошибка показана у поля свободного ввода.'], ['ATTACHMENT_CONTENT_NOT_ACCEPTED · 422', 'Ошибка списка вложений: в MVP принимаются только метаданные вложения.']].map(([code, copy]) => <div className="contract-item" key={code}><span>•</span><p><b>{code}</b><br />{copy}</p></div>)}</section></div><section className="table-shell mt-6"><div className="section-bar"><div><div className="eyebrow">GET /api/v1/commands</div><h2>Журнал неизменяемых команд</h2></div><span className="mono-chip">{commands?.total ?? 0}</span></div>{commands?.items.map((command) => <article className="command-row" key={command.id}><div><div className="flex flex-wrap items-center gap-2"><b>{command.human_id}</b><Badge value={command.command_status} /></div><p>{command.raw_text || '— команда без текста'}</p></div><div className="command-result"><Fact label="Тип" value={command.parsed_command_type} /><Fact label="Подтип, справочно" value={command.parsed_command_subtype} /><Fact label="Глубина" value={command.parsed_depth_mode} /><Fact label="Платформы" value={command.parsed_platforms?.join(' / ')} /></div>{command.attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><span className="mono-chip">{attachment.attachment_kind}</span><b>{attachment.original_filename ?? attachment.source_uri ?? 'метаданные'}</b><Badge value={attachment.attachment_status} /><small>{attachment.rejection_reason ?? 'принято'}</small></div>)}</article>)}</section></div>;
}

function ContractScreen() {
  return <div className="animate-rise"><SectionTitle eyebrow="HANDOFF / S01—S09" title="Контрактная карта" description="Что можно нажать в демонстрации и как эти же действия будут работать в настоящей программе." action={<span className="contract-stamp"><Check size={14} /> MOCK CONTRACT</span>} /><div className="contract-hero"><div className="contract-number">09</div><div><h2>Демонстрация безопасна</h2><p>Сейчас кнопки изменяют только локальные mock-данные. В настоящей программе те же действия будут обращаться к защищённому серверу, сохранять аудит и запускать рабочий процесс.</p></div></div><section className="table-shell"><div className="section-bar"><div><div className="eyebrow">SCREEN → OPERATION → RESULT</div><h2>Экраны и действия настоящей программы</h2></div><span className="mono-chip">{screenOperations.length} экранов</span></div><div className="ops-table"><div className="ops-row ops-head"><span>ЭКРАН</span><span>ОПЕРАЦИИ API</span><span>ЧТО ПРОИЗОЙДЁТ В ПРОГРАММЕ</span></div>{screenOperations.map((item) => <div className="ops-row" key={item.screen}><b>{item.screen}</b><div>{item.operations.map((operation) => <code key={operation}>{operation}</code>)}</div><p className="production-copy">{item.production}</p></div>)}</div></section><section className="table-shell mt-6"><div className="section-bar"><div><div className="eyebrow">DEMO → PRODUCTION</div><h2>Что делают кнопки</h2></div><span className="mono-chip">{actionComparisons.length} действий</span></div><div className="action-comparison"><div className="action-comparison-row action-comparison-head"><span>ДЕЙСТВИЕ</span><span>СЕЙЧАС В ПРОТОТИПЕ</span><span>В НАСТОЯЩЕЙ ПРОГРАММЕ</span></div>{actionComparisons.map((item) => <div className="action-comparison-row" key={item.action}><b>{item.action}</b><p>{item.prototype}</p><p>{item.production}</p></div>)}</div></section><div className="contract-columns"><section className="contract-list"><div className="eyebrow">CONTRACT CONCERNS</div><h2>Что требует внимания</h2>{contractClaims.map((claim, index) => <div className="contract-item" key={claim}><span>{String(index + 1).padStart(2, '0')}</span><p>{claim}</p></div>)}</section><section className="contract-list"><div className="eyebrow">DASH LIST</div><h2>Даши на экране</h2>{dashPlaces.map((dash) => <div className="dash-item" key={dash}><span>—</span><p>{dash}</p></div>)}</section></div><section className="contract-list mt-6"><div className="eyebrow">CONFIRMATION COPY</div><h2>Кнопки и полные тексты подтверждений</h2>{confirmationTexts.map((copy, index) => <div className="contract-item" key={copy}><span>{String(index + 1).padStart(2, '0')}</span><p>{copy}</p></div>)}</section></div>;
}

function ConfirmDialog({ dialog, onClose, onSubmit, loading, request, targets }: { dialog: ActionDialog; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void; loading: boolean; request?: EditorRequest; targets: Collection<PublicationTarget> | null }) {
  const [value, setValue] = useState(dialog.action === 'set_priority' ? 'HIGH' : dialog.action === 'answer_request' ? request?.options[0] ?? '' : '');
  const [targetId, setTargetId] = useState(dialog.targetId ?? '');
  const confirmationIndex: Record<string, number> = { approve: 0, rework: 1, reject: 2, schedule: 3, publish: 4, answer_request: 5, set_priority: 6, approve_source: 7, promote_target: 8 };
  const copy = dialog.action === 'approve_source'
    ? `Одобрить класс источника ${dialog.resourceLabel ?? dialog.sourceId ?? 'SOURCE'} как допустимый? Это решение относится к классу, а не к конкретному сайту, и необратимо.`
    : dialog.action === 'promote_target'
      ? `Повысить цель ${dialog.resourceLabel ?? dialog.targetId ?? 'TARGET'} до PRODUCTION? После продвижения цель нельзя считать SANDBOX, действие необратимо.`
      : confirmationTexts[confirmationIndex[dialog.action] ?? 0];
  const isText = ['rework', 'reject', 'answer_request', 'set_priority'].includes(dialog.action);
  const publish = dialog.action === 'publish';
  const fieldLabel = dialog.action === 'answer_request' ? 'Выбранный ответ' : dialog.action === 'set_priority' ? 'Новое значение priority' : 'Причина решения';
  const payload = publish ? { package_target_pairs: [{ package_id: dialog.packageId, target_id: targetId }] } : dialog.action === 'approve' ? { publication_package_ids: dialog.packageId ? [dialog.packageId] : [] } : dialog.action === 'schedule' ? { calendar_slot_id: dialog.slotId, publication_package_ids: dialog.packageId ? [dialog.packageId] : [] } : dialog.action === 'answer_request' ? { editor_request_id: dialog.requestId, answer: value } : dialog.action === 'rework' || dialog.action === 'reject' ? { reason: value } : dialog.action === 'set_priority' ? { priority: value } : {};
  return <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-top"><div className="dialog-icon"><LockKeyhole size={18} /></div><button className="icon-button" onClick={onClose} aria-label="Закрыть" data-testid="button-close-dialog"><X size={18} /></button></div><div className="eyebrow">EDITOR DECISION / {dialog.action.toUpperCase()}</div><h2 id="dialog-title">{actionLabels[dialog.action] ?? display(dialog.action)}</h2><p className="dialog-copy">{copy}</p>{isText && <label className="field-label">{fieldLabel}<textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Зафиксируйте значение в решении" data-testid="input-dialog-value" /></label>}{publish && <label className="field-label">Цель публикации<select value={targetId} onChange={(event) => setTargetId(event.target.value)} data-testid="select-dialog-target"><option value="">Выберите target_id</option>{targets?.items.map((target) => <option key={target.id} value={target.id}>{target.human_id} · {target.environment}</option>)}</select></label>}<div className="dialog-note"><span className="mono-chip">Idempotency-Key</span><code>{dialog.key ?? 'не требуется'}</code>{dialog.key && <small>Ключ стабилен до закрытия этого диалога.</small>}</div><div className="dialog-actions"><button className="secondary-button" onClick={onClose} data-testid="button-cancel-dialog">Отмена</button><button className={`action-button ${dialog.action === 'reject' ? 'action-danger' : 'action-primary'}`} onClick={() => onSubmit(payload)} disabled={loading || (isText && !value.trim()) || (publish && !targetId)} data-testid="button-confirm-dialog">{loading ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} {loading ? 'Отправка…' : 'Подтвердить решение'}</button></div></div></div>;
}

function AppShell() {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Collection<RadarRun> | null>(null);
  const [signals, setSignals] = useState<Collection<Signal> | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [sources, setSources] = useState<Collection<Source> | null>(null);
  const [targets, setTargets] = useState<Collection<PublicationTarget> | null>(null);
  const [platforms, setPlatforms] = useState<PlatformLimit[]>([]);
  const [requests, setRequests] = useState<Collection<EditorRequest> | null>(null);
  const [commands, setCommands] = useState<Collection<EditorCommand> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [dialog, setDialog] = useState<ActionDialog | null>(null);
  const [dialogRequest, setDialogRequest] = useState<EditorRequest | undefined>();
  const [mutationLoading, setMutationLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const screen: Screen = location.startsWith('/task/') ? 'task' : location.startsWith('/package/') ? 'package' : location.startsWith('/radar') ? 'radar' : location.startsWith('/calendar') ? 'calendar' : location.startsWith('/sources') ? 'sources' : location.startsWith('/requests') ? 'requests' : location.startsWith('/commands') ? 'commands' : location.startsWith('/contract') ? 'contract' : 'queue';
  const pathId = location.split('/')[2] || null;

  const load = async (job: () => Promise<void>) => { setLoading(true); setError(null); try { await job(); } catch (caught) { setError(caught); } finally { setLoading(false); } };
  const loadTasks = () => load(async () => { const [taskCollection] = await Promise.all([api.getTasks(), api.getEnums()]); setTasks(taskCollection.items); });
  useEffect(() => { void loadTasks(); }, []);
  useEffect(() => { if ((screen === 'task' || screen === 'package' || screen === 'calendar') && pathId) { setSelectedTaskId(pathId); void load(async () => setTaskDetail(await api.getTask(pathId))); } }, [screen, pathId]);
  useEffect(() => { if (screen === 'radar') { void load(async () => { const collection = await api.getRadarRuns(); setRuns(collection); if (!selectedRun && collection.items[0]) setSelectedRun(collection.items[0].id); }); } }, [screen]);
  useEffect(() => { if (screen === 'radar' && selectedRun) void load(async () => setSignals(await api.getRadarSignals(selectedRun))); }, [selectedRun, screen]);
  useEffect(() => { if (screen === 'sources') void load(async () => { const [sourceData, targetData, platformData] = await Promise.all([api.getSources(), api.getPublicationTargets(), api.getPlatforms()]); setSources(sourceData); setTargets(targetData); setPlatforms(platformData.items); }); }, [screen]);
  useEffect(() => { if (screen === 'requests') void load(async () => setRequests(await api.getEditorRequests())); }, [screen]);
  useEffect(() => { if (screen === 'commands') void load(async () => setCommands(await api.getCommands())); }, [screen]);
  useEffect(() => { if (screen === 'calendar' && !pathId && tasks[0]) setLocation(`/calendar/${tasks[0].id}`); }, [screen, pathId, tasks]);
  const navigate = (next: Screen) => { const route: Record<Screen, string> = { queue: '/', task: selectedTaskId ? `/task/${selectedTaskId}` : '/', package: selectedTaskId ? `/package/${selectedTaskId}` : '/', radar: '/radar', calendar: selectedTaskId ? `/calendar/${selectedTaskId}` : tasks[0] ? `/calendar/${tasks[0].id}` : '/calendar', sources: '/sources', requests: '/requests', commands: '/commands', contract: '/contract' }; setLocation(route[next]); };
  const openTask = (id: string) => { setSelectedTaskId(id); setLocation(`/task/${id}`); };
  const openDialog = (action: string, task: Task | null, extra: Partial<ActionDialog> = {}) => setDialog({ action, task, key: ['approve', 'schedule', 'publish'].includes(action) ? newKey() : null, ...extra });
  const openForTask = (action: string, task: Task) => { if (!actionAllowed(task, action)) return; const pack = taskDetail?.packages.find((item) => item.ready_for_review)?.id; const slot = taskDetail?.calendar_slots.find((item) => item.slot_status === 'PROPOSED' || item.slot_status === 'CONFIRMED')?.id; if (action === 'publish' && !targets) void load(async () => setTargets(await api.getPublicationTargets())); openDialog(action, task, { packageId: pack, slotId: slot }); };
  const submitDecision = async (payload: Record<string, unknown>) => {
    if (!dialog) return;
    setMutationLoading(true);
    try {
      if (dialog.action === 'approve_source' && dialog.sourceId) {
        await api.approveSource(dialog.sourceId);
        setNotice(`Класс ${dialog.resourceLabel ?? dialog.sourceId} одобрен.`);
        setSources((current) => current ? { ...current, items: current.items.map((item) => item.id === dialog.sourceId ? { ...item, status: 'APPROVED' } : item) } : current);
      } else if (dialog.action === 'promote_target' && dialog.targetId) {
        await api.promoteTarget(dialog.targetId);
        setNotice(`Цель ${dialog.resourceLabel ?? dialog.targetId} повышена до PRODUCTION.`);
        setTargets((current) => current ? { ...current, items: current.items.map((item) => item.id === dialog.targetId ? { ...item, environment: 'PRODUCTION' } : item) } : current);
      } else if (dialog.task) {
        const result = await api.decide(dialog.task.id, dialog.action, payload, dialog.key ?? undefined);
        setNotice(result.replayed ? 'решение уже принято' : 'Решение записано в историю.');
        if (dialog.action === 'answer_request') setRequests(await api.getEditorRequests());
        await loadTasks();
        if (selectedTaskId) await load(async () => setTaskDetail(await api.getTask(selectedTaskId)));
      }
      setDialog(null);
    } catch (caught) { setError(caught); } finally { setMutationLoading(false); }
  };
  const startSourceApproval = (source: Source) => setDialog({ action: 'approve_source', task: null, key: null, sourceId: source.id, resourceLabel: source.human_id });
  const startTargetPromotion = (target: PublicationTarget) => setDialog({ action: 'promote_target', task: null, key: null, targetId: target.id, resourceLabel: target.human_id });
  const startAnswer = (request: EditorRequest) => { const task = tasks.find((item) => item.id === request.task_id); if (task) { setDialogRequest(request); openDialog('answer_request', task, { requestId: request.id }); } };
  const submitCommand = async (rawText: string, kind: string, metadata: { filename: string; uri: string }) => {
    setLoading(true);
    setError(null);
    try {
      const attachments: CommandAttachmentInput[] = (metadata.filename || metadata.uri || kind !== 'TEXT') ? [{ attachment_kind: kind as CommandAttachmentInput['attachment_kind'], ...(metadata.filename ? { original_filename: metadata.filename, mime_type: kind === 'IMAGE' ? 'image/*' : 'application/octet-stream', size_bytes: 0 } : {}), ...(metadata.uri ? { source_uri: metadata.uri } : {}) }] : [];
      await api.submitCommand({ raw_text: rawText, attachments });
      setCommands(await api.getCommands());
      setNotice('Команда принята и разобрана ORCHESTRATOR.');
    } catch (caught) {
      setError(caught);
      setCommands(await api.getCommands());
    } finally { setLoading(false); }
  };
  const render = () => {
    if (screen === 'queue') return <Queue tasks={tasks} loading={loading} error={error} onRetry={loadTasks} onOpen={openTask} onNavigate={navigate} />;
    if (screen === 'task') return <Detail detail={taskDetail} loading={loading} error={error} onRetry={() => selectedTaskId && void load(async () => setTaskDetail(await api.getTask(selectedTaskId)))} onBack={() => navigate('queue')} onAction={openForTask} onPackage={() => selectedTaskId && setLocation(`/package/${selectedTaskId}`)} />;
    if (screen === 'package') return <PackageReview detail={taskDetail} loading={loading} error={error} onRetry={() => selectedTaskId && void load(async () => setTaskDetail(await api.getTask(selectedTaskId)))} onBack={() => navigate('task')} onAction={openForTask} />;
    if (screen === 'radar') return <RadarScreen runs={runs} signals={signals} selectedRun={selectedRun} loading={loading} error={error} onRetry={() => void load(async () => { const collection = await api.getRadarRuns(); setRuns(collection); })} onSelect={setSelectedRun} />;
    if (screen === 'calendar') return <CalendarScreen detail={taskDetail} loading={loading} error={error} onRetry={() => selectedTaskId && void load(async () => setTaskDetail(await api.getTask(selectedTaskId)))} onOpenTask={openTask} />;
    if (screen === 'sources') return <SourcesScreen sources={sources} targets={targets} platforms={platforms} loading={loading} error={error} onRetry={() => void load(async () => { const [sourceData, targetData, platformData] = await Promise.all([api.getSources(), api.getPublicationTargets(), api.getPlatforms()]); setSources(sourceData); setTargets(targetData); setPlatforms(platformData.items); })} onApproveSource={startSourceApproval} onPromoteTarget={startTargetPromotion} />;
    if (screen === 'requests') return <RequestsScreen requests={requests} loading={loading} error={error} onRetry={() => void load(async () => setRequests(await api.getEditorRequests()))} onAnswer={startAnswer} />;
    if (screen === 'commands') return <CommandsScreen commands={commands} loading={loading} error={error} onRetry={() => void load(async () => setCommands(await api.getCommands()))} onSubmit={submitCommand} />;
    return <ContractScreen />;
  };
  return <div className="app-shell grain"><Sidebar screen={screen} onNavigate={navigate} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />{mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню" data-testid="button-close-menu" /> }<main className="main-area"><Topbar screen={screen} onMenu={() => setMobileOpen(true)} /><div className="main-content">{Boolean(error) && !loading && screen !== 'queue' && !['task', 'package', 'radar', 'calendar', 'sources', 'requests'].includes(screen) && <ErrorCard error={error} />}{render()}</div></main>{notice && <div className="toast-note" role="status" data-testid="status-notice"><Check size={16} /> {notice}<button onClick={() => setNotice(null)} aria-label="Закрыть уведомление"><X size={14} /></button></div>}{dialog && <ConfirmDialog dialog={dialog} onClose={() => setDialog(null)} onSubmit={submitDecision} loading={mutationLoading} request={dialogRequest} targets={targets} />}</div>;
}

function Router() { return <ErrorBoundary resetKey={location.pathname}><AppShell /></ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;