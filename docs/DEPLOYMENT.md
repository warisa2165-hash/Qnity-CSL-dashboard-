# Deployment

QNITY CSL Laboratory Renovation 2026 — Project Dashboard Portal.

---

## 1. Prerequisites

| | |
|---|---|
| Node.js | 18.18 or later (20 LTS recommended) |
| PostgreSQL | 14 or later — only when `DATA_SOURCE=prisma` |
| Microsoft Entra ID | An app registration in the QNITY tenant |

---

## 2. Local development

```bash
npm install
cp .env.example .env.local
openssl rand -base64 32          # paste into AUTH_SECRET
npm run dev
```

The portal starts on <http://localhost:3000> against the built-in QNITY
dataset. No database, no Entra ID tenant.

---

## 3. Microsoft Entra ID registration

In the Azure portal → **Microsoft Entra ID → App registrations → New
registration**:

1. **Name** — `QNITY CSL Project Dashboard Portal`
2. **Supported account types** — *Accounts in this organizational directory
   only (QNITY — Single tenant)*
3. **Redirect URI** — *Web*:
   ```
   https://<your-domain>/api/auth/callback/microsoft-entra-id
   ```
   Add `http://localhost:3000/api/auth/callback/microsoft-entra-id` as a
   second URI for local testing.

Then:

4. **Certificates & secrets → New client secret**. Copy the secret **Value**
   (not the ID) — it is shown once.
5. **API permissions** — the defaults are enough. The portal needs only
   `openid`, `profile`, `email` and `User.Read`; it reads identity from the
   ID token and takes authorisation from its own user table.
6. **Overview** — copy the *Application (client) ID* and *Directory (tenant)
   ID*.

Map them to environment variables:

```bash
AUTH_MICROSOFT_ENTRA_ID_ID="<application (client) id>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<client secret VALUE>"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<tenant-id>/v2.0"
```

> Restricting who can sign in is done in the portal, not in Entra ID. A
> directory account with no active portal record is refused at sign-in and
> directed to the access-request form.

### Optional: restrict at the directory level too

In **Enterprise applications → QNITY CSL Project Dashboard Portal →
Properties**, set *Assignment required?* to **Yes**, then assign only the
project's Entra ID group. Access is then gated twice — by the directory and
by the portal's own user table.

---

## 4. Database

```bash
createdb qnity_csl
export DATABASE_URL="postgresql://qnity:<password>@<host>:5432/qnity_csl?schema=public"

npm run prisma:generate
npm run db:deploy          # applies prisma/migrations — the tracked schema
npm run seed               # loads the QNITY 2026 baseline
npm run db:check           # confirms config, connection, schema and seed state
```

Then set `DATA_SOURCE=prisma`. Re-running `npm run seed` is safe — it clears
the project graph and reloads the baseline, so never run it against a
database holding real project updates.

For production, prefer tracked migrations:

```bash
npx prisma migrate dev --name init      # once, in development
npx prisma migrate deploy               # in the release pipeline
```

---

## 5. Production environment variables

```bash
NODE_ENV=production
DATA_SOURCE=prisma
DATABASE_URL="postgresql://…"

AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="https://csl-portal.qnity.com"
AUTH_TRUST_HOST=true

AUTH_MICROSOFT_ENTRA_ID_ID="…"
AUTH_MICROSOFT_ENTRA_ID_SECRET="…"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<tenant>/v2.0"

PRIMARY_ADMIN_EMAIL="warisa.kantifong@qnity.com"
INTERNAL_EMAIL_DOMAINS="qnity.com"

ENABLE_DEMO_LOGIN=false          # redundant with DATA_SOURCE=prisma, which
                                 # closes demo sign-in by default; harmless
                                 # to state explicitly
FILE_STORAGE_DRIVER=local
MAX_UPLOAD_SIZE_MB=25
```

### Pre-launch checklist

- [ ] `ENABLE_DEMO_LOGIN=false`
- [ ] `AUTH_SECRET` is a fresh 32-byte random value, not the example
- [ ] `AUTH_URL` matches the public HTTPS origin exactly
- [ ] The Entra ID redirect URI matches `{AUTH_URL}/api/auth/callback/microsoft-entra-id`
- [ ] `PRIMARY_ADMIN_EMAIL` is Warisa Kantifong's real QNITY address
- [ ] `DATABASE_URL` uses a least-privilege role and TLS
- [ ] Database backups scheduled
- [ ] The seed has **not** been run against production data

---

## 6. Hosting

### Vercel

```bash
npm i -g vercel
vercel link
vercel env add AUTH_SECRET production      # repeat for each variable
vercel --prod
```

Build command `npm run build`, output handled by the Next.js adapter. Add
`prisma generate` to the build if your platform caches `node_modules`:

```json
"build": "prisma generate && next build"
```

### Azure App Service

Closest to the Entra ID tenant and usually the right choice for QNITY.

```bash
az webapp up --runtime "NODE:20-lts" --sku P1v3 --name qnity-csl-portal
az webapp config appsettings set --name qnity-csl-portal \
  --settings DATA_SOURCE=prisma AUTH_URL=https://qnity-csl-portal.azurewebsites.net …
```

Use **Azure Database for PostgreSQL — Flexible Server**, and put the portal
and database on the same virtual network.

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build -t qnity-csl-portal .
docker run -p 3000:3000 --env-file .env.production qnity-csl-portal
```

---

## 7. Operating the portal

**First sign-in.** Warisa Kantifong signs in with Entra ID. Because her
address matches `PRIMARY_ADMIN_EMAIL`, she is resolved to the administrator
role automatically.

**Adding the team.** Admin Panel → *User management* → **Invite user**, or
let them submit the access-request form at `/request-access` and approve it
from the *Access requests* tab.

**Tuning access.** Admin Panel → *User management* → **Manage** on any user.
Grant edit rights per page, or deny a page outright. Denials override the
role baseline — that is how, for example, SYME072 is kept out of the payment
and CAPEX pages in the shipped configuration.

**Reviewing activity.** Admin Panel → *Audit trail*, filterable by action,
entity and user, exportable as CSV for the handover pack.

---

## 8. Browser support

Verified in Google Chrome, Microsoft Edge, Safari and Firefox — current
versions. The layout is responsive from 390 px upwards; wide registers scroll
inside their own container so the page never scrolls horizontally. PDF export
uses the browser's native print pipeline, so it behaves the same everywhere.

---

## 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Redirect loop at `/login` | `AUTH_URL` does not match the public origin, or `AUTH_SECRET` is unset. |
| "Your Microsoft account is valid, but you have not been provisioned" | Expected — the identity has no active portal record. Invite or approve the user. |
| `redirect_uri_mismatch` from Microsoft | The Entra ID redirect URI must be exactly `{AUTH_URL}/api/auth/callback/microsoft-entra-id`. |
| Dashboard shows the mock figures in production | `DATA_SOURCE` is not `prisma`, or the database is unreachable and the layer fell back to the baseline. Check the server log. |
| `No project row found` | `npm run seed` has not been run against this database. `npm run db:check` reports it. |
| Admin actions report "Persisting it requires DATA_SOURCE=prisma" | Expected in mock mode — changes are validated and audited but not stored. Set `DATA_SOURCE=prisma`. |
| The login page offers no way in | With `DATA_SOURCE=prisma` demo sign-in is closed by default. Configure Entra ID, or set `ENABLE_DEMO_LOGIN=true` temporarily. |
