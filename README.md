# Login Flow Demo

A small authentication demo using **Next.js**, **Auth.js / NextAuth**, **Keycloak**, and **PostgreSQL**.

The main idea is:

```text
Next.js app -> Keycloak -> Next.js profile page
```

Next.js does not handle passwords directly. Keycloak owns login, registration, roles, sessions, and future social login such as LINE.

## Tech Stack

- Frontend: Next.js, TypeScript, Ant Design
- Auth: Auth.js / NextAuth with Keycloak provider
- Identity provider: Keycloak
- Database for Keycloak: PostgreSQL
- Docker: Keycloak + PostgreSQL

## App Routes

```text
/          Login entry page
/register  Register entry page
/profile   Protected profile page
```

## Run Keycloak

From the project root:

```bash
docker compose up -d
```

Keycloak:

```text
http://localhost:8080
```

Admin login:

```text
Username: admin
Password: admin
```

Stop containers:

```bash
docker compose down
```

Reset all Keycloak data:

```bash
docker compose down -v
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

## Keycloak Setup

Realm:

```text
login-flow
```

Client:

```text
Client ID: nextjs-frontend
Client authentication: ON
Standard flow: ON
Direct access grants: OFF
Valid redirect URI: http://localhost:3000/api/auth/callback/keycloak
Valid post logout redirect URI: http://localhost:3000/*
Web origins: http://localhost:3000
```

Enable registration if needed:

```text
Realm settings -> Login -> User registration: ON
```

## Frontend Environment

Local env file:

```text
frontend/.env.local
```

Required values:

```text
AUTH_SECRET=<random-secret>
AUTH_URL=http://localhost:3000
AUTH_KEYCLOAK_ID=nextjs-frontend
AUTH_KEYCLOAK_SECRET=<client-secret-from-keycloak>
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/login-flow
```

## Login Flow

```text
User opens Next.js
  -> clicks Login
  -> goes to Keycloak
  -> logs in or registers
  -> returns to /profile
```

Later, LINE should be added inside Keycloak as an identity provider. The Next.js app should still only talk to Keycloak.

LINE broker callback URL:

```text
http://localhost:8080/realms/login-flow/broker/line/endpoint
```

## Checks

```bash
cd frontend
npm run lint
npm run build
```
