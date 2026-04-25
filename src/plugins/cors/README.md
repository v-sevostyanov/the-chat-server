# src/plugins/cors

## Назначение

Кастомный CORS-плагин для локальной разработки и приватных сетей.

## Политика допуска origin

Разрешаются только origin, которые проходят `isAllowedLocalNetworkOrigin`:

- `localhost` и `*.localhost`;
- приватные IPv4:
  - `10.0.0.0/8`
  - `127.0.0.0/8`
  - `192.168.0.0/16`
  - `172.16.0.0/12`
  - `169.254.0.0/16`
- приватные/локальные IPv6 (`::1`, `fc*`, `fd*`, `fe8*`-`feb*`);
- хосты `.local`;
- однословные локальные hostname без точки.

Неподходящие origin игнорируются (CORS-заголовки не выставляются).

## Выставляемые заголовки

- `Vary: Origin`
- `Access-Control-Allow-Origin: <origin>`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: <requested> | Authorization,Content-Type`

Для `OPTIONS` отправляется `204`.

## Почему так

- Снижает риск случайного открытия API для произвольных внешних origin.
- Поддерживает dev-окружения с локальными устройствами в LAN.

## Ограничения

- Это не универсальная интернет-политика CORS.
- Для публичного production-домена обычно нужна явная allowlist по доменным именам продукта.
