# AI-редакция — прототип

Рабочий React-прототип для проверки контрактов S09 на очереди задач, пакетах, решениях редактора, радаре, календаре, источниках и целях публикации.

## Run & Operate

- `pnpm --filter @workspace/ai-editorial-office run dev` — запустить веб-прототип
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React 19, Vite 7, TypeScript 5.9
- Локальный контрактный mock-слой; реального API, базы и авторизации нет

## Where things live

- `artifacts/ai-editorial-office/src/api/contracts.ts` — типы и перечисления S09
- `artifacts/ai-editorial-office/src/api/fixtures.ts` — данные mock-слоя
- `artifacts/ai-editorial-office/src/api/mock-server.ts` — GET/POST-маршрутизация и ошибки
- `artifacts/ai-editorial-office/src/api/client.ts` — единственная точка обращения UI к mock API
- `artifacts/ai-editorial-office/src/api/operations-table.ts` — материалы сдачи

## Architecture decisions

- Компоненты обращаются к данным только через `api/client.ts`.
- Разрешённость кнопок определяется только `available_actions`.
- Готовность пакета отображается только из `ready_for_review` и `blocking_reasons`.
- Операции решений используют только POST; PUT, PATCH и DELETE отсутствуют.

## Product

Подача и журнал команд, очередь задач, детальная карточка со вложенными коллекциями, рассмотрение пакетов и визуалов, решения редактора с подтверждениями и идемпотентностью, радар, календарь, источники, цели, запросы и контрактная карта сдачи.

## User preferences

- Интерфейс на русском; значения перечислений и коды ошибок остаются латинскими.
- Не додумывать отсутствующие поля и метрики: показывать прочерк и фиксировать претензию.

## Gotchas

- При расширении mock API сохранять порядок: контрактный слой → таблица операций → UI.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
