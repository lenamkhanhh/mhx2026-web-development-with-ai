# Projects API demo checklist

Base URL: `http://localhost:3001`

## Health check

```bash
curl http://localhost:3001/api/health
```

## List and filter

```bash
curl http://localhost:3001/api/projects
curl "http://localhost:3001/api/projects?q=portfolio"
curl "http://localhost:3001/api/projects?technology=ReactJS"
```

## Create

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title":"Course Demo","description":"CRUD evidence","image":"/assets/paper-network.png","technologies":["ReactJS","Express"],"link":"https://github.com/lenamkhanhh/portfolio"}'
```

Copy the returned `id` into the update and delete commands.

## Update and delete

```bash
curl -X PATCH http://localhost:3001/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Course Demo"}'

curl -X DELETE http://localhost:3001/api/projects/PROJECT_ID
```

Automated equivalents are covered by `server/app.test.ts`.
