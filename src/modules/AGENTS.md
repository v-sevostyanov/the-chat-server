# AGENTS.md - src/modules

`src/modules` - доменный слой backend. Текущие модули: `health`, `auth`, `users`, `chats`, `messages`, `presence`.

Правила:

- Модуль держит границу `routes -> handlers -> service -> repository`.
- Handlers не содержат business/data-access logic.
- Прямые импорты между модулями минимальны; используйте явные adapters/contracts.
- API-изменения отражайте в `*.schemas.ts`.
- Новый домен - отдельная папка модуля + регистрация в `modules/index.ts`.
- `health` остается легким: liveness не делает тяжелых проверок, readiness возвращает `503`, если DB/Redis down, и не раскрывает stacktrace.

Проверки: для runtime-изменений `npm run typecheck`, `npm run lint`, релевантные tests.
