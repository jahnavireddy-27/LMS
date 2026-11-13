# LMS

LMS is a learning-management MVP built with Next.js, TypeScript, Express,
MongoDB, and Redis. The app supports learner accounts, published courses,
enrollment, saved lesson progress, and course recommendations based on the
categories a learner has enrolled in. It starts with an empty database; courses
are created and persisted by administrators rather than presented as sample data.

## Features

- Email/password registration and sign-in; passwords are salted and hashed with
  Node.js `scrypt`.
- Server-side sessions stored in Redis and sent in an HttpOnly, SameSite cookie.
- Learner and administrator roles, enforced by the API.
- Course publishing, editing, unpublishing, lesson content, catalog search,
  enrollment, progress tracking, and resume-from-progress views.
- Optional YouTube video embeds in course lessons.
- Transparent category-based recommendations based on actual enrollments. New
  learners see an empty recommendation state until they enroll.
- MongoDB and Redis readiness in `GET /api/health`.

## Run with Docker Compose

Requirements: Docker with the Compose plugin.

1. Copy `server/.env.example` to the root `.env`.
2. Set `ADMIN_BOOTSTRAP_TOKEN` in `.env` to a long, unique secret. Keep this
   secret private. `ADMIN_EMAIL` identifies the email address that may use this
   code when registering the first administrator account.
3. Start the stack:

   ```sh
   docker compose up --build -d
   ```

4. Open <http://localhost:3000>, create the administrator account using the
   configured email and bootstrap code, then publish courses from **Manage
   courses**. Learners can register without the administrator code.

To load two sample courses after creating the first administrator, run
`npm run seed:demo --workspace server` during local development. With Docker,
run `docker compose exec server npm run seed:demo --workspace server`. The seed
command is safe to repeat and keeps courses that already exist.

### Demo walkthrough

The database is intentionally empty on first start. Seed the two example
courses using the command above, or create your own, then demonstrate the main
learning flow:

1. Register with the configured administrator email and bootstrap code.
2. Open **Manage courses**, publish a course with at least one lesson, then
   sign out.
3. Register a learner account, open **Discover**, and enroll in that course.
4. Open a lesson, mark it complete, then open **My learning** to show the saved
   progress. Enroll in a second course in the same category to show
   recommendations.

For a clean repeatable demo, use a fresh database or remove the Compose volumes
with `docker compose down -v` before starting again. This deletes all local demo
accounts, courses, and progress.

The API is available at <http://localhost:4000/api/health>. MongoDB and Redis
are only reachable on the Compose network. Data persists in named Docker
volumes. Stop containers with `docker compose stop`; remove containers but keep
data with `docker compose down`. `docker compose down -v` deletes the database
and cache volumes.

## Local development

Requirements: Node.js 22.18+ and npm 10.8+.

1. Copy `server/.env.example` to `server/.env`; set a private
   `ADMIN_BOOTSTRAP_TOKEN`.
2. Copy `client/.env.example` to `client/.env.local`.
3. Start MongoDB and Redis (for example with Docker):

   ```sh
   docker compose up -d mongo redis
   ```

4. Install and start the workspaces:

   ```sh
   npm ci
   npm run dev --workspace server
   npm run dev --workspace client
   ```

The default server environment uses local MongoDB and Redis URLs. Change them in
`server/.env` if your local services use different addresses.

## First administrator setup

The server promotes a registration to administrator only before an administrator
exists, and only when both the normalized email matches `ADMIN_EMAIL` and the
submitted `ADMIN_BOOTSTRAP_TOKEN` matches the server-only secret. The database
also enforces one administrator account. The token comparison is constant-time.
Never expose the token through a `NEXT_PUBLIC_` variable or commit it. After
creating the administrator, remove or rotate the bootstrap secret. Login and
registration are limited to 10 attempts per IP address in a 15-minute window.
Email verification and password recovery are not implemented in this MVP, so
use this app as a portfolio/demo project until those flows and production
security controls are added.

## API overview

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | API and MongoDB/Redis readiness |
| `POST` | `/api/auth/register` | Public | Create learner or configured bootstrap admin |
| `POST` | `/api/auth/login` | Public | Sign in |
| `GET` | `/api/auth/me` | Signed in | Current account |
| `POST` | `/api/auth/logout` | Public | Invalidate session |
| `GET` | `/api/courses` | Public | Browse/search published courses |
| `GET` | `/api/courses/:courseId` | Public | Course details and lessons |
| `POST` | `/api/courses` | Admin | Publish course |
| `PUT` | `/api/courses/:courseId` | Admin | Update course and reconcile lesson progress |
| `DELETE` | `/api/courses/:courseId` | Admin | Unpublish course without deleting records |
| `GET` | `/api/enrollments/me` | Signed in | Current user's enrollments and progress |
| `POST` | `/api/enrollments/:courseId` | Signed in | Enroll in a course |
| `PATCH` | `/api/enrollments/:courseId/progress` | Signed in | Mark a lesson complete/incomplete |
| `GET` | `/api/recommendations` | Signed in | Category-based recommendations |

## Checks

```sh
npm run typecheck --workspace server
npm test
npm run build --workspace server
npm run build --workspace client
docker compose config
```

The API integration test is skipped by default so `npm test` works without
running MongoDB or Redis. To run the full API flow locally, start those services
and set `RUN_INTEGRATION_TESTS=true`, `MONGODB_URI`, `REDIS_URL`,
`ADMIN_EMAIL`, and `ADMIN_BOOTSTRAP_TOKEN` in the test shell before `npm test`.
GitLab CI supplies these values and runs the integration test, server typecheck,
and both production builds on each pipeline.

## Current scope and production work

This is a functional MVP, not a fully production-hardened education platform.
It does not include email verification, password reset, social login, billing,
uploads, quizzes, certificates, instructor self-service, automated content
seeding, or a recommendation model trained on learner outcomes. Before a public
production launch, add email verification/recovery, stronger operational
secrets, HTTPS, monitoring/backups, and broader API/UI integration tests.
