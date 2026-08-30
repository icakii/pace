# Pace

A quiet personal organizer — calendar, tasks, thoughts, and a daily quote.

## Stack

- React 18 + React Router
- Tailwind CSS + shadcn/ui components
- Supabase (Postgres + Auth) for data and authentication

## Getting started

Install dependencies:

```bash
npm install
```

Copy the environment example and fill in your own values:

```bash
cp .env.example .env
```

Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Building for production

```bash
npm run build
npm run preview
```

## Environment variables

See `.env.example` — you'll need your Supabase project's URL and anon public key (Project Settings → API in the Supabase dashboard).

## Database schema

Run `supabase/schema.sql` in the Supabase SQL Editor to create the `tasks` and `thoughts` tables with row-level security.
