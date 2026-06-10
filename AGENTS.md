# AGENTS.md — Gia Phả Platform

## Project Overview

A Vietnamese family genealogy web app built on TanStack Start (React SSR), deployed via Docker. The app manages family trees, individual profiles, community news, family events with lunar/solar calendar, and cultural features like death anniversary tracking.

## Architecture

### Stack
- **TanStack Start** (React 19, SSR, file-based routing at `src/routes/`)
- **Tailwind CSS v4** with custom `@theme` tokens (wood, gold, crimson, parchment)
- **PostgreSQL** (Dockerized) via **Drizzle ORM**
- **Custom JWT Auth** using `jose` + `bcryptjs`; tokens stored in HttpOnly cookies
- **React Flow** (`@xyflow/react`) for family tree visualization
- **Dagre** (`@dagrejs/dagre`) for tree layout computation
- **TipTap** for rich text editing in admin panel (posts, biographies)

### Key Directories

```
db/                     # Database schema + client (Drizzle ORM)
  schema.ts             # All table definitions (users, persons, marriages, posts, anniversaries, etc.)
  client.ts             # Drizzle client using standard postgres driver
  migrate.ts            # Custom migration runner (applied on Docker startup)
  migrations/           # Auto-generated SQL migrations (drizzle-kit generate)

src/
  lib/
    auth.ts             # JWT sign/verify, cookie helpers
    lunar-calendar.ts   # Vietnamese lunar calendar utilities, anniversary detection
    background-images.ts # Configurable background image paths for homepage & profiles

  components/
    AuthProvider.tsx     # React context for user auth state
    Navbar.tsx           # Sticky navigation bar with font-size controls & user dropdown
    FamilyTree.tsx       # React Flow genealogy tree with expand/collapse nodes
    SearchableSelect.tsx # Reusable searchable dropdown component

  routes/
    __root.tsx           # App shell with AuthProvider, Navbar, Footer
    index.tsx            # Homepage (stats, featured posts, notifications, anniversaries)
    tree.tsx             # Full-page family tree view
    login.tsx            # Login/register page with PENDING state messaging
    anniversaries.tsx    # Calendar view with dual solar/lunar dates, event highlighting
    fund.tsx             # Family fund public view
    person/$id.tsx       # Ancestor profile (tabs: Info, Achievements, Gallery, Memory Wall)
    posts/index.tsx      # News listing
    posts/$id.tsx        # News article detail

    admin.tsx            # Admin layout (sidebar + outlet)
    admin/users.tsx      # Approve/manage members, link to person profiles
    admin/persons.tsx    # Add/manage ancestor profiles with TipTap biography editor
    admin/tree.tsx       # Manage tree relationships (father/mother assignments)
    admin/posts.tsx      # Write posts with TipTap editor
    admin/fund.tsx       # Record income/expenses
    admin/anniversaries.tsx # Manage family events (lunar/solar, recurring/one-time)
    admin/notifications.tsx # Manage homepage notifications

    api/auth/            # register, login, logout, me endpoints
    api/persons/         # tree, index (list/create), $id (read/update/delete)
    api/posts/           # index (list/create), $id (read/delete)
    api/memories/        # $personId (create memory wall entry)
    api/fund/            # index (list/create fund records)
    api/admin/           # users (list/update roles & status)
    api/notifications/   # index (list/create/toggle)
    api/anniversaries/   # index (list/create/update/delete events)
    api/media/           # upload/embed media files
    api/homepage/        # data (aggregated homepage data)
```

## Data Model

**users** — Auth accounts (PENDING → ACTIVE approval flow)
- `role`: GUEST | MEMBER | ADMIN | SUPER_ADMIN
- `status`: PENDING | ACTIVE | SUSPENDED
- `personId`: optional FK linking to their ancestor profile

**persons** — Ancestor profiles (flexible, tree nodes)
- `gender`: MALE (shown in main tree) | FEMALE (accessed via parent's expand)
- `fatherId`, `motherId`: self-referencing for tree structure
- `generation`, `branch`: for filtering tree views
- `fullBiography`: rich HTML content via TipTap editor
- `extra`: JSONB column for flexible metadata

**marriages** — husband_id + wife_id linking persons

**posts** — News articles with TipTap HTML content + cover images

**family_fund** — IN/OUT cash records with date tracking

**memory_wall** — Text tributes tied to a person profile

**notifications** — Homepage announcements (togglable active/inactive)

**anniversaries** — Family events with dual calendar support
- `dateType`: SOLAR or LUNAR
- `type`: DEATH | COMMEMORATION | OTHER
- `isRecurring`: annual events vs one-time
- `personId`: optional link to a person profile
- `postId`: optional link to a related article

**media** — Uploaded/embedded images linked to persons or posts

**galleries**, **edit_requests** — Reserved tables for future features

## Auth Flow

1. Register → `status = PENDING`, shown on homepage as "awaiting approval"
2. Admin visits `/admin/users`, clicks "Duyệt" → `status = ACTIVE`
3. Admin optionally sets `personId` to link account to ancestor profile
4. Login returns JWT in HttpOnly cookie `auth_token` (7-day expiry)
5. `GET /api/auth/me` is called on every page load to hydrate auth context
6. User dropdown shows "Hồ sơ của tôi" link if `personId` is set

## Coding Conventions

- API routes: TanStack Start file routes using `createFileRoute` with `server.handlers` pattern
- Path aliases: `@/*` → `src/*`, `~/` → project root (for `~/db/client`, `~/db/schema`)
- Vietnamese string literals throughout UI (no i18n layer; strings are inline)
- Currency formatted with `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`
- Dates displayed in `vi-VN` locale
- No unused imports (TypeScript strict mode)

## Key Design Decisions

- **Postgres over MongoDB**: PostgreSQL provides relational integrity for users/funds, while JSON columns (`jsonb`) handle flexible person metadata. PG handles 300+ profiles trivially (designed for millions of rows).
- **Self-hosted Auth**: The PENDING → ACTIVE manual approval flow requires custom auth; standard third-party solutions often don't support admin-approval workflows easily.
- **Female members**: Not shown as primary tree nodes to keep the tree manageable; accessed via husband node expand (follows traditional Vietnamese genealogy convention).
- **Branch filtering**: Tree can be filtered by `branch` field to avoid UI overload with 9+ generations.
- **Dual calendar**: Events support both Solar and Lunar date types with automatic conversion for the calendar grid display.

## Migration Management

After schema changes:
```bash
DATABASE_URL="postgresql://..." npx drizzle-kit generate
```
Migrations are applied automatically by the startup script (`npm run migrate`) in the Docker container.
