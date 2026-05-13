import { Session, Settlement, Zone } from "@/lib/spica";
import { getRemainingTime } from "@/lib/timer";

export function selectActiveSessions(sessions: Session[]) {
  return sessions.filter((session) => session.status === "Active");
}

export function selectCompletedSessions(sessions: Session[]) {
  return sessions.filter((session) => session.status === "Completed");
}

export function selectZoneSessions(sessions: Session[], zoneId: string) {
  return sessions.filter((session) => session.zoneId === zoneId);
}

export function selectPlayerSessions(sessions: Session[], playerId: string) {
  return sessions.filter((session) => session.playerId === playerId);
}

export function selectZoneSettlements(settlements: Settlement[], zoneId: string) {
  return settlements.filter((settlement) => settlement.zoneId === zoneId);
}

export function sumSessionGross(sessions: Session[]) {
  return sessions.reduce((sum, session) => sum + session.grossSpica, 0);
}

export function sumSettlementNet(settlements: Settlement[]) {
  return settlements.reduce((sum, settlement) => sum + settlement.zoneNetAmount, 0);
}

export function selectApprovedZones(zones: Zone[]) {
  return zones.filter((zone) => zone.status === "Active");
}

export function selectExpiredActiveSessions(sessions: Session[], serverNow: number) {
  return sessions.filter((session) => session.status === "Active" && getRemainingTime(session.startTime, session.durationSeconds, serverNow) === 0);
}

export function groupSessionsByPlayer(sessions: Session[]) {
  return [...sessions.reduce<Map<string, { playerId: string; name: string; visits: number; spent: number; lastVisit: number }>>((map, session) => {
    const current = map.get(session.playerId) ?? { playerId: session.playerId, name: session.playerName, visits: 0, spent: 0, lastVisit: 0 };
    map.set(session.playerId, {
      ...current,
      visits: current.visits + 1,
      spent: current.spent + session.grossSpica,
      lastVisit: Math.max(current.lastVisit, session.endedAt ?? session.startTime)
    });
    return map;
  }, new Map()).values()];
}
