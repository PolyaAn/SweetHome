# Backend gaps for frontend section Home

----

## Причина файла

Frontend-раздел `Дом` использует текущий backend-контракт `HOMEASSISTANT_CLIENT_API.md`.

Текущий backend-контракт покрывает:

- `GET /api/SmartHome/widget-catalog`
- `GET /api/SmartHome/layout`
- `PUT /api/SmartHome/layout`
- `POST /api/SmartHome/actions`

Локальное ТЗ `plan_frontend_home_full.html` описывает дополнительные endpoints и сценарии.

----

## Расхождения

1. Dashboard

- В ТЗ используется `GET /api/v1/home/dashboard`.
- В текущем API endpoint отсутствует.
- Frontend собирает dashboard из `layout` и `widget-catalog`.

2. Комнаты

- В ТЗ используются отдельные endpoints для комнат:
  - `GET /api/v1/home/rooms`
  - `POST /api/v1/home/rooms`
  - `GET /api/v1/home/rooms/{roomId}`
  - `PUT /api/v1/home/rooms/{roomId}`
  - `DELETE /api/v1/home/rooms/{roomId}`
- В текущем API комнаты сохраняются полной заменой `PUT /api/SmartHome/layout`.
- Backend не возвращает ошибку `ROOM_NOT_EMPTY`.

3. Устройства и датчики комнаты

- В ТЗ используются отдельные endpoints:
  - `GET /api/v1/home/rooms/{roomId}/devices`
  - `GET /api/v1/home/devices/available`
  - `GET /api/v1/home/sensors/available`
  - `POST /api/v1/home/devices/{deviceId}/assign`
  - `POST /api/v1/home/sensors/{sensorId}/assign`
- В текущем API доступен общий `GET /api/SmartHome/widget-catalog`.
- Frontend фильтрует catalog по `type`.
- Привязка выполняется через добавление widget в layout.

4. Управление устройствами

- В ТЗ используется `POST /api/v1/home/devices/{deviceId}/state`.
- В текущем API используется `POST /api/SmartHome/actions`.
- Frontend отправляет `entityId`, `action`, `value`.
- `action` берётся из `controls[].action`.

5. Сценарии

- В ТЗ используются endpoints:
  - `GET /api/v1/home/scenarios`
  - `POST /api/v1/home/scenarios`
  - `POST /api/v1/home/scenarios/{scenarioId}/execute`
- В текущем API endpoints отсутствуют.
- Frontend показывает экран с состоянием отсутствующего API.

6. Автоматизации

- В ТЗ используются endpoints:
  - `GET /api/v1/home/automations`
  - `POST /api/v1/home/automations`
  - `PUT /api/v1/home/automations/{automationId}`
- В текущем API endpoints отсутствуют.
- Frontend показывает экран с состоянием отсутствующего API.

7. Журнал событий

- В ТЗ используется `GET /api/v1/home/events`.
- В текущем API endpoint отсутствует.
- Frontend показывает экран с состоянием отсутствующего API.

8. Realtime

- В ТЗ используется WebSocket `/ws/home`.
- В текущем API WebSocket не описан.
- Frontend не подключает realtime-канал.

----

## Исправления на backend

1. Endpoint журнала событий.

```text
GET /api/SmartHome/events
```

2. Endpoints сценариев.

```text
GET /api/SmartHome/scenarios
POST /api/SmartHome/scenarios
POST /api/SmartHome/scenarios/{scenarioId}/execute
```

3. Endpoints автоматизаций.

```text
GET /api/SmartHome/automations
POST /api/SmartHome/automations
PUT /api/SmartHome/automations/{automationId}
```

4. Realtime-канал.

```text
GET /ws/home
```

5. Realtime-события.

```text
DEVICE_STATE_CHANGED
SENSOR_VALUE_CHANGED
NEW_EVENT
ROOM_UPDATED
AUTOMATION_EXECUTED
```

6. Проверка `entityId` при сохранении layout.

7. Проверка `settingsJson` на валидный JSON.

8. Ошибка удаления непустой комнаты при появлении отдельного room API.

```text
ROOM_NOT_EMPTY
```
