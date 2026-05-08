# Phase 4 Player Ecosystem

## Added Foundations

- Global player profile fields:
  - avatar, banner, bio
  - favorite games
  - favorite zones
  - XP, level, online status
  - current zone and last seen metadata
- Achievement system:
  - First Session
  - 10 Hours Played
  - Night Grinder
  - VIP Player
  - Top Spender
  - Tournament Winner placeholder
  - Zone Explorer
- Player notifications:
  - session
  - achievement
  - friend
  - zone
  - balance
  - system
- Friend graph:
  - pending, accepted, blocked statuses
- Global ecosystem activity feed.

## APIs

- `GET /api/auth/me`
  - Returns public profile, session history, total hours, total SPICA spent, achievements, notifications, friends, feed.
- `PATCH /api/auth/me`
  - Updates player profile fields.
- `GET /api/friends`
  - Lists friend requests and friend graph.
- `POST /api/friends`
  - Sends a friend request by username or email.
- `GET /api/notifications`
  - Lists player notifications.
- `PATCH /api/notifications`
  - Marks notifications as read.
- `GET /api/ecosystem/feed`
  - Returns global activity, top players, and trending zones.

## Dashboard Updates

- Player dashboard now includes:
  - profile/banner card
  - level and XP progression
  - SPICA balance
  - hours played
  - total SPICA spent
  - achievement cards
  - online friends panel
  - ecosystem feed
  - favorite games/zones context

## Achievement Hooks

- Completed sessions evaluate achievements server-side.
- Unlocks create:
  - `UserAchievement`
  - XP gain and level recalculation
  - player notification
  - ecosystem activity feed item

## Validation

- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx tsc --noEmit`
- `npm run build`
- API smoke:
  - player login
  - `/api/auth/me`
  - `/api/ecosystem/feed`
  - `/api/notifications`

## Future-Ready

This structure can support:

- tournaments
- clans/teams
- leaderboards
- creator hubs
- subscriptions
- marketplace/rewards
- Ezzstar identity layer
