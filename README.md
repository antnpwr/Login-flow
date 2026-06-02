# Login Flow Demo

A small authentication demo using **Next.js**, **Auth.js / NextAuth**, **Keycloak**, and **PostgreSQL**.

The app now uses embedded local login for email/username and password, while Keycloak still owns the real user store:

```text
Next.js form
  -> Next.js server route / Auth.js provider
  -> Keycloak
  -> Auth.js session
  -> /profile
```

LINE login stays redirect-based through Keycloak identity brokering:

```text
LINE rich menu / LIFF
  -> Next.js /line
  -> Keycloak with kc_idp_hint=line
  -> LINE
  -> Keycloak
  -> /profile
```

## Tech Stack

- Frontend: Next.js, TypeScript, Ant Design
- Auth session: Auth.js / NextAuth
- Identity provider: Keycloak
- Keycloak database: PostgreSQL
- Docker: Keycloak + PostgreSQL

## App Routes

```text
/              Embedded login form
/register      Embedded registration form
/line          LINE LIFF / rich menu entry
/profile       Protected signed-in profile page
/api/register  Server-only Keycloak user creation route
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

Frontend client:

```text
Client ID: nextjs-frontend
Client authentication: ON
Standard flow: ON
Direct access grants: ON
Valid redirect URI: http://localhost:3000/api/auth/callback/keycloak
Valid post logout redirect URI: http://localhost:3000/*
Web origins: http://localhost:3000
```

Service client for embedded registration:

```text
Client ID: nextjs-user-admin
Client authentication: ON
Service accounts: ON
```

Give the service account these `realm-management` client roles:

```text
manage-users
view-users
query-users
view-realm
```

Make sure the realm has a `user` role. New embedded registrations receive this role automatically.

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
AUTH_KEYCLOAK_SECRET=<nextjs-frontend-client-secret>
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/login-flow
AUTH_KEYCLOAK_TOKEN_URL=http://localhost:8080/realms/login-flow/protocol/openid-connect/token
KEYCLOAK_ADMIN_BASE_URL=http://localhost:8080
KEYCLOAK_ADMIN_REALM=login-flow
KEYCLOAK_ADMIN_CLIENT_ID=nextjs-user-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=<nextjs-user-admin-client-secret>
```

## Local Login Flow

```text
User opens /
  -> enters email/username and password
  -> Auth.js Credentials provider sends them to Keycloak server-side
  -> Keycloak returns tokens
  -> Auth.js creates a JWT session
  -> user goes to /profile
```

The app does not store passwords. It only forwards them server-side to Keycloak.

## Registration Flow

```text
User opens /register
  -> enters username, email, and password
  -> /api/register creates the user in Keycloak
  -> /api/register sets the Keycloak password
  -> /api/register assigns the user role
  -> the app signs the user in
  -> user goes to /profile
```

For this demo, the registration route fills the required Keycloak profile name fields from the username so the user can log in immediately.

## LINE Login Flow

LINE should be added inside Keycloak as an identity provider. The Next.js app does not validate LINE tokens or call LINE profile APIs directly.

Keycloak LINE identity provider:

```text
Type: OpenID Connect v1.0
Alias: line
Discovery URL: https://access.line.me/.well-known/openid-configuration
Scopes: openid profile email
```

LINE broker callback URL:

```text
http://localhost:8080/realms/login-flow/broker/line/endpoint
```

LIFF endpoint URL:

```text
https://<public-domain>/line
```

Rich menu URL:

```text
https://liff.line.me/<liff-id>
```

For local LINE testing, expose the frontend with a public HTTPS tunnel and use the tunneled `/line` URL as the LIFF endpoint.

## Checks

```bash
cd frontend
npm run lint
npm run build
```

Manual checks:

```text
Valid local login reaches /profile
Wrong password shows an inline error
New registration creates a Keycloak user
New registration receives the user role
/profile redirects unauthenticated users
/line still starts Keycloak LINE broker login
```
