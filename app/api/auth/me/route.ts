import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { patchRows, publicProfile, requireWebUser, selectRows } from "@/lib/supabase/web";

const ProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  avatar: z.string().max(1000).optional(),
  banner: z.string().max(1000).optional(),
  bio: z.string().max(280).optional(),
  favoriteGames: z.array(z.string().min(1).max(40)).max(12).optional(),
  favoriteZones: z.array(z.string().min(1)).max(20).optional()
});

export async function GET() {
  try {
    const { profile } = await requireWebUser();
    const [sessions, notifications] = await Promise.all([
      selectRows("player_sessions", `player_id=eq.${encodeURIComponent(profile.id)}&select=*&order=created_at.desc&limit=25`).catch(() => []),
      selectRows("notifications", `user_id=eq.${encodeURIComponent(profile.id)}&select=*&order=created_at.desc&limit=20`).catch(() => [])
    ]);

    return jsonOk({
      user: publicProfile(profile),
      profile: {
        totalHoursPlayed: 0,
        totalSpicaSpent: 0,
        sessionHistory: sessions,
        favoriteZones: [],
        achievements: [],
        notifications,
        friends: [],
        feed: []
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile } = await requireWebUser();
    const input = ProfileSchema.parse(await request.json());
    const [updated] = await patchRows(
      "profiles",
      `id=eq.${encodeURIComponent(profile.id)}`,
      {
        name: input.name,
        username: input.username?.toLowerCase(),
        avatar_url: input.avatar,
        banner_url: input.banner,
        bio: input.bio,
        favorite_games: input.favoriteGames,
        favorite_zones: input.favoriteZones
      }
    );

    return jsonOk({ user: publicProfile((updated as typeof profile | undefined) ?? profile) });
  } catch (error) {
    return jsonError(error);
  }
}
