import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { insertRow, patchRows, requireWebUser, selectRows } from "@/lib/supabase/web";

const TournamentSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(140),
  description: z.string().min(1).max(2000),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  audience: z.enum(["players", "zones", "all"]),
  prize: z.string().max(240).optional(),
  imageUrl: z.string().max(1000).optional()
});

function audienceQuery(role: string) {
  if (role === "admin") {
    return "select=*&order=created_at.desc&limit=100";
  }

  const audience = role === "player" ? "players" : "zones";
  return `status=eq.published&audience=in.(${audience},all)&select=*&order=start_date.asc.nullslast&limit=50`;
}

export async function GET() {
  try {
    const { profile } = await requireWebUser();
    const rows = await selectRows("tournaments", audienceQuery(profile.role));
    return jsonOk({ ok: true, tournaments: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireWebUser(["admin"]);
    const input = TournamentSchema.parse(await request.json());
    const row = {
      title: input.title,
      description: input.description,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      status: input.status,
      audience: input.audience,
      prize: input.prize || null,
      image_url: input.imageUrl || null,
      created_by: profile.id
    };
    const tournament = input.id
      ? (await patchRows("tournaments", `id=eq.${encodeURIComponent(input.id)}`, row))[0]
      : await insertRow("tournaments", row);

    return jsonOk({ ok: true, tournament });
  } catch (error) {
    return jsonError(error);
  }
}
