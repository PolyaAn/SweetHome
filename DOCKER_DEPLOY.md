# Docker deploy

## Схема

```text
push в master -> GitHub Actions -> SSH на VPS -> git reset -> docker compose up -d --build
```

Фронт собирается на VPS из `Dockerfile` и запускается через nginx-контейнер.

## Подготовка VPS

Один раз склонируй репозиторий:

```bash
git clone https://github.com/PolyaAn/SweetHome.git /opt/sweethome-frontend
cd /opt/sweethome-frontend
cp .env.example .env
docker compose up -d --build
```

По умолчанию фронт будет доступен на:

```text
http://<vps-ip>:8080
```

Контейнер проксирует `/api/`, `/Account/` и `/swagger/` в backend на `host.docker.internal:5000`.

## GitHub secrets

Добавь в GitHub repository secrets:

```text
VPS_HOST=176.109.109.155
VPS_USER=user1
VPS_PORT=22
VPS_SSH_KEY=<private-ssh-key>
VPS_FRONTEND_APP_DIR=/opt/sweethome-frontend
```

Если `VPS_FRONTEND_APP_DIR` не задан, workflow использует `/opt/sweethome-frontend`.
