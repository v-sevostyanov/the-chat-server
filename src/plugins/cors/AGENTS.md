# AGENTS.md - src/plugins/cors

## Реальная ответственность директории

CORS policy через `onRequest` hook:

- explicit allowlist из config;
- удобные local/private origins только вне production;
- credentialed responses без wildcard origin.

## Что менять здесь уместно

- Алгоритм allow/deny origin.
- Заголовки CORS и preflight handling.

## Что менять здесь неуместно

- Auth/session бизнес-правила.
- Route-specific логику модулей.

## Границы зависимостей

- Использовать только Fastify hooks и сетевые утилиты.
- Не зависеть от доменных модулей.

## Куда класть новый код

- В `cors.plugin.ts`.

## Связанные файлы

- `src/app/app.ts`
- `src/plugins/errors/errors.plugin.ts`

## Локальный чеклист перед завершением

1. Неразрешенные origin не получают CORS headers.
2. `OPTIONS` возвращает `204`.
3. Нет случайного `Allow-Origin: *`.
4. В production разрешены только origins из `CORS_ALLOWED_ORIGINS`.
5. `Vary: Origin` сохраняется при отражении origin.
6. `npm run typecheck`, `npm run lint`.

## Типичные ошибки будущего агента

- Открыть CORS для всех источников ради "удобства".
- Внести сюда route-specific проверку вместо общей политики.
- Случайно разрешить private/local origins в production.
