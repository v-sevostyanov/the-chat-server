# src/modules/health

## Назначение

Модуль `health` предоставляет операционные endpoint-ы для мониторинга живости и готовности сервиса.

## Endpoint-ы

- `GET /health` — алиас liveness.
- `GET /health/live` — liveness (процесс жив).
- `GET /health/ready` — readiness критичных зависимостей.

`/health/ready` возвращает:

- `200`, если все проверки `up` (`status: "ready"`).
- `503`, если есть хотя бы одна `down` (`status: "degraded"`).

## Что проверяется

Проверки передаются в `HealthService` из `index.ts`:

- `database` -> `fastify.checkDatabaseReadiness`
- `redis` -> `fastify.checkRedisReadiness`

Для каждой проверки фиксируются `status`, `latencyMs`, `error`.

## Внутренний pipeline

- `health.routes.ts` — схемы ответов и маршруты.
- `health.handlers.ts` — маппинг service -> HTTP code.
- `health.service.ts` — запуск dependency probes и сбор агрегированного статуса.
- `health.types.ts` — типы liveness/readiness контрактов.

## Практическая ценность

- Подходит для Kubernetes/Ingress readiness probes.
- Даёт прозрачные причины деградации без утечки внутренних stacktrace.
- Позволяет быстро локализовать инфраструктурный сбой (DB vs Redis).

## Ограничения

- Проверяется доступность dependency, но не полнота бизнес-функциональности.
- Endpoint не отражает состояние очередей, нагрузку и latency пользовательских операций.
