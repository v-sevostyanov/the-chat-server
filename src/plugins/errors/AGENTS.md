# AGENTS.md - src/plugins/errors

Единая HTTP error boundary: `setNotFoundHandler`, `setErrorHandler`, маппинг `AppError`, validation и unknown errors в стандартный envelope.

Правила:

- `AppError` отдается с корректным `statusCode/code/message`.
- Validation errors возвращают `400 VALIDATION_ERROR`.
- Unknown errors логируются и не утекают наружу.
- `details` не содержит stacktrace, secrets или driver-specific internals.
- Error envelope совместим с `shared/http/ErrorResponseSchema`.

Проверки: `npm run typecheck`, релевантные error tests.
