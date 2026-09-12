# Render deployment notes

This project serves frontend + backend from the same Express service.
No VITE_API_URL is required when using the Render URL directly.

Set these Render Environment Variables:
- NODE_ENV=production
- SESSION_SECRET=<long random secret>
- DB_HOST=<remote MySQL hostname>
- DB_PORT=3306 (or provider value)
- DB_USER=<remote MySQL user>
- DB_PASSWORD=<remote MySQL password>
- DB_NAME=users_db (or provider database name)
- DB_SSL=true/false depending on the MySQL provider

Start command:
`npm start`

Health check:
`/health`
