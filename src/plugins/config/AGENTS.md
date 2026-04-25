# AGENTS.md - src/plugins/config

## Реальная ответственность директории

Плагин, который публикует валидированный `AppConfig` как `fastify.config`.

## Что менять здесь уместно

- Техническую механику декорирования config.
- Типы options для plugin registration.

## Что менять здесь неуместно

- Парсинг env (это `src/app/config.ts`).
- Доменные правила модулей.

## Границы зависимостей

- Допустим импорт `AppConfig` из `src/app/config.ts`.
- Недопустимы импорты из `modules/*`.

## Куда класть новый код

- В `config.plugin.ts`.

## Связанные файлы

- `src/app/config.ts`
- `src/app/app.ts`

## Локальный чеклист перед завершением

1. `fastify.config` доступен после регистрации.
2. Типы plugin options корректны.
3. Изменения env/defaults проверены в `test/app/config.test.ts` или явно обоснованы.
4. `npm run typecheck`.

## Типичные ошибки будущего агента

- Перенести env-валидацию в plugin вместо централизованного `app/config.ts`.
