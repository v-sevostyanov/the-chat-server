# src/plugins/errors

## Назначение

Единая обработка ошибок и not-found сценариев для HTTP API.

## Поведение

### Not Found

- Любой неизвестный route получает:
  - HTTP `404`
  - payload `{ error: { code: "NOT_FOUND", message: "Route does not exist." } }`

### AppError

- Ошибки типа `AppError` отдаются с исходными:
  - `statusCode`
  - `code`
  - `message`
  - `details?`

### Ошибка валидации

- Ошибки валидации Fastify преобразуются в:
  - HTTP `400`
  - `code: "VALIDATION_ERROR"`
  - `details` с исходной структурой validation issues.

### Неизвестная ошибка

- Логируется как `Unhandled error`.
- Клиент получает:
  - HTTP `500`
  - `code: "INTERNAL_ERROR"`
  - без утечки внутренних деталей.

## Почему это важно

- Гарантирует единый envelope ошибок для всех модулей.
- Снижает риск утечки внутренней информации.
- Упрощает клиентам обработку ошибок по `error.code`.

## Практика изменений

- Добавляя новые доменные ошибки, наследуйте `AppError`, а не возвращайте ad hoc объекты из handler.
- Не включайте stacktrace и чувствительные данные в публичный `details`.
