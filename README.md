# Betto

Betto, or "Better Together", is a collaborative calendar to help people plan vacations easier. Users can add events or locations, view pins, and curate a list of events to do for the day.

## Local development

Start Postgres (via podman):

```sh
podman start betto-postgres
# first time / if it doesn't exist yet:
podman run -d --name betto-postgres \
  -e POSTGRES_USER=betto -e POSTGRES_PASSWORD=betto -e POSTGRES_DB=betto \
  -p 5432:5432 -v betto-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16-alpine
```

Then install deps and apply migrations:

```sh
npm install
npx prisma migrate dev
```

### Signing in during development

`npm run dev` never requires signing in — every request auto-authenticates
as a fixed dev user (`dev@localhost` by default). Set `DEV_USER_EMAIL` in
`.env` to act as a different user (e.g. to test invite/collaborator flows
between two identities). This bypass is hard-disabled whenever
`NODE_ENV === "production"`.

### Accessing from another device on your LAN

Set `AUTH_URL` in `.env` to the address you'll actually load the app from
(e.g. `http://192.168.1.50:3000`), not `localhost`. Without it, Auth.js
builds magic-link/callback URLs against the wrong host and sign-in will fail
after the initial page loads fine. Update it if that IP changes.


