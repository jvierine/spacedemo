# Feedback backend

This localhost-only Rust service accepts categorized feedback and stores it in SQLite.

## API

- `GET /health`
- `POST /feedback` with JSON `{ "kind": "improvement" | "new_demo", "page": "/space/...", "message": "..." }`

The production database lives at `/var/lib/spacedemo/feedback.sqlite3`, outside the public web root. To review suggestions on the server:

```sh
sudo sqlite3 -header -column /var/lib/spacedemo/feedback.sqlite3 \
  'SELECT id, created_at, kind, page, status, message FROM feedback ORDER BY id DESC;'
```

No credentials, email addresses, or IP addresses are collected.
