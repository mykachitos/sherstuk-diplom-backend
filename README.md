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

## Demo Admin

- Email: `admin@sweethand.local`
- Password: `admin123`

## Data

On first start the API creates `data/db.json` from `data/catalogSeed.json`.
