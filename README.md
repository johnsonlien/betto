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


