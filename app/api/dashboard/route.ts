import { jsonError, jsonOk } from "@/lib/api";
import { publicProfile, requireWebUser, selectRows, WebProfile } from "@/lib/supabase/web";

function mapZone(zone: any, listingRequest?: any) {
  const rawStatus = String(zone.status ?? "pending").toLowerCase();
  const listingStatus = listingRequest?.status ? String(listingRequest.status).toLowerCase() : null;

  return {
    id: zone.id,
    name: zone.name,
    city: zone.city ?? zone.location ?? "",
    status: rawStatus,
    ownerId: zone.owner_id,
    owner: zone.owner_name || zone.owner_email ? { id: zone.owner_id ?? "", name: zone.owner_name ?? "Owner", email: zone.owner_email ?? "" } : null,
    pricing: {
      pcCount: zone.pc_count,
      rentPerHour: zone.rent_per_hour,
      currentPricingModel: zone.pricing_model ?? listingRequest?.current_pricing_model,
      listingRequestId: zone.listing_request_id ?? listingRequest?.id,
      listingRequestStatus: listingStatus,
      rawStatus,
      submittedAt: listingRequest?.created_at,
      updatedAt: zone.updated_at ?? listingRequest?.updated_at,
      approvedAt: rawStatus === "active" || listingStatus === "approved" ? zone.updated_at ?? listingRequest?.updated_at : null,
      rejectedAt: rawStatus === "rejected" || listingStatus === "rejected" ? zone.updated_at ?? listingRequest?.updated_at : null,
      phone: listingRequest?.phone,
      submittedMessage: listingRequest?.message
    },
    branding: zone.branding ?? {},
    pcs: []
  };
}

function mapSession(session: any) {
  return {
    id: session.id,
    playerId: session.player_id,
    playerName: session.player_name ?? "Player",
    zoneId: session.zone_id,
    zoneName: session.zone_name ?? "Zone",
    pcId: session.pc_id ?? "",
    pcName: session.pc_name ?? "PC",
    startTime: session.start_time ? new Date(session.start_time).getTime() : Date.now(),
    durationSeconds: session.duration_seconds ?? 0,
    status: session.status === "active" ? "Active" : "Completed",
    grossSpica: session.gross_spica ?? session.cost_spica ?? 0
  };
}

export async function GET() {
  try {
    const { profile } = await requireWebUser();
    const user = publicProfile(profile);
    const isAdmin = profile.role === "admin";
    const [profiles, zones, listingRequests, sessions, notifications, activity] = await Promise.all([
      isAdmin ? selectRows<WebProfile>("profiles", "select=*&order=created_at.desc").catch(() => []) : Promise.resolve([profile]),
      selectRows("zones", isAdmin ? "select=*&order=created_at.desc" : "status=eq.active&select=*&order=created_at.desc").catch(() => []),
      isAdmin ? selectRows("zone_listing_requests", "select=*&order=created_at.desc").catch(() => []) : Promise.resolve([]),
      selectRows("player_sessions", isAdmin ? "select=*&order=created_at.desc&limit=50" : `player_id=eq.${encodeURIComponent(profile.id)}&select=*&order=created_at.desc&limit=50`).catch(() => []),
      selectRows("notifications", isAdmin ? "select=*&order=created_at.desc&limit=50" : `user_id=eq.${encodeURIComponent(profile.id)}&select=*&order=created_at.desc&limit=25`).catch(() => []),
      isAdmin ? selectRows("admin_activity", "select=*&order=created_at.desc&limit=50").catch(() => []) : Promise.resolve([])
    ]);
    const mappedSessions = sessions.map(mapSession);
    const requestById = new Map((listingRequests as any[]).map((request) => [request.id, request]));
    const requestByOwnerEmail = new Map((listingRequests as any[]).map((request) => [String(request.email ?? "").toLowerCase(), request]));
    const mappedZones = zones.map((zone: any) => mapZone(zone, requestById.get(zone.listing_request_id) ?? requestByOwnerEmail.get(String(zone.owner_email ?? "").toLowerCase())));
    const activeZoneRows = mappedZones.filter((zone: any) => zone.pricing?.rawStatus !== "rejected" && zone.pricing?.rawStatus !== "suspended" && (zone.pricing?.rawStatus === "active" || zone.pricing?.rawStatus === "approved" || zone.pricing?.listingRequestStatus === "approved"));
    const pendingZoneRows = mappedZones.filter((zone: any) => zone.pricing?.rawStatus !== "active" && zone.pricing?.rawStatus !== "approved" && zone.pricing?.rawStatus !== "rejected" && zone.pricing?.rawStatus !== "suspended" && (zone.pricing?.rawStatus === "pending" || zone.pricing?.listingRequestStatus === "pending"));
    const rejectedZoneRows = mappedZones.filter((zone: any) => zone.pricing?.rawStatus === "rejected" || zone.pricing?.rawStatus === "suspended" || zone.pricing?.listingRequestStatus === "rejected");
    const creditsSold = profiles.reduce((sum: number, item: any) => sum + Number(item.spica_balance ?? 0), 0);
    const totalSpent = mappedSessions.reduce((sum: number, item: any) => sum + Number(item.grossSpica ?? 0), 0);

    return jsonOk({
      ok: true,
      serverTime: new Date().toISOString(),
      user,
      currentUser: user,
      users: profiles.map(publicProfile),
      zones: mappedZones,
      zoneGroups: {
        pendingZones: pendingZoneRows,
        activeZones: activeZoneRows,
        rejectedZones: rejectedZoneRows
      },
      sessions: mappedSessions,
      transactions: [],
      settlements: [],
      withdrawals: [],
      notifications,
      activity,
      analytics: {
        creditsSold,
        totalSpent,
        commission: Math.round(totalSpent * 0.1),
        zoneNet: Math.round(totalSpent * 0.9),
        onlinePcs: 0,
        activeSessions: mappedSessions.filter((item: any) => item.status === "Active").length,
        activeZones: activeZoneRows.length,
        pendingZones: pendingZoneRows.length,
        rejectedZones: rejectedZoneRows.length,
        safety: {
          offlineActiveSessions: [],
          longSessions: [],
          staleHeartbeatPcs: [],
          maintenanceActiveSessions: []
        },
        graphReady: {
          dailySpicaVolume: totalSpent,
          dailyCommission: Math.round(totalSpent * 0.1),
          sessionVolume: mappedSessions.length
        }
      }
    });
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    return jsonError(error);
  }
}
