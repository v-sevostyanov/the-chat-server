# AGENTS.md - src/plugins

## Реальная ответственность директории

`src/plugins` - инфраструктурные Fastify-плагины:

- config, cors, errors;
- db, redis;
- auth;
- websocket;
- docs.

## Что менять здесь уместно

- Decorators Fastify и их lifecycle.
- Cross-cutting инфраструктурные правила.
- Инициализацию и закрытие внешних ресурсов.

## Что менять здесь неуместно

- Доменные use-case правила из `modules/*`.
- SQL-запросы предметной области.

## Границы зависимостей

- Плагины могут зависеть от `app/config`, `db/client`, `shared/*`.
- Плагины не должны импортировать доменные `service/repository` напрямую.
- Новый decorator обязан быть объявлен в `src/app/fastify.d.ts`.
- Type-only DTO imports из модулей допустимы только как явные adapter contracts; при росте такой связности выносить контракт в `shared`.

## Куда класть новый код

- Новый инфраструктурный capability: новая подпапка `plugins/<name>`.
- Realtime-транспорт: `plugins/websocket/*`.

## Связанные файлы

- `src/app/app.ts`
- `src/app/fastify.d.ts`

## Локальный чеклист перед завершением

1. Порядок регистрации учитывает зависимости decorators.
2. Есть корректный cleanup в `onClose`, если ресурс создается плагином.
3. `npm run typecheck` и `npm run lint`.

## Типичные ошибки будущего агента

- Добавить decorator без типизации.
- Разместить бизнес-логику в infrastructure plugin.
- Начать вызывать module service из plugin ради удобства.
