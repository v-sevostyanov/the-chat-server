import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import packageJson from "../../../package.json";
import type { AppConfig } from "../../app/config";

const docsHomePath = "/docs";
const restDocsPath = "/docs/rest";
const openApiJsonPath = "/docs/openapi.json";
const legacyOpenApiJsonPath = "/docs/json";
const realtimeDocsPath = "/docs/realtime";
const asyncApiJsonPath = "/docs/asyncapi.json";
const legacyWebsocketDocsPath = "/docs/websocket";

type DocsConfig = Pick<
  AppConfig,
  | "websocketPath"
  | "websocketMaxPayloadBytes"
  | "websocketHeartbeatIntervalMs"
  | "websocketRealtimeChannel"
  | "presenceConnectionTtlSeconds"
>;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --panel: #ffffff;
      --muted: #64748b;
      --text: #0f172a;
      --border: #dbe3ec;
      --accent: #2563eb;
      --accent-soft: #eff6ff;
      --code-bg: #0f172a;
      --code-text: #e2e8f0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      line-height: 1.55;
    }

    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 44px 0 56px;
    }

    header {
      margin-bottom: 28px;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 34px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    h2 {
      margin: 34px 0 14px;
      font-size: 22px;
      letter-spacing: 0;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 16px;
      letter-spacing: 0;
    }

    p {
      margin: 0 0 14px;
      color: var(--muted);
    }

    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 650;
    }

    a:hover {
      text-decoration: underline;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 14px;
    }

    .card,
    .section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px;
    }

    .section {
      margin-top: 16px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      margin: 0 8px 8px 0;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 650;
      white-space: nowrap;
    }

    code {
      border-radius: 4px;
      background: #e2e8f0;
      color: #0f172a;
      padding: 2px 5px;
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 0.92em;
    }

    pre {
      overflow-x: auto;
      border-radius: 8px;
      background: var(--code-bg);
      color: var(--code-text);
      padding: 16px;
      font-family: "JetBrains Mono", Consolas, monospace;
      font-size: 13px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }

    th,
    td {
      border-bottom: 1px solid var(--border);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f1f5f9;
      font-size: 13px;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.03em;
    }

    tr:last-child td {
      border-bottom: 0;
    }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

function renderDocsHome(config: DocsConfig): string {
  const websocketPath = escapeHtml(config.websocketPath);

  return renderPage(
    "Документация TheChat",
    `<header>
      <h1>Документация backend TheChat</h1>
      <p>Единая точка входа для HTTP-контрактов, realtime-контрактов WebSocket и клиентских интеграционных сценариев.</p>
    </header>

    <section class="grid" aria-label="Разделы документации">
      <article class="card">
        <h2>REST API</h2>
        <p>OpenAPI-документация, сгенерированная из Fastify-схем маршрутов для auth, users, chats, messages, presence и health.</p>
        <p><a href="${restDocsPath}">Открыть Swagger UI</a></p>
        <p><a href="${openApiJsonPath}">OpenAPI JSON</a></p>
      </article>

      <article class="card">
        <h2>WebSocket API</h2>
        <p>Realtime-контракт для <code>${websocketPath}</code>: аутентификация, входящие события, исходящие события, семантика доставки и поведение при reconnect.</p>
        <p><a href="${realtimeDocsPath}">Открыть realtime-документацию</a></p>
        <p><a href="${asyncApiJsonPath}">AsyncAPI JSON</a></p>
      </article>
    </section>

    <section class="section">
      <h2>Карта интеграции</h2>
      <p>REST используется для долговечных команд и восстановления состояния: регистрация, вход, создание чатов, создание сообщений, история и чтение профилей. WebSocket используется для best-effort realtime-уведомлений: создание чатов, fan-out сообщений, снимки presence и обновления presence.</p>
      <span class="tag">HTTP как источник истины</span>
      <span class="tag">WebSocket best-effort realtime</span>
      <span class="tag">Fan-out через Redis Pub/Sub</span>
      <span class="tag">После reconnect нужна повторная подписка</span>
    </section>`,
  );
}

