# AGENTS.md - src/modules/health

## Реальная ответственность директории

Модуль `health` предоставляет:

- liveness endpoint-ы (`/health`, `/health/live`);
- readiness endpoint (`/health/ready`) для DB и Redis.

## Что менять здесь уместно

- Формат health/readiness ответов.
- Набор dependency checks и их агрегирование.
- Timeout/degraded поведение dependency checks.

## Что менять здесь неуместно

- Доменные бизнес-проверки модулей.
- Инициализацию DB/Redis клиентов (это plugins).

## Границы зависимостей

- Работать только через `checkDatabaseReadiness` и `checkRedisReadiness` decorators.
- Не создавать подключения к ресурсам внутри health-модуля.

## Куда класть новый код

- Routes/schemas: `health.routes.ts`.
- Логика status aggregation: `health.service.ts`.
- HTTP-обвязка: `health.handlers.ts`.

## Связанные файлы

- `src/plugins/db/db.plugin.ts`
- `src/plugins/redis/redis.plugin.ts`

## Локальный чеклист перед завершением

1. `ready` возвращает `503`, если хотя бы одна dependency down.
2. В ответ не утекают внутренние stacktrace.
3. `live` остается легким и быстрым.
4. Readiness не зависает бесконечно при недоступной dependency.
5. `npm run typecheck` и `npm run test`.

## Типичные ошибки будущего агента

- Делать тяжелые запросы в liveness.
- Всегда возвращать `200` из readiness, скрывая деградацию.
