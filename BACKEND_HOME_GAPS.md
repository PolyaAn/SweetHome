# Backend gaps for frontend section Home

----

## Статус

- Backend-разрывы для раздела `Дом` закрыты.
- Frontend подключён к backend API сценариев.
- Frontend подключён к backend API автоматизаций.
- Frontend подключён к backend API журнала событий.
- Frontend подключён к WebSocket realtime-каналу `/ws/home`.
- Главная страница `Дом` использует backend-счётчики сценариев, автоматизаций и событий.

----

## Закрытые frontend-пункты

- Экран сценариев использует `GET /api/SmartHome/scenarios`.
- Экран сценариев запускает сценарий через `POST /api/SmartHome/scenarios/{scenarioId}/execute`.
- Экран создания сценария использует `POST /api/SmartHome/scenarios`.
- Экран автоматизаций использует `GET /api/SmartHome/automations`.
- Экран автоматизаций создаёт автоматизацию через `POST /api/SmartHome/automations`.
- Экран автоматизаций обновляет активность через `PUT /api/SmartHome/automations/{automationId}`.
- Экран журнала событий использует `GET /api/SmartHome/events?take=100`.
- Realtime-канал обрабатывает `DEVICE_STATE_CHANGED`, `NEW_EVENT`, `ROOM_UPDATED`.

----

## Оставшиеся замечания

- Нет.

----

## Открытые вопросы

- Нет.
