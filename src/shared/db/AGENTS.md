# AGENTS.md - src/shared/db

## Реальная ответственность директории

Общие low-level helper-функции для распознавания ошибок БД.

Сейчас ключевая функция: `isPgUniqueViolationError`.

## Что менять здесь уместно

- Добавлять универсальные DB error predicates.
- Улучшать обработку `error` и `error.cause` для драйверных исключений.
- Добавлять predicates для FK/check/not-null violations, если они реально нужны нескольким модулям.

## Что менять здесь неуместно

- Доменные error mapping правила конкретного модуля.
- SQL-запросы и data-access.

## Границы зависимостей

- Код должен оставаться domain-agnostic.
- Нельзя импортировать `modules/*`.

## Куда класть новый код

- В `errors.ts` или новый helper-файл в этой директории.

## Связанные файлы

- `src/modules/auth/auth.service.ts`
- `src/modules/users/users.service.ts`
- `src/modules/chats/chats.service.ts`

## Локальный чеклист перед завершением

1. Helper не содержит доменной логики.
2. Поведение детерминировано для `unknown`.
3. `npm run typecheck`.

## Типичные ошибки будущего агента

- Добавить сюда domain-specific `ConflictError` вместо общего predicate.
- Парсить текст ошибки БД, если доступен стабильный SQLSTATE/code.
