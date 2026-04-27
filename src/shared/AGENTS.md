# AGENTS.md - src/shared

`src/shared` хранит только общие примитивы для нескольких модулей: базовые ошибки, HTTP-схемы и low-level DB helpers.

Правила:

- `shared/*` не импортирует `modules/*`.
- Не выносите сюда код, нужный только одному модулю.
- `shared/errors` хранит стабильные `AppError`-классы; `code/statusCode/message/details` являются публичным контрактом.
- `shared/http` хранит только общие TypeBox-схемы, например error envelope; доменные schemas остаются в модулях.
- `shared/db` хранит domain-agnostic DB error predicates; предпочитайте стабильный SQLSTATE/code, а не парсинг текста ошибки.
- `details` не должен содержать чувствительные данные.

Проверки: `npm run typecheck`; при изменении публичного error/http контракта - релевантные tests.
