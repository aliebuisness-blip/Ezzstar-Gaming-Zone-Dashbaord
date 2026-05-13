# Supabase Storage Media Layer

SPICA ARENA OS uses Supabase only for public/content media in this phase.

Prisma remains the source of truth for auth, roles, PC sessions, realtime pairing, settlements, and operational data.

## Environment

Add these keys to `.env` when media uploads are needed:

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
```

If the keys are missing, dashboards keep working and upload actions return a clear “Supabase Storage is not configured” message.

## Buckets

Create buckets with:

```bash
npm run supabase:storage
```

Buckets:

- `avatars`
- `zone-media`
- `announcements`
- `listing-requests`

## Upload API

`POST /api/uploads` accepts `multipart/form-data`:

- `file`
- `purpose`
- optional `zoneId`

Supported purposes:

- `player-avatar`
- `player-banner`
- `zone-logo`
- `zone-banner`
- `announcement-media`
- `listing-request-attachment`

The API validates file type, file size, and role/zone permissions before uploading.

