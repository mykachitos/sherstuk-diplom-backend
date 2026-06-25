# SweetHand Backend

Standalone Express API for the SweetHand diploma project.

## Stack

- Node.js
- Express
- Local JSON storage in `data/db.json`

## Setup

```bash
npm install
npm start
```

The server starts on `http://127.0.0.1:8000` by default. You can override the port with the `PORT` environment variable.

## Render

For a Render web service, use:

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Important: if Render logs show `Python 3.x` and `Poetry`, the service was created with the wrong runtime and `render.yaml` is not being applied to that deploy. Recreate the service as a `Node` web service or create it from the repository `render.yaml` as a Blueprint.

## Demo Admin

- Email: `admin@sweethand.local`
- Password: `admin123`

## Data

On first start the API creates `data/db.json` from `data/catalogSeed.json`.
