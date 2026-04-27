# AGENTS.md - src/plugins/db

DB plugin декорирует `fastify.db`, предоставляет `checkDatabaseReadiness` и закрывает pool в `onClose`, если клиент создан плагином.

Правила:

- Injected db режим не управляет чужим pool lifecycle.
- Стандартный режим закрывает pool на shutdown.
- Readiness использует реальный ping/select.
- Readiness failure не раскрывает sensitive connection details.
- Не добавляйте доменные SQL side effects в plugin registration.

Проверки: `npm run typecheck`, релевантные tests.
