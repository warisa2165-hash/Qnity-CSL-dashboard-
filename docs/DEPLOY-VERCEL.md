# Vercel deployment — UAT, mock data only

Puts the QNITY CSL Laboratory Renovation 2026 Project Dashboard Portal on a
public Vercel URL so stakeholders can walk through it, with the built-in
mock dataset and demo sign-in enabled.

**No database. No Microsoft Entra ID tenant. No production data.**

**To make edits permanent on Vercel, you do not need to leave Vercel** —
connect PostgreSQL and follow [`VERCEL-POSTGRES.md`](VERCEL-POSTGRES.md).
That is the same platform, the same build, three more environment variables.

For self-hosting on a VM or Azure — PostgreSQL, Entra ID single sign-on,
demo login disabled — see [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 1. Read this before you publish

The UAT site is a public URL. Anyone who has the link reaches the login
page, and anyone who has the link *and* the demo password can browse the
whole portal as any of the five roles, including the Admin Panel.

That is acceptable here because **every record is fictional** — the QNITY
2026 dataset in `src/lib/data/mock` is invented for demonstration, and
`DATA_SOURCE=mock` means the portal cannot reach a real database. But it
does mean three things are on you:

- **Set a strong `DEMO_PASSWORD`.** The built-in fallback (`qnity2026`) is
  in a public repository. Replace it.
- **Share the link and password with the UAT group only.** The app sends
  `noindex, nofollow`, so search engines will not list it, but that is not
  access control.
- **Turn demo login off before this deployment ever carries real data.**
  `ENABLE_DEMO_LOGIN=false` removes the credentials provider entirely.

If you want a second lock, see [Deployment Protection](#7-optional-lock-the-uat-site-down)
in step 7 — it puts a Vercel-managed gate in front of the whole site.

---

## 2. What is already in the repository

| File | Purpose |
|---|---|
| `vercel.json` | Pins the framework and runs functions in Singapore (`sin1`), the closest region to Thailand Science Park. |
| `.env.vercel.example` | The exact variable set this deployment needs. |
| `package.json` → `build` | `prisma generate && next build`. |

**Why `prisma generate` is in the build.** The app imports
`@prisma/client` even in mock mode — the Prisma repository is behind a
dynamic import, and Next.js still traces it at build time. That client is
normally produced by a postinstall hook, which Vercel skips whenever it
restores a cached `node_modules`. Without the explicit step the first
cached build after a successful one fails. Generation opens no database
connection, so it is safe with no `DATABASE_URL` present.

---

## 3. Deploy

### Option A — Vercel dashboard (recommended)

1. **New Project → Import Git Repository** and pick
   `warisa2165-hash/Qnity-CSL-dashboard-`.
2. Under **Branch**, choose the branch you want UAT to track. To deploy the
   current work before it is merged, select
   `claude/qnity-csl-renovation-portal-4jaf9k`; otherwise use your default
   branch.
3. Leave **Framework Preset** (Next.js), **Build Command**, **Output
   Directory** and **Install Command** exactly as detected — `vercel.json`
   and `package.json` already say the right things.
4. Expand **Environment Variables** and add the values from step 4 below.
   Add them *before* the first deploy so the first build is also the first
   working deploy.
5. **Deploy.** First build takes roughly two to four minutes.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link                     # choose or create the project

# Add each variable to Production and Preview
vercel env add DATA_SOURCE production
vercel env add AUTH_SECRET production
vercel env add AUTH_TRUST_HOST production
vercel env add ENABLE_DEMO_LOGIN production
vercel env add DEMO_PASSWORD production
vercel env add PRIMARY_ADMIN_EMAIL production
vercel env add INTERNAL_EMAIL_DOMAINS production
# …then repeat with `preview` in place of `production`

vercel --prod
```

---

## 4. Environment variables

Copy from [`.env.vercel.example`](../.env.vercel.example).

### Exactly one variable is required

| Variable | Value | If unset |
|---|---|---|
| `AUTH_SECRET` | **generate** — `openssl rand -base64 32` | **Sign-in cannot work.** Auth.js raises `MissingSecret` and every attempt returns `/login?error=Configuration`. |

Demo login needs nothing else. Every other setting has a working default
baked into the code, so a deployment carrying only `AUTH_SECRET` will sign
in as any of the ten demo accounts using the built-in password.

### Strongly recommended

| Variable | Value | Default if unset | Why set it |
|---|---|---|---|
| `DEMO_PASSWORD` | **choose** — `openssl rand -base64 18` | `qnity2026` | The default is published in this repository. On a public URL, change it. |
| `ENABLE_DEMO_LOGIN` | `true` | enabled | Only the exact string `false` disables it, but stating it makes the intent explicit and is what you flip for production. |
| `DATA_SOURCE` | `mock` | `mock` | Explicit is better than implicit when a database is added later. |

### Optional

| Variable | Default if unset |
|---|---|
| `PRIMARY_ADMIN_EMAIL` | `warisa.kantifong@qnity.com` — already correct for this project |
| `INTERNAL_EMAIL_DOMAINS` | `qnity.com` — already correct |

`AUTH_TRUST_HOST` is **not read by this application**. `trustHost: true` is
set in the Auth.js config itself, so the variable is redundant here. Setting
it does no harm.

Set each for **Production** and **Preview** so preview deployments of
future branches behave identically.

Do **not** set `DATABASE_URL`, `AUTH_URL`, or any
`AUTH_MICROSOFT_ENTRA_ID_*` variable — `.env.vercel.example` explains why
each one is deliberately absent.

> Changing an environment variable does not rebuild the site. After editing
> one, go to **Deployments → ⋯ → Redeploy**.

---

## 5. Verify the deployment

Open the Vercel URL and check:

- [ ] `/` redirects to `/login` (nobody reaches the portal unauthenticated).
- [ ] The login page shows an amber notice that Microsoft Entra ID is not
      configured — expected, and confirms no half-configured SSO path.
- [ ] The demo account dropdown lists ten active users (the eleventh,
      a vendor representative, is disabled and correctly excluded).
- [ ] Signing in as **Warisa Kantifong** lands on the Executive Dashboard
      with all seventeen navigation entries.
- [ ] Signing in as **Nattapong Wongsiri** (Design Alternative) shows ten
      entries, and `/payments` redirects to `/no-access`.
- [ ] `/phases` renders the Gantt with the schedule forecast banner.
- [ ] `/weekly-report` → **Export as PDF** opens the browser print dialogue.
- [ ] Dark mode toggles from the top bar and survives a reload.

Roles worth putting in front of UAT testers:

| Account | Shows |
|---|---|
| `warisa.kantifong@qnity.com` | Full administrator, including the Admin Panel |
| `peiming.zhou@qnity.com` | Read-only leadership view |
| `rita.tang@qnity.com` | Leadership plus procurement/CAPEX editing |
| `rattiya.janpum@qnity.com` | Project team |
| `sarawut.t@syme072.co.th` | Consultant — financial pages denied |
| `nattapong@design-alternative.co.th` | Contractor — leadership pages denied |

All of them use the single `DEMO_PASSWORD` you set.

---

## 6. What will not work on this deployment

Not defects — consequences of running mock-only on a read-only filesystem:

- **Edits do not survive a cold start.** The five editable registers
  (Project Information, Milestones, Risks, Actions, Procurement) save
  normally and the new values appear immediately, but Vercel's application
  directory is read-only, so the JSON store falls back to `/tmp`. That
  survives a page refresh and stays for the life of the instance; it is wiped
  when the instance recycles. The edit pages and the Admin Panel state this
  on screen rather than losing work quietly.
  **Fix: [`VERCEL-POSTGRES.md`](VERCEL-POSTGRES.md)** — with a database
  connected, the same forms write rows that persist through redeploys.
- **Other admin actions do not persist.** Invite, disable, change role and
  approve-access-request are validated, permission-checked and written to the
  audit trail, then discarded. The UI says so on screen. Same fix.
- **File upload and document download are disabled.** Vercel's filesystem is
  read-only and the mock records carry no files. The buttons render disabled
  so the intended workflow is still visible.
- **The audit trail is the seeded history.** New entries go to the Vercel
  function log, not into the list.
- **Every date is anchored to the mock data date, 01 August 2026.** Schedule
  variance, overdue flags and the forecast are computed against the real
  current date, so as real time moves past that point the "overdue" counts
  will grow. That is expected for a fixed demo dataset.

---

## 7. Optional: lock the UAT site down

**Vercel Deployment Protection** (Project → Settings → Deployment
Protection) puts a gate in front of the deployment, before the app is
reached at all:

- **Vercel Authentication** — only members of your Vercel team get in. Best
  if all UAT testers have Vercel accounts.
- **Password Protection** — one shared site password on top of the demo
  login. Best for external testers such as SYME072 or Design Alternative.

Either one means a stray link cannot expose the portal, even with a weak
demo password. Availability depends on your Vercel plan.

---

## 8. Moving from UAT to production

When UAT signs off, the same project becomes production by changing
configuration rather than code:

1. Provision PostgreSQL, then `npm run db:deploy` and `npm run seed`.
2. Set `DATABASE_URL` (and `DIRECT_URL`), then flip `DATA_SOURCE=prisma`.
3. Register the Entra ID application and set the three
   `AUTH_MICROSOFT_ENTRA_ID_*` variables plus `AUTH_URL`.
4. Set `ENABLE_DEMO_LOGIN=false` — this is the step that closes the shared
   password door.
5. Redeploy and re-run the step 5 checklist against real accounts.

**Steps 1, 2 and 5 are covered end to end in
[`VERCEL-POSTGRES.md`](VERCEL-POSTGRES.md)** — which database to choose, why
there are two connection strings, and what to click to prove edits now
persist. [`DEPLOYMENT.md`](DEPLOYMENT.md) covers the Entra ID app
registration walkthrough and the pre-launch checklist.

---

## 9. Dependency security

Vercel runs a security check at the end of every build and will fail the
deployment banner with *"Vulnerable version of Next.js detected, please
update immediately"* if the framework has a published advisory.

Current pins, chosen to clear that check:

| Package | Pinned | Why |
|---|---|---|
| `next` | `16.2.12` | Latest stable. The 15.x `backport` line still tripped Vercel's check, so the project moved to the current major. |
| `react` / `react-dom` | `19.2.8` | Latest stable, required to stay on a supported pairing with Next 16. |
| `next-auth` | `5.0.0-beta.32` | Clears four **critical** Auth.js advisories, the most relevant being *configuration errors can cause existence-based auth checks to fail open* — precisely the pattern `currentUser()` uses. |
| `eslint-config-next` | `16.2.12` | Matches the framework. |
| `postcss` | `^8.5.25` | Clears three advisories in the Tailwind build chain. |

Framework packages are pinned exactly, so a deployment is reproducible from
`package-lock.json` alone. Next 16 requires **Node 20.9 or later**, which
`engines.node` now states; Vercel reads it when selecting a runtime.

### Overrides

Two advisories used to survive inside Next.js's own dependency tree — its
bundled `postcss@8.4.31`, and `sharp`, which backs `next/image`. Neither
could be fixed by upgrading Next. `package.json` therefore carries:

```json
"overrides": { "postcss": "^8.5.25", "sharp": "^0.35.3" }
```

Both are forward-compatible patch upgrades within the same major, and the
result is a clean `npm audit` (`found 0 vulnerabilities`). After changing
either override, re-check that Tailwind still emits both theme token sets —
`--primary` and `--background` should each appear twice in the built CSS,
once for light and once for dark.

Do **not** run `npm audit fix --force`. It "resolves" framework advisories by
downgrading Next to 9.3.3.

### When you upgrade

`next-auth` is on a beta line, and Next majors move file conventions, so
treat either bump as behaviour-affecting and re-run the step 5 checklist.

The Next 15 → 16 upgrade required three source changes, all mechanical:

- `src/middleware.ts` → `src/proxy.ts`, with the exported function renamed
  from `middleware` to `proxy`. Next 16 renamed the file convention; the
  logic is untouched.
- The `eslint` key was removed from `next.config.ts` — Next 16 no longer
  runs ESLint during `next build`.
- `next lint` was replaced by the ESLint CLI with a flat config
  (`eslint.config.mjs`). `eslint-config-next` 16 also promotes
  `react-hooks/set-state-in-effect` to an error, which caught three real
  `setState`-inside-`useEffect` patterns in the app shell, the global search
  and the theme toggle. All three were rewritten to derive state or adjust
  it during render rather than suppressed.

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Build banner says a vulnerable Next.js version was detected | Framework advisory. See section 9 — `next` is pinned to the latest stable release. Check `npm view next dist-tags` for the current `latest`. |
| `npm audit` reports postcss or sharp | The `overrides` block in `package.json` has been removed or defeated. See section 9. Never run `npm audit fix --force` — it downgrades Next to 9.3.3. |
| Build fails on an unsupported Node version | Next 16 needs Node >= 20.9. Set it in Project → Settings → Node.js Version. |
| Build fails on `@prisma/client did not initialize yet` | The build command lost its `prisma generate` prefix. Restore `"build": "prisma generate && next build"`. |
| `/login?error=Configuration`, or "Authentication is not configured correctly" | `AUTH_SECRET` never reached the runtime. Auth.js reports every config fault as the same opaque `Configuration` error, and an unset secret is by far the most common cause — the function log will show `MissingSecret`. The login page now detects this and prints the fix directly. Add `AUTH_SECRET` for **both** Production and Preview, then **redeploy** — an environment change alone does not rebuild. |
| Every request redirects to `/login` in a loop | `AUTH_SECRET` is unset or differs between Production and Preview. Set it in both, then redeploy. |
| Demo sign-in rejects a valid account | `DEMO_PASSWORD` was changed but the site was not redeployed. Environment changes need a redeploy. |
| The login page offers no demo accounts | `ENABLE_DEMO_LOGIN` is `false`, or was set only for Production while you are on a preview URL. |
| Deployed but the dashboard is empty | `DATA_SOURCE` is misspelled. It must be exactly `mock` — or exactly `prisma` if you have connected a database. |
| Edits disappear after a redeploy | Expected on mock data; see section 6. Connect PostgreSQL — [`VERCEL-POSTGRES.md`](VERCEL-POSTGRES.md). |
| Region rejected on deploy | `sin1` may be unavailable on your plan. Remove `regions` from `vercel.json` or pick a region in Project → Settings → Functions. |
