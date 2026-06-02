# Login Flow Demo

A small authentication demo using **Next.js**, **Auth.js / NextAuth**, **Keycloak**, and **PostgreSQL**.

The app uses embedded local login for email/username and password, while Keycloak still owns the real user store:

```text
Next.js form
  -> Next.js server route / Auth.js provider
  -> Keycloak
  -> Auth.js session
  -> /profile
```

Every account must also be linked with LINE before it can access the protected profile:

```text
Next.js /register or /link-line
  -> LIFF gets LINE ID token
  -> Next.js server verifies token with LINE
  -> Next.js server stores LINE link in Keycloak
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
/register      Embedded registration form with required LINE link
/link-line     Existing-account LINE linking page
/profile       Protected signed-in profile page
/api/register  Server-only Keycloak user creation route
/api/link-line Server-only existing-account LINE link route
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

LINE identity provider alias:

```text
Type: OpenID Connect v1.0
Alias: line
Discovery URL: https://access.line.me/.well-known/openid-configuration
Client ID: <LINE Login Channel ID>
Client Secret: <LINE Login Channel Secret>
Default scopes: openid profile email
```

The website verifies LIFF ID tokens itself, but Keycloak still needs the `line` alias so the app can store the official federated identity link on the user.

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
NEXT_PUBLIC_LIFF_ID=<line-liff-id>
LINE_LOGIN_CHANNEL_ID=<line-login-channel-id>
NEXT_PUBLIC_LIFF_REDIRECT_URI=<optional-public-https-register-or-link-line-url>
```

## Local Login Flow

```text
User opens /
  -> enters email/username and password
  -> Auth.js Credentials provider sends them to Keycloak server-side
  -> Keycloak returns tokens
  -> app checks Keycloak for LINE link
  -> linked user goes to /profile
  -> unlinked user goes to /link-line
```

The app does not store passwords. It only forwards them server-side to Keycloak.

## Registration Flow

```text
User opens /register
  -> links LINE with LIFF
  -> enters username, email, and password
  -> /api/register verifies the LINE ID token with LINE
  -> /api/register creates the user in Keycloak
  -> /api/register sets the Keycloak password
  -> /api/register stores the LINE federated identity and attributes in Keycloak
  -> /api/register assigns the user role
  -> the app signs the user in
  -> user goes to /profile
```

For this demo, the registration route fills the required Keycloak profile name fields from the username so the user can log in immediately.

## Existing User LINE Link Flow

```text
Existing user opens /
  -> enters username/email and password
  -> app sees no LINE link
  -> redirects to /link-line
  -> user links LINE with LIFF
  -> /api/link-line verifies the LINE ID token with LINE
  -> /api/link-line stores the LINE federated identity and attributes in Keycloak
  -> user goes to /profile
```

Stored Keycloak user attributes:

```text
line_user_id
line_display_name
line_picture_url
line_email
line_linked_at
```

## LINE Setup

```text
LIFF Endpoint URL: http://localhost:3000/register
Scopes: openid profile email
```

For local LIFF testing, LINE usually needs a public HTTPS endpoint. Use an HTTPS tunnel and set the LIFF endpoint to:

```text
https://<public-domain>/register
```

If you use a tunnel, also set the frontend redirect override before restarting Next.js:

```text
NEXT_PUBLIC_LIFF_REDIRECT_URI=https://<public-domain>/register
```

For registration, the redirect URL must end with `/register` so LINE returns to the registration form. For existing-account linking, use the same public domain with `/link-line` when testing that route.

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
Registration cannot submit before LINE is linked
New registration creates a Keycloak user with user role and LINE link
Duplicate LINE account linking is rejected
/profile redirects unauthenticated users
Unlinked authenticated users are redirected to /link-line
After linking LINE, users can access /profile
```