function renderRealtimeDocs(config: DocsConfig): string {
  const websocketPath = escapeHtml(config.websocketPath);
  const maxPayloadBytes = String(config.websocketMaxPayloadBytes);
  const heartbeatIntervalMs = String(config.websocketHeartbeatIntervalMs);
  const presenceTtlSeconds = String(config.presenceConnectionTtlSeconds);
  const realtimeChannel = escapeHtml(config.websocketRealtimeChannel);

  return renderPage(
    "WebSocket API TheChat",
    `<header>
      <h1>WebSocket API TheChat</h1>
      <p>Realtime-контракт chat backend. Машиночитаемый контракт событий доступен как <a href="${asyncApiJsonPath}">AsyncAPI JSON</a>.</p>
    </header>

    <section class="section">
      <h2>Endpoint и аутентификация</h2>
      <p>Подключение выполняется к <code>${websocketPath}</code> по <code>ws://</code> или <code>wss://</code>. Сообщения передаются как JSON-объекты с обязательным полем <code>type</code>.</p>
      <p>Access token принимается через <code>Authorization: Bearer &lt;access_token&gt;</code> или, для browser-native клиентов, через <code>?access_token=&lt;access_token&gt;</code>. Валидны только JWT с <code>tokenType = "access"</code>.</p>
      <p>Текущие лимиты: максимальный входящий payload <code>${maxPayloadBytes}</code> байт, интервал server heartbeat <code>${heartbeatIntervalMs}</code> мс, TTL presence-соединения <code>${presenceTtlSeconds}</code> секунд.</p>
    </section>

    <section class="section">
      <h2>События client -&gt; server</h2>
      <table>
        <thead>
          <tr><th>Событие</th><th>Назначение</th><th>Важное поведение</th></tr>
        </thead>
        <tbody>
          <tr><td><code>client.ping</code></td><td>Heartbeat / измерение RTT.</td><td>Возвращает <code>server.pong</code> с серверным временем.</td></tr>
          <tr><td><code>presence.subscribe</code></td><td>Подписывает текущее соединение на presence текущего пользователя.</td><td>Возвращает <code>presence.subscribed</code>.</td></tr>
          <tr><td><code>presence.watch</code></td><td>Заменяет список пользователей, за presence которых следит это соединение.</td><td><code>userIds</code> должен содержать 1-100 UUID. Текущий пользователь добавляется автоматически.</td></tr>
          <tr><td><code>chat.subscribe</code></td><td>Подписывает соединение на события сообщений одного чата.</td><td>Запрашивающий пользователь должен быть участником чата, иначе вернётся <code>server.error</code> с <code>FORBIDDEN</code>.</td></tr>
          <tr><td><code>chat.unsubscribe</code></td><td>Отписывает соединение от одного чата.</td><td>Операция идемпотентна и возвращает <code>chat.unsubscribed</code>.</td></tr>
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2>События server -&gt; client</h2>
      <table>
        <thead>
          <tr><th>Событие</th><th>Когда отправляется</th><th>Область доставки</th></tr>
        </thead>
        <tbody>
          <tr><td><code>server.pong</code></td><td>Ответ на <code>client.ping</code>.</td><td>То же соединение.</td></tr>
          <tr><td><code>presence.subscribed</code></td><td>После <code>presence.subscribe</code>.</td><td>То же соединение.</td></tr>
          <tr><td><code>presence.watched</code></td><td>После <code>presence.watch</code>.</td><td>То же соединение.</td></tr>
          <tr><td><code>presence.updated</code></td><td>Переходы connect/disconnect и снимки presence после watch.</td><td>Соединения, которые следят за изменившимся пользователем.</td></tr>
          <tr><td><code>chat.subscribed</code></td><td>После разрешённого <code>chat.subscribe</code>.</td><td>То же соединение.</td></tr>
          <tr><td><code>chat.unsubscribed</code></td><td>После <code>chat.unsubscribe</code>.</td><td>То же соединение.</td></tr>
          <tr><td><code>chat.created</code></td><td>Чат стал видимым пользователю.</td><td>Все активные соединения участников чата; подписка на чат не требуется.</td></tr>
          <tr><td><code>message.created</code></td><td>Новое сообщение создано через HTTP, сохранено и опубликовано.</td><td>Подписанные соединения пользователей, которые являются участниками чата.</td></tr>
          <tr><td><code>server.error</code></td><td>Невалидный JSON, невалидное событие, ошибки auth/permissions/domain или неожиданные ошибки обработки.</td><td>Обычно то же соединение.</td></tr>
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2>Доставка и reconnect</h2>
      <p>Входящие события клиента обрабатываются последовательно внутри одного соединения. Исходящая realtime-доставка работает в режиме best-effort: Redis Pub/Sub используется для fan-out во внутреннем канале <code>${realtimeChannel}</code>, но это не долговечная очередь, и пропущенные события не воспроизводятся.</p>
      <p>После reconnect клиент должен открыть новый socket, повторить <code>chat.subscribe</code> и <code>presence.watch</code>, а при необходимости восстановить долговечное состояние через HTTP API.</p>
    </section>

    <section class="section">
      <h2>Типовой клиентский сценарий</h2>
      <pre>{
  "step1": "POST /api/v1/auth/login",
  "step2": "Открыть ${websocketPath} с access token",
  "step3": "Отправить chat.subscribe для видимых чатов",
  "step4": "Отправить presence.watch для видимых пользователей",
  "step5": "Создавать сообщения через HTTP и получать message.created через WebSocket",
  "step6": "После reconnect восстановить состояние через HTTP и повторить подписки"
}</pre>
    </section>`,
  );
}

