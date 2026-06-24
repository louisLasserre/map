# streets

Vite + React + Express + SQLite scaffold. Single process, single port — Express
runs as Vite middleware, so the SPA and the API share one origin.

## Layout

```
.
├── index.html            entry HTML, loads src/main.jsx
├── src/
│   ├── main.jsx          React entry
│   └── App.jsx           SPA, fetches same-origin /api/*
├── server/
│   ├── api.js            Express router exposing /api/notes
│   └── db.js             opens better-sqlite3 (WAL mode), idempotent migrations
├── vite.config.js        apiPlugin() mounts Express on the Vite dev server
├── package.json
└── data.db               created on first request; in the persisted volume
```

## Run it

Hit **Start** in the superproto UI. The container runs `npm install` on first
start (better-sqlite3 compiles natively) and then `vite`. Don't run
`npm run dev` or `vite` from the terminal — the container manages the dev
server itself.

## Add an endpoint

1. Add the route in `server/api.js` (use the `db` import for SQL).
2. If you need a new table, add a `CREATE TABLE IF NOT EXISTS` to the
   `db.exec` block in `server/db.js`. It runs every boot, so keep it idempotent.
3. Hit it from `src/App.jsx` with a same-origin `fetch('/api/...')`.

Vite reloads the client on edits; restart the preview from the UI to pick up
server-side changes.

## Commit after each chunk

Commit to git after every self-contained chunk of work — a feature, a fix, or a
refactor that leaves the app in a working state. Prefer small, focused commits
over one big commit at the end, and write a clear message describing what
changed. Write the commit message in the language the user is using in this
conversation (default to English if it's unclear). Don't commit a broken app;
get it building first. Pushing stays manual — only push when asked.

See `~/CLAUDE.md` for container conventions (preview routing, cron, SQLite).
