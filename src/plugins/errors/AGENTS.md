# AGENTS.md - src/plugins/errors

## Реальная ответственность директории

Единая HTTP error boundary:

- `setNotFoundHandler`;
- `setErrorHandler`;
- маппинг `AppError`, validation и unknown ошибок в стандартный envelope.

## Что менять здесь уместно

- Формат маппинга ошибок.
- Безопасность публичных error ответов.

## Что менять здесь неуместно

- Доменные бизнес-правила модулей.
- Route logic.

## Границы зависимостей

- Допустимо: `shared/errors/app-error`.
- Недопустимо: импорты `modules/*`.

## Куда класть новый код

- В `errors.plugin.ts`.

## Связанные файлы

- `src/shared/errors/app-error.ts`
- `src/shared/http/schemas.ts`

## Локальный чеклист перед завершением

1. `AppError` отдается с корректным `statusCode/code/message`.
2. Validation errors возвращают `400 VALIDATION_ERROR`.
3. Unknown errors логируются и не утекают в деталях.
4. `details` не содержит stacktrace, secrets или driver-specific internals.
5. Error envelope остается совместим с `shared/http/ErrorResponseSchema`.
6. `npm run typecheck`, `npm run test`.

## Типичные ошибки будущего агента

- Изменить envelope и забыть клиентов.
- Возвращать stacktrace в публичном response.
