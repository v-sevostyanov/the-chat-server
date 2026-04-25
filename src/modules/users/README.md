# src/modules/users

## Назначение

Модуль `users` предоставляет безопасные операции с профилями пользователей:

- чтение своего профиля;
- обновление своего профиля;
- чтение профиля по `userId`;
- листинг/поиск пользователей для lookup-сценариев.

Базовый префикс маршрутов: `/api/v1/users`.

## HTTP-контракты

- `GET /me` — профиль текущего пользователя.
- `PATCH /me` — частичное обновление `username` и/или `displayName`.
- `GET /:userId` — профиль конкретного пользователя.
- `GET /` — список пользователей (`limit`, `offset`, `search`).

## Бизнес-правила

- `username` нормализуется: `trim + lowercase`.
- `displayName` нормализуется: `trim`.
- Пустые значения после trim запрещены.
- Для обновления нужно передать хотя бы одно поле.
- Конфликт `username` возвращается как `409 CONFLICT`.

## Данные и приватность

- Модуль возвращает только public-safe поля:
  - `id`
  - `username`
  - `displayName`
  - `createdAt`
  - `updatedAt`
- Credentials и auth-сессии не экспонируются.

## Внутренний pipeline

1. `users.routes.ts` — маршруты и TypeBox-схемы.
2. `users.handlers.ts` — маппинг request -> service.
3. `users.service.ts` — нормализация, бизнес-валидация, конфликтная логика.
4. `users.repository.ts` — SQL-операции с таблицей `users`.
5. `users.mapper.ts` — row -> DTO.
6. `users.types.ts` / `users.schemas.ts` — типы и API-контракты.

## Что важно для аналитика

- `list` сортируется по `createdAt asc, id asc` (предсказуемый стабильный порядок).
- Поиск `search` строится через `ILIKE` по `username` и `displayName`.
- Формат даты в API всегда ISO-8601 строка.

## Риски и ограничения

- Сейчас нет отдельного username-history/audit trail.
- Нет rate-limit логики в модуле; если нужен анти-абьюз на поиск пользователей, это задача инфраструктурного слоя.
- При изменении username policy нужно синхронно обновлять route schema и service-валидацию.
