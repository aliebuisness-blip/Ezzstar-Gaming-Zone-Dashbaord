import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { insertRow, patchRows, requireWebUser, selectRows } from "@/lib/supabase/web";

const AnnouncementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(140),
  body: z.string().min(1).max(3000),
  category: z.enum(["system", "tournament", "zone", "player", "security", "event"]),
  audience: z.enum(["players", "zones", "all"]),
  status: z.enum(["draft", "published", "archived"]),
  publishDate: z.string().optional(),
  imageUrl: z.string().max(1000).optional(),
  linkUrl: z.string().max(1000).optional()
});

function audienceQuery(role: string) {
  if (role === "admin") {
    return "select=*&order=created_at.desc&limit=100";
  }

  const audience = role === "player" ? "players" : "zones";
  return `status=eq.published&audience=in.(${audience},all)&select=*&order=publish_date.desc.nullslast,created_at.desc&limit=50`;
}

export async function GET() {
  try {
    const { profile } = await requireWebUser();
    const rows = await selectRows("announcements", audienceQuery(profile.role));
    return jsonOk({ ok: true, announcements: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireWebUser(["admin"]);
    const input = AnnouncementSchema.parse(await request.json());
    const row = {
      title: input.title,
      body: input.body,
      category: input.category,
      audience: input.audience,
      status: input.status,
      publish_date: input.publishDate || null,
      image_url: input.imageUrl || null,
      link_url: input.linkUrl || null,
      created_by: profile.id
    };
    const announcement = input.id
      ? (await patchRows("announcements", `id=eq.${encodeURIComponent(input.id)}`, row))[0]
      : await insertRow("announcements", row);

    return jsonOk({ ok: true, announcement });
  } catch (error) {
    return jsonError(error);
  }
}
