# RAG tools для Codex

Этот документ описывает внутренний RAG-слой проекта. Он не является частью production Fastify API и не добавляет публичные `/api/v1/rag/*` endpoints.

RAG используется как локальный tooling для Codex:

- индексирует `.md` и кодовые/config-файлы, видимые git и не исключенные `.gitignore`;
- дополнительно отбрасывает env-файлы, lockfiles, сертификаты, ключи, бинарные и слишком большие файлы;
- хранит фрагменты в Qdrant;
- строит embeddings через локальный Ollama;
- отдает найденные фрагменты через MCP tools или CLI.

## Локальная инфраструктура

Запустите RAG-сервисы:

```bash
docker compose --profile rag up -d ollama qdrant
```

Qdrant будет доступен на `http://127.0.0.1:6333`, Ollama — на `http://127.0.0.1:11434`.

Загрузите embedding-модель в Ollama:

```bash
docker exec -it thechat-ollama ollama pull nomic-embed-text
```

## Конфигурация

RAG-настройки имеют defaults из `.env.example`:

```dotenv
RAG_OLLAMA_URL=http://127.0.0.1:11434
RAG_QDRANT_URL=http://127.0.0.1:6333
RAG_QDRANT_API_KEY=
RAG_QDRANT_COLLECTION=the_chat_server_code_rag
RAG_EMBEDDING_MODEL=nomic-embed-text
RAG_EMBEDDING_DIMENSIONS=768
RAG_MAX_FILE_BYTES=262144
```

`RAG_QDRANT_API_KEY` нужен только для Qdrant Cloud или защищенного Qdrant.
Если меняете `RAG_EMBEDDING_MODEL` или `RAG_EMBEDDING_DIMENSIONS`, выполните полный `npm run rag:index`: Qdrant collection будет пересоздана с новой размерностью.

## CLI

Полная переиндексация collection:

```bash
npm run rag:index
```

Проверка состояния collection:

```bash
npm run rag:status
```

Поиск по индексу:

```bash
npm run rag:search -- "где описана websocket аутентификация" --limit=8
```

`rag:index` в MVP пересоздает collection целиком. Incremental indexing и background watcher намеренно не реализованы.

## MCP tools

MCP server запускается через stdio:

```bash
npm run rag:mcp
```

Он публикует tools:

- `rag_index` — пересоздает Qdrant collection и возвращает counts по файлам/chunks/upserts/skips;
- `rag_search` — принимает `{ "query": "...", "limit": 8 }` и возвращает ranked snippets с `path`, `startLine`, `endLine`, `score`;
- `rag_status` — проверяет доступность collection и количество points.

Пример локального подключения к Codex через MCP config:

```toml
[mcp_servers.the-chat-server-rag]
command = "npm"
args = ["run", "rag:mcp"]
cwd = "C:\\Users\\mad11\\WebstormProjects\\the-chat-server"
```

Если Codex запускается без унаследованного окружения shell, передайте `RAG_*` переменные через поддерживаемый механизм env вашей MCP-конфигурации.

## Безопасность индекса

Qdrant payload хранит текст фрагментов. Поэтому discovery не полагается только на `.gitignore` и дополнительно исключает:

- `.env`, `.env.*`, кроме `.env.example`;
- `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt`, `*.cer`, `*.der`;
- `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock*`;
- бинарные файлы и файлы больше `RAG_MAX_FILE_BYTES`.

Перед первым `rag:index` проверьте, что в git-visible файлах нет секретов.

## Планы на будущее

GPU-поддержка для Ollama не включена в базовый compose setup, чтобы не усложнять локальный запуск и не ломать Windows/Docker Desktop сценарии.

Планируемые направления:

- отдельный GPU-профиль для Ollama;
- NVIDIA-вариант через NVIDIA Container Toolkit и `--gpus=all`;
- AMD ROCm-вариант через образ `ollama/ollama:rocm`;
- сравнение производительности CPU и GPU на реальном индексе проекта перед включением GPU-настроек по умолчанию.
