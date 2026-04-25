# AGENTS.md - src/plugins/docs

## Реальная ответственность директории

OpenAPI/Swagger infrastructure:

- `@fastify/swagger`;
- `@fastify/swagger-ui`;
- включение по `SWAGGER_ENABLED`.

## Что менять здесь уместно

- Общую конфигурацию docs.
- Глобальные tags/security schemes.

## Что менять здесь неуместно

- Контракты отдельных endpoint-ов модулей.
- Бизнес-логику API.

## Границы зависимостей

- Допустимо: `package.json` metadata, `fastify.config`.
- Недопустимо: доменные service/repository зависимости.

## Куда класть новый код

- В `docs.plugin.ts`.

## Связанные файлы

- `src/modules/*/*.routes.ts`
- `src/modules/*/*.schemas.ts`
- `src/app/config.ts`

## Локальный чеклист перед завершением

1. При `SWAGGER_ENABLED=false` docs не регистрируются.
2. Теги соответствуют реальным модулям.
3. Security scheme согласована с auth plugin.
4. Swagger остается disabled by default и включается явно через env.
5. `npm run typecheck`.

## Типичные ошибки будущего агента

- Исправлять docs plugin вместо корректного обновления модульных route schemas.