function uuidSchema(description?: string) {
  return {
    type: "string",
    format: "uuid",
    ...(description ? { description } : {}),
  };
}

function dateTimeSchema(description?: string) {
  return {
    type: "string",
    format: "date-time",
    ...(description ? { description } : {}),
  };
}

function presenceEventSchema(type: "presence.subscribed" | "presence.updated") {
  return {
    type: "object",
    additionalProperties: false,
    required: ["type", "userId", "isOnline", "lastSeenAt"],
    properties: {
      type: { const: type },
      userId: uuidSchema(),
      isOnline: { type: "boolean" },
      lastSeenAt: {
        oneOf: [dateTimeSchema(), { type: "null" }],
      },
    },
  };
}

function buildAsyncApiSpec(config: DocsConfig) {
  const websocketPath = config.websocketPath;

  return {
    asyncapi: "2.6.0",
    info: {
      title: `${packageJson.name}: realtime API`,
      version: packageJson.version,
      description:
        "WebSocket-контракт событий для realtime-чата TheChat, presence и fan-out уведомлений.",
    },
    defaultContentType: "application/json",
    servers: {
      default: {
        url: `{host}${websocketPath}`,
        protocol: "wss",
        description:
          "Используйте ws:// для локальной разработки и wss:// в развёрнутых окружениях.",
        variables: {
          host: {
            default: "localhost:3000",
            description: "HTTP host, на котором работает Fastify-приложение.",
          },
        },
        security: [
          {
            bearerAuth: [],
          },
          {
            accessTokenQuery: [],
          },
        ],
      },
    },
    channels: {
      [websocketPath]: {
        description:
          "Двунаправленный WebSocket-канал для аутентифицированных realtime-событий.",
        subscribe: {
          summary: "События client -> server.",
          message: {
            oneOf: [
              { $ref: "#/components/messages/ClientPing" },
              { $ref: "#/components/messages/PresenceSubscribe" },
              { $ref: "#/components/messages/PresenceWatch" },
              { $ref: "#/components/messages/ChatSubscribe" },
              { $ref: "#/components/messages/ChatUnsubscribe" },
            ],
          },
        },
        publish: {
          summary: "События server -> client.",
          message: {
            oneOf: [
              { $ref: "#/components/messages/ServerPong" },
              { $ref: "#/components/messages/PresenceSubscribed" },
              { $ref: "#/components/messages/PresenceWatched" },
              { $ref: "#/components/messages/PresenceUpdated" },
              { $ref: "#/components/messages/ChatSubscribed" },
              { $ref: "#/components/messages/ChatUnsubscribed" },
              { $ref: "#/components/messages/ChatCreated" },
              { $ref: "#/components/messages/MessageCreated" },
              { $ref: "#/components/messages/ServerError" },
            ],
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token в заголовке Authorization.",
        },
        accessTokenQuery: {
          type: "apiKey",
          in: "query",
          name: "access_token",
          description:
            "Query-параметр JWT access token для browser-native WebSocket-клиентов.",
        },
      },
      messages: {
        ClientPing: {
          name: "client.ping",
          title: "Ping клиента",
          payload: { $ref: "#/components/schemas/ClientPingEvent" },
        },
        PresenceSubscribe: {
          name: "presence.subscribe",
          title: "Подписка на presence текущего пользователя",
          payload: { $ref: "#/components/schemas/PresenceSubscribeEvent" },
        },
        PresenceWatch: {
          name: "presence.watch",
          title: "Наблюдение за presence пользователей",
          payload: { $ref: "#/components/schemas/PresenceWatchEvent" },
        },
        ChatSubscribe: {
          name: "chat.subscribe",
          title: "Подписка на сообщения чата",
          payload: { $ref: "#/components/schemas/ChatSubscribeEvent" },
        },
        ChatUnsubscribe: {
          name: "chat.unsubscribe",
          title: "Отписка от сообщений чата",
          payload: { $ref: "#/components/schemas/ChatUnsubscribeEvent" },
        },
        ServerPong: {
          name: "server.pong",
          title: "Pong сервера",
          payload: { $ref: "#/components/schemas/ServerPongEvent" },
        },
        PresenceSubscribed: {
          name: "presence.subscribed",
          title: "Снимок presence текущего пользователя",
          payload: { $ref: "#/components/schemas/PresenceSubscribedEvent" },
        },
        PresenceWatched: {
          name: "presence.watched",
          title: "Подтверждение watch-list presence",
          payload: { $ref: "#/components/schemas/PresenceWatchedEvent" },
        },
        PresenceUpdated: {
          name: "presence.updated",
          title: "Обновление presence",
          payload: { $ref: "#/components/schemas/PresenceUpdatedEvent" },
        },
        ChatSubscribed: {
          name: "chat.subscribed",
          title: "Подтверждение подписки на чат",
          payload: { $ref: "#/components/schemas/ChatSubscribedEvent" },
        },
        ChatUnsubscribed: {
          name: "chat.unsubscribed",
          title: "Подтверждение отписки от чата",
          payload: { $ref: "#/components/schemas/ChatUnsubscribedEvent" },
        },
        ChatCreated: {
          name: "chat.created",
          title: "Чат создан",
          payload: { $ref: "#/components/schemas/ChatCreatedEvent" },
        },
        MessageCreated: {
          name: "message.created",
          title: "Сообщение создано",
          payload: { $ref: "#/components/schemas/MessageCreatedEvent" },
        },
        ServerError: {
          name: "server.error",
          title: "Ошибка сервера",
          payload: { $ref: "#/components/schemas/ServerErrorEvent" },
        },
      },
      schemas: {
        ClientPingEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type"],
          properties: {
            type: { const: "client.ping" },
            correlationId: uuidSchema("Опциональный correlation id клиента."),
          },
        },
        PresenceSubscribeEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type"],
          properties: {
            type: { const: "presence.subscribe" },
          },
        },
        PresenceWatchEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "userIds"],
          properties: {
            type: { const: "presence.watch" },
            userIds: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: uuidSchema(),
            },
          },
        },
        ChatSubscribeEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "chatId"],
          properties: {
            type: { const: "chat.subscribe" },
            chatId: uuidSchema(),
          },
        },
        ChatUnsubscribeEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "chatId"],
          properties: {
            type: { const: "chat.unsubscribe" },
            chatId: uuidSchema(),
          },
        },
        ServerPongEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "serverTime"],
          properties: {
            type: { const: "server.pong" },
            correlationId: uuidSchema(),
            serverTime: dateTimeSchema(),
          },
        },
        PresenceDto: {
          type: "object",
          additionalProperties: false,
          required: ["userId", "isOnline", "lastSeenAt"],
          properties: {
            userId: uuidSchema(),
            isOnline: { type: "boolean" },
            lastSeenAt: {
              oneOf: [dateTimeSchema(), { type: "null" }],
            },
          },
        },
        PresenceSubscribedEvent: presenceEventSchema("presence.subscribed"),
        PresenceWatchedEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "userIds"],
          properties: {
            type: { const: "presence.watched" },
            userIds: {
              type: "array",
              items: uuidSchema(),
            },
          },
        },
        PresenceUpdatedEvent: presenceEventSchema("presence.updated"),
        ChatMemberDto: {
          type: "object",
          additionalProperties: false,
          required: ["userId", "username", "displayName", "role", "joinedAt"],
          properties: {
            userId: uuidSchema(),
            username: { type: "string" },
            displayName: { type: "string" },
            role: { type: "string" },
            joinedAt: dateTimeSchema(),
          },
        },
        ChatDetailDto: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "type",
            "title",
            "createdBy",
            "createdAt",
            "membersCount",
            "members",
          ],
          properties: {
            id: uuidSchema(),
            type: { enum: ["direct", "group"] },
            title: {
              oneOf: [{ type: "string" }, { type: "null" }],
            },
            createdBy: {
              oneOf: [uuidSchema(), { type: "null" }],
            },
            createdAt: dateTimeSchema(),
            membersCount: {
              type: "integer",
              minimum: 0,
            },
            members: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatMemberDto" },
            },
          },
        },
        ChatSubscribedEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "chatId"],
          properties: {
            type: { const: "chat.subscribed" },
            chatId: uuidSchema(),
          },
        },
        ChatUnsubscribedEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "chatId"],
          properties: {
            type: { const: "chat.unsubscribed" },
            chatId: uuidSchema(),
          },
        },
        ChatCreatedEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "chat"],
          properties: {
            type: { const: "chat.created" },
            chat: { $ref: "#/components/schemas/ChatDetailDto" },
          },
        },
        MessageDto: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "chatId",
            "clientMessageId",
            "sender",
            "body",
            "createdAt",
            "editedAt",
          ],
          properties: {
            id: uuidSchema(),
            chatId: uuidSchema(),
            clientMessageId: {
              oneOf: [uuidSchema(), { type: "null" }],
            },
            sender: {
              type: "object",
              additionalProperties: false,
              required: ["id", "username", "displayName"],
              properties: {
                id: uuidSchema(),
                username: { type: "string" },
                displayName: { type: "string" },
              },
            },
            body: { type: "string" },
            createdAt: dateTimeSchema(),
            editedAt: {
              oneOf: [dateTimeSchema(), { type: "null" }],
            },
          },
        },
        MessageCreatedEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "chatId", "message"],
          properties: {
            type: { const: "message.created" },
            chatId: uuidSchema(),
            message: { $ref: "#/components/schemas/MessageDto" },
          },
        },
        ServerErrorEvent: {
          type: "object",
          additionalProperties: false,
          required: ["type", "code", "message"],
          properties: {
            type: { const: "server.error" },
            code: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    "x-thechat-runtime": {
      websocketMaxPayloadBytes: config.websocketMaxPayloadBytes,
      websocketHeartbeatIntervalMs: config.websocketHeartbeatIntervalMs,
      websocketRealtimeChannel: config.websocketRealtimeChannel,
      presenceConnectionTtlSeconds: config.presenceConnectionTtlSeconds,
      deliverySemantics:
        "Best-effort fan-out через Redis Pub/Sub. Пропущенные события не воспроизводятся; после reconnect клиенты должны восстановить состояние через HTTP.",
    },
  };
}

