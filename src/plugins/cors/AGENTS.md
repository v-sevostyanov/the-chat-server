# AGENTS.md - src/plugins/cors

CORS policy реализована через `onRequest`: explicit allowlist из config, удобные local/private origins вне production, credentialed responses без wildcard origin.

Правила:

- Неразрешенные origins не получают CORS headers.
- `OPTIONS` возвращает `204`.
- Никогда не добавляйте `Allow-Origin: *`.
- В production разрешены только origins из `CORS_ALLOWED_ORIGINS`.
- `Vary: Origin` сохраняется при отражении origin.
- Не добавляйте route-specific checks в общий CORS plugin.

Проверки: `npm run typecheck`, `npm run lint`, релевантные CORS tests.