function registerHtmlRoute(
  fastify: FastifyInstance,
  path: string,
  render: () => string,
): void {
  fastify.get(
    path,
    {
      schema: {
        hide: true,
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) =>
      reply.type("text/html; charset=utf-8").send(render()),
  );
}

function registerJsonRoute(
  fastify: FastifyInstance,
  path: string,
  buildPayload: () => unknown,
): void {
  fastify.get(
    path,
    {
      schema: {
        hide: true,
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) =>
      reply.type("application/json; charset=utf-8").send(buildPayload()),
  );
}

export const docsPlugin = fp(
  async (fastify) => {
    if (!fastify.config.swaggerEnabled) {
      return;
    }

    await fastify.register(swagger, {
      mode: "dynamic",
      openapi: {
        openapi: "3.0.3",
        info: {
          title: packageJson.name,
          version: packageJson.version,
          description:
            "Backend TheChat: REST API и realtime WebSocket API для чат-приложения.",
        },
        tags: [
          {
            name: "auth",
            description:
              "Регистрация, вход, проверка access token, ротация refresh token и logout.",
          },
          {
            name: "users",
            description: "Маршруты для работы с пользователями.",
          },
          {
            name: "health",
            description: "Маршруты liveness/readiness для проверки состояния сервиса.",
          },
          {
            name: "chats",
            description: "Публичные маршруты модуля чатов.",
          },
          {
            name: "messages",
            description: "Публичные маршруты модуля сообщений.",
          },
          {
            name: "presence",
            description: "Публичные маршруты модуля presence.",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "JWT access token для аутентификации.",
            },
          },
        },
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: restDocsPath,
      uiConfig: {
        docExpansion: "list",
        persistAuthorization: true,
      },
      staticCSP: true,
    });

    registerHtmlRoute(fastify, docsHomePath, () => renderDocsHome(fastify.config));

    registerHtmlRoute(fastify, realtimeDocsPath, () =>
      renderRealtimeDocs(fastify.config),
    );

    registerJsonRoute(fastify, openApiJsonPath, () => fastify.swagger());
    registerJsonRoute(fastify, legacyOpenApiJsonPath, () => fastify.swagger());
    registerJsonRoute(fastify, asyncApiJsonPath, () =>
      buildAsyncApiSpec(fastify.config),
    );

    fastify.get(
      legacyWebsocketDocsPath,
      {
        schema: {
          hide: true,
        },
      },
      async (_request, reply) =>
        reply.header("location", realtimeDocsPath).code(308).send(),
    );
  },
  {
    name: "docs-plugin",
  },
);
