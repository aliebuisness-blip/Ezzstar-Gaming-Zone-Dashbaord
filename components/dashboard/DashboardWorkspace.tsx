"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Banknote, BarChart3, Coins, ImageIcon, Landmark, Monitor, ShieldCheck, Sparkles, Timer, Trophy, UploadCloud, Users, WalletCards } from "lucide-react";
import { PCCard } from "@/components/PCCard";
import { NotificationCenter } from "@/components/NotificationCenter";
import { RoleNavKey, RoleSidebar } from "@/components/RoleSidebar";
import { PairingRequestsPanel } from "@/components/PairingRequestsPanel";
import { SessionModal } from "@/components/SessionModal";
import { SettlementTable } from "@/components/SettlementTable";
import { StatCard } from "@/components/StatCard";
import { SystemActivityFeed } from "@/components/SystemActivityFeed";
import { Topbar } from "@/components/Topbar";
import { WalletCard } from "@/components/WalletCard";
import { WithdrawalTable } from "@/components/WithdrawalTable";
import { ZoneCard } from "@/components/ZoneCard";
import { useDashboardFeedback } from "@/components/DashboardFeedback";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppButton } from "@/components/ui/AppButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OverlayDrawer } from "@/components/ui/OverlayDrawer";
import { PlayerHome } from "@/components/dashboard/player/PlayerHome";
import { PlayerDashboard } from "@/components/dashboard/player/PlayerDashboard";
import { PlayerWallet } from "@/components/dashboard/player/PlayerWallet";
import { PlayerActivity } from "@/components/dashboard/player/PlayerActivity";
import { PlayerZones } from "@/components/dashboard/player/PlayerZones";
import { PlayerUpdates } from "@/components/dashboard/player/PlayerUpdates";
import { PlayerProfile } from "@/components/dashboard/player/PlayerProfile";
import { ZoneOSWorkspace } from "@/components/dashboard/zone/ZoneOSWorkspace";
import { ZoneHome } from "@/components/dashboard/zone/ZoneHome";
import { ZonePCs } from "@/components/dashboard/zone/ZonePCs";
import { ZoneCustomers } from "@/components/dashboard/zone/ZoneCustomers";
import { ZoneSessions } from "@/components/dashboard/zone/ZoneSessions";
import { ZoneEarnings } from "@/components/dashboard/zone/ZoneEarnings";
import { ZoneUpdates } from "@/components/dashboard/zone/ZoneUpdates";
import { ZoneSettings } from "@/components/dashboard/zone/ZoneSettings";
import { AdminDashboard } from "@/components/dashboard/admin/AdminDashboard";
import { AdminHome } from "@/components/dashboard/admin/AdminHome";
import { AdminZones } from "@/components/dashboard/admin/AdminZones";
import { AdminPlayers } from "@/components/dashboard/admin/AdminPlayers";
import { AdminRequests } from "@/components/dashboard/admin/AdminRequests";
import { AdminSettlements } from "@/components/dashboard/admin/AdminSettlements";
import { AdminSystemHealth } from "@/components/dashboard/admin/AdminSystemHealth";
import { formatTime, getRemainingTime } from "@/lib/timer";
import { useAppStore } from "@/context/AppStore";
import {
  ActivityItem,
  DashboardRole,
  GamingPc,
  Player,
  Session,
  WithdrawalType,
  Zone,
  formatPkr,
  formatSpica,
  spicaToPkr
} from "@/lib/spica";

const defaultView: Record<DashboardRole, RoleNavKey> = {
  player: "Home",
  zone: "Home",
  admin: "Home"
};

const roleTitle: Record<DashboardRole, string> = {
  player: "SPICA Player App",
  zone: "SPICA Zone OS",
  admin: "Ezzstar Control Center"
};

const roleEyebrow: Record<DashboardRole, string> = {
  player: "Mobile companion",
  zone: "Installed operator software",
  admin: "Ezzstar Web App"
};

const isDemoMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ZoneAnnouncement = {
  id: string;
  title: string;
  message: string;
  mediaUrl?: string;
  type: "general" | "event" | "maintenance" | "offer";
  visibility: "public" | "followers" | "customers";
  createdAt: number;
};

type PlatformTournament = {
  id: string;
  title: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  status: "draft" | "published" | "archived";
  audience: "players" | "zones" | "all";
  prize?: string | null;
  imageUrl?: string | null;
};

type PlatformAnnouncement = {
  id: string;
  title: string;
  body: string;
  category: "system" | "tournament" | "zone" | "player" | "security" | "event";
  audience: "players" | "zones" | "all";
  status: "draft" | "published" | "archived";
  publishDate?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
};

type SpicaDashboardProps = {
  role: DashboardRole;
  initialView?: RoleNavKey;
};

function isPlayerNotification(item: ActivityItem) {
  const text = `${item.label} ${item.detail}`.toLowerCase();
  return [
    "top-up",
    "bought spica",
    "spica",
    "session started",
    "session ended",
    "low balance",
    "tournament",
    "event",
    "account",
    "security"
  ].some((term) => text.includes(term)) && ![
    "pc status",
    "pc pairing",
    "pc manually",
    "backend synced",
    "command",
    "heartbeat",
    "settlement",
    "withdrawal",
    "admin",
    "owner"
  ].some((term) => text.includes(term));
}

function isRoleActivity(item: ActivityItem, role: DashboardRole) {
  const text = `${item.label} ${item.detail}`.toLowerCase();
  if (role === "player") {
    return isPlayerNotification(item);
  }

  if (role === "zone") {
    return ["pc status", "pc pairing", "session", "settlement", "balance", "player verified", "pc manually"].some((term) => text.includes(term))
      && !["admin", "platform", "all zones", "global player", "commission estimate", "backend synced"].some((term) => text.includes(term));
  }

  return ["zone", "approval", "settlement", "failed", "warning", "offline", "rejected", "security", "platform", "session"].some((term) => text.includes(term))
    && !["heartbeat received", "raw websocket", "command bridge", "socket"].some((term) => text.includes(term));
}

function dedupeActivity(items: ActivityItem[], limit: number) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const bucket = Math.floor(item.createdAt / 60_000);
    const key = `${item.label}-${item.detail}-${bucket}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).slice(0, limit);
}

export function DashboardWorkspace({ role, initialView }: SpicaDashboardProps) {
  const [hydrated, setHydrated] = useState(false);
  const [activeView, setActiveView] = useState<RoleNavKey>(initialView ?? defaultView[role]);
  const [openDrawer, setOpenDrawer] = useState<"notifications" | "activity" | null>(null);
  const [notificationReadAt, setNotificationReadAt] = useState(0);
  const { confirm, toast } = useDashboardFeedback();
  const {
    activity,
    addTime,
    approveSettlement,
    approveWithdrawal,
    buySpica,
    creditsSold,
    currentUser,
    dashboardApiError,
    dashboardApiStatus,
    dashboardDataError,
    dashboardDataStatus,
    debug,
    endSession,
    players,
    rejectWithdrawal,
    requestWithdrawal,
    refreshBackendDashboard,
    serverTimeOffsetMs,
    sessions,
    settlements,
    startSession,
    transactions,
    withdrawals,
    zones
  } = useAppStore();
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedPc, setSelectedPc] = useState<GamingPc | null>(null);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [testPanelMessage, setTestPanelMessage] = useState<string | null>(null);
  const [showOfflinePcs, setShowOfflinePcs] = useState(false);
  const [newPcName, setNewPcName] = useState("PC-02");
  const [newPcRate, setNewPcRate] = useState(100);
  const [newPcCategory, setNewPcCategory] = useState<"standard" | "premium" | "vip">("standard");
  const [setupConfig, setSetupConfig] = useState<string | null>(null);
  const [setupCommand, setSetupCommand] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<"all" | "Active" | "Completed">("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [playerActivitySearch, setPlayerActivitySearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [playerZoneSearch, setPlayerZoneSearch] = useState("");
  const [zonePlayerSearch, setZonePlayerSearch] = useState("");
  const [zonePlayerResults, setZonePlayerResults] = useState<Player[]>([]);
  const [zonePlayerSearchLoading, setZonePlayerSearchLoading] = useState(false);
  const [selectedOperatorPcId, setSelectedOperatorPcId] = useState("");
  const [popupMessage, setPopupMessage] = useState("Welcome to SPICA Arena");
  const [managerName, setManagerName] = useState("Floor Manager");
  const [managerEmail, setManagerEmail] = useState("manager@spica.local");
  const [managerUsername, setManagerUsername] = useState("floor-manager");
  const [managerPassword, setManagerPassword] = useState("password123");
  const [adminSearch, setAdminSearch] = useState("");
  const [cleanupInFlight, setCleanupInFlight] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementMediaUrl, setAnnouncementMediaUrl] = useState("");
  const [announcementType, setAnnouncementType] = useState<ZoneAnnouncement["type"]>("general");
  const [announcementVisibility, setAnnouncementVisibility] = useState<ZoneAnnouncement["visibility"]>("public");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [zoneAnnouncements, setZoneAnnouncements] = useState<ZoneAnnouncement[]>([]);
  const [platformTournaments, setPlatformTournaments] = useState<PlatformTournament[]>([]);
  const [platformAnnouncements, setPlatformAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [tournamentDraft, setTournamentDraft] = useState({
    id: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "draft" as PlatformTournament["status"],
    audience: "players" as PlatformTournament["audience"],
    prize: "",
    imageUrl: ""
  });
  const [platformAnnouncementDraft, setPlatformAnnouncementDraft] = useState({
    id: "",
    title: "",
    body: "",
    category: "system" as PlatformAnnouncement["category"],
    audience: "players" as PlatformAnnouncement["audience"],
    status: "draft" as PlatformAnnouncement["status"],
    publishDate: "",
    imageUrl: "",
    linkUrl: ""
  });
  const [profileDraft, setProfileDraft] = useState({ username: "", bio: "", favoriteGames: "", avatar: "", banner: "" });
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const serverNow = now + serverTimeOffsetMs;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setActiveView(initialView ?? defaultView[role]);
  }, [initialView, role]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function loadPlatformContent() {
    setContentLoading(true);
    setContentError(null);

    try {
      const [tournamentsResponse, announcementsResponse] = await Promise.all([
        fetch("/api/content/tournaments", { credentials: "include" }),
        fetch("/api/content/announcements", { credentials: "include" })
      ]);
      const [tournamentsPayload, announcementsPayload] = await Promise.all([
        tournamentsResponse.json().catch(() => ({})),
        announcementsResponse.json().catch(() => ({}))
      ]);

      if (!tournamentsResponse.ok || !announcementsResponse.ok) {
        throw new Error(tournamentsPayload.error ?? announcementsPayload.error ?? "Content could not load.");
      }

      setPlatformTournaments((tournamentsPayload.tournaments ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.status,
        audience: item.audience,
        prize: item.prize,
        imageUrl: item.image_url
      })));
      setPlatformAnnouncements((announcementsPayload.announcements ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        category: item.category,
        audience: item.audience,
        status: item.status,
        publishDate: item.publish_date,
        imageUrl: item.image_url,
        linkUrl: item.link_url
      })));
    } catch (error) {
      setContentError(error instanceof Error ? error.message : "Content could not load.");
    } finally {
      setContentLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.id) {
      loadPlatformContent();
    }
  }, [currentUser?.id, role]);

  useEffect(() => {
    if (currentUser?.id) {
      setSelectedPlayerId(currentUser.id);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!selectedZoneId && zones[0]?.id) {
      setSelectedZoneId(zones[0].id);
    }
  }, [selectedZoneId, zones]);

  useEffect(() => {
    const hasExpiredActiveSession = sessions.some(
      (session) => session.status === "Active" && getRemainingTime(session.startTime, session.durationSeconds, serverNow) === 0
    );

    if (hasExpiredActiveSession && !cleanupInFlight) {
      cleanupExpiredSessions();
    }
  }, [serverNow, sessions, cleanupInFlight]);

  const emptyZone: Zone = { id: "", name: "", city: "", status: "Pending", pcs: [] };
  const emptyPlayer = currentUser ?? { id: "", name: "Player", username: "", email: "", balance: 0 };
  const allKnownPlayers = [...players, ...zonePlayerResults.filter((result) => !players.some((player) => player.id === result.id))];
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0] ?? emptyZone;
  const selectedPlayer = allKnownPlayers.find((player) => player.id === selectedPlayerId) ?? currentUser ?? allKnownPlayers[0] ?? emptyPlayer;
  const ownerZone = zones[0] ?? emptyZone;
  const activeZones = zones.filter((zone) => zone.status === "Active").length;
  const activeSessions = sessions.filter((session) => session.status === "Active");
  const playerSessions = sessions.filter((session) => session.playerId === selectedPlayer.id);
  const playerActiveSession = playerSessions.find((session) => session.status === "Active");
  const ownerSessions = sessions.filter((session) => session.zoneId === ownerZone.id);
  const ownerSettlements = settlements.filter((settlement) => settlement.zoneId === ownerZone.id);
  const ownerGross = ownerSettlements.reduce((sum, item) => sum + item.grossSpica, 0) + ownerSessions.reduce((sum, item) => sum + item.grossSpica, 0);
  const ownerCompletedSessions = ownerSessions.filter((session) => session.status === "Completed");
  const ownerHours = ownerSessions.reduce((sum, session) => sum + session.durationSeconds / 3600, 0);
  const ownerTopPlayers = [...ownerSessions.reduce<Map<string, { name: string; spend: number; sessions: number }>>((map, session) => {
    const current = map.get(session.playerId) ?? { name: session.playerName, spend: 0, sessions: 0 };
    map.set(session.playerId, { ...current, spend: current.spend + session.grossSpica, sessions: current.sessions + 1 });
    return map;
  }, new Map()).values()].sort((a, b) => b.spend - a.spend).slice(0, 4);
  const mostUsedPcs = [...ownerSessions.reduce<Map<string, { pcName: string; sessions: number; hours: number }>>((map, session) => {
    const current = map.get(session.pcId) ?? { pcName: session.pcName, sessions: 0, hours: 0 };
    map.set(session.pcId, { ...current, sessions: current.sessions + 1, hours: current.hours + session.durationSeconds / 3600 });
    return map;
  }, new Map()).values()].sort((a, b) => b.sessions - a.sessions).slice(0, 4);
  const totalSpent = sessions.reduce((sum, session) => sum + session.grossSpica, 0) + settlements.reduce((sum, settlement) => sum + settlement.grossSpica, 0);
  const commissionEarned = settlements.reduce((sum, settlement) => sum + settlement.ezzstarFee, 0);
  const pendingWithdrawals = withdrawals.filter((withdrawal) => withdrawal.status === "Pending").reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
  const pendingSettlements = settlements.filter((settlement) => settlement.status === "Pending" || settlement.status === "Ready");
  const playerVisibleZones = zones.filter((zone) => zone.status === "Active");
  const playerCompletedSessions = playerSessions.filter((session) => session.status === "Completed");
  const playerHours = playerSessions.reduce((sum, session) => sum + session.durationSeconds / 3600, 0);
  const playerSpent = playerSessions.reduce((sum, session) => sum + session.grossSpica, 0);
  const playerLevel = selectedPlayer.level ?? 1;
  const playerXp = selectedPlayer.xp ?? 0;
  const nextLevelXp = playerLevel * playerLevel * 250;
  const playerAchievements = [
    { name: "First Session", detail: "Started your first SPICA session", unlocked: playerSessions.length > 0 },
    { name: "10 Hours Played", detail: `${playerHours.toFixed(1)} / 10 hours`, unlocked: playerHours >= 10 },
    { name: "Night Grinder", detail: "Play after midnight", unlocked: playerSessions.some((session) => new Date(session.startTime).getHours() < 5) },
    { name: "VIP Player", detail: "Play on a VIP PC", unlocked: playerSessions.some((session) => session.ratePerHour >= 200) },
    { name: "Top Spender", detail: `${formatSpica(playerSpent)} spent`, unlocked: playerSpent >= 5000 },
    { name: "Zone Explorer", detail: "Play across multiple zones", unlocked: new Set(playerSessions.map((session) => session.zoneId)).size > 1 }
  ];
  const availableOperatorPcs = ownerZone.pcs.filter((pc) => pc.status === "available" && !pc.sessionId && !pc.maintenanceMode);
  const selectedOperatorPc = ownerZone.pcs.find((pc) => pc.id === selectedOperatorPcId) ?? availableOperatorPcs[0] ?? null;
  const selectedOperatorPlayer = zonePlayerResults.find((player) => player.id === selectedPlayerId) ?? null;
  const operatorPlayableMinutes = selectedOperatorPc && selectedOperatorPlayer ? Math.floor((selectedOperatorPlayer.balance / selectedOperatorPc.ratePerHour) * 60) : 0;

  useEffect(() => {
    setProfileDraft({
      username: selectedPlayer?.username ?? "",
      bio: selectedPlayer?.bio ?? "",
      favoriteGames: selectedPlayer?.favoriteGames?.join(", ") ?? "",
      avatar: selectedPlayer?.avatar ?? "",
      banner: selectedPlayer?.banner ?? ""
    });
  }, [selectedPlayer?.id]);

  useEffect(() => {
    if (!selectedOperatorPcId && availableOperatorPcs[0]?.id) {
      setSelectedOperatorPcId(availableOperatorPcs[0].id);
    }
  }, [availableOperatorPcs, selectedOperatorPcId]);

  const remainingBySession = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.id] = session.status === "Active" ? getRemainingTime(session.startTime, session.durationSeconds, serverNow) : 0;
      return acc;
    }, {});
  }, [sessions, serverNow]);
  const roleActivity = useMemo(() => dedupeActivity(activity.filter((item) => isRoleActivity(item, role)), role === "player" ? 8 : 20), [activity, role]);
  const unreadNotifications = useMemo(() => roleActivity.filter((item) => item.createdAt > notificationReadAt).length, [notificationReadAt, roleActivity]);

  function closeNotificationDrawer() {
    setNotificationReadAt(Date.now());
    setOpenDrawer(null);
  }

  function renderAvatarSlot(player: Pick<Player, "name" | "username" | "email" | "avatar">, size = "h-11 w-11") {
    const label = player.name || player.username || player.email || "Player";

    return (
      <span className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-bold text-cyan-100`}>
        {player.avatar ? <img alt="" className="h-full w-full object-cover" src={player.avatar} /> : label.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  function handleRequestWithdrawal(userId: string, amount: number, type: WithdrawalType) {
    const actorId = type === "Owner" ? `owner-${ownerZone.id}` : userId;
    requestWithdrawal(actorId, type, amount);
    toast("success", type === "Owner" ? "Payout request submitted." : "Request submitted.");
  }

  function handleBuySpica(playerId: string, amount: number) {
    buySpica(playerId, amount);
    toast("success", `${formatSpica(amount)} added to wallet.`);
  }

  function saveZoneAnnouncement() {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast("warning", "Add a title and message before publishing.");
      return;
    }

    const nextAnnouncement: ZoneAnnouncement = {
      id: editingAnnouncementId ?? `ANN-${Date.now()}`,
      title: announcementTitle.trim(),
      message: announcementMessage.trim(),
      mediaUrl: announcementMediaUrl || undefined,
      type: announcementType,
      visibility: announcementVisibility,
      createdAt: editingAnnouncementId ? zoneAnnouncements.find((item) => item.id === editingAnnouncementId)?.createdAt ?? Date.now() : Date.now()
    };

    setZoneAnnouncements((current) =>
      editingAnnouncementId
        ? current.map((item) => (item.id === editingAnnouncementId ? nextAnnouncement : item))
        : [nextAnnouncement, ...current]
    );
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementMediaUrl("");
    setAnnouncementType("general");
    setAnnouncementVisibility("public");
    setEditingAnnouncementId(null);
    toast("success", editingAnnouncementId ? "Announcement updated." : "Announcement published.");
  }

  async function savePlatformTournament() {
    try {
      const response = await fetch("/api/content/tournaments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tournamentDraft, id: tournamentDraft.id || undefined })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "Tournament could not be saved.");
      }

      setTournamentDraft({ id: "", title: "", description: "", startDate: "", endDate: "", status: "draft", audience: "players", prize: "", imageUrl: "" });
      await loadPlatformContent();
      toast("success", "Tournament saved.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Tournament could not be saved.");
    }
  }

  async function savePlatformAnnouncement() {
    try {
      const response = await fetch("/api/content/announcements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...platformAnnouncementDraft, id: platformAnnouncementDraft.id || undefined })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "Announcement could not be saved.");
      }

      setPlatformAnnouncementDraft({ id: "", title: "", body: "", category: "system", audience: "players", status: "draft", publishDate: "", imageUrl: "", linkUrl: "" });
      await loadPlatformContent();
      toast("success", "Announcement saved.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Announcement could not be saved.");
    }
  }

  function editZoneAnnouncement(announcement: ZoneAnnouncement) {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementTitle(announcement.title);
    setAnnouncementMessage(announcement.message);
    setAnnouncementMediaUrl(announcement.mediaUrl ?? "");
    setAnnouncementType(announcement.type);
    setAnnouncementVisibility(announcement.visibility);
  }

  async function deleteZoneAnnouncement(id: string) {
    const confirmed = await confirm({
      title: "Delete announcement?",
      description: "This update will be removed from the zone updates workspace.",
      impact: "Players will no longer see this announcement in their updates feed.",
      confirmLabel: "Delete announcement",
      destructive: true
    });

    if (!confirmed) return;

    setZoneAnnouncements((current) => current.filter((item) => item.id !== id));
    toast("success", "Announcement deleted.");
  }

  async function saveProfileDraft() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: profileDraft.username,
          bio: profileDraft.bio,
          favoriteGames: profileDraft.favoriteGames.split(",").map((item) => item.trim()).filter(Boolean),
          avatar: profileDraft.avatar || undefined,
          banner: profileDraft.banner || undefined
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast("error", payload.error ?? "Profile could not be saved.");
        return;
      }

      await refreshBackendDashboard();
      toast("success", "Profile changes saved.");
    } catch {
      toast("error", "Profile could not be saved.");
    }
  }

  async function uploadMedia(file: File, purpose: string, options?: { zoneId?: string }) {
    setUploadingMedia(purpose);

    try {
      const formData = new FormData();
      formData.append("purpose", purpose);
      formData.append("file", file);

      if (options?.zoneId) {
        formData.append("zoneId", options.zoneId);
      }

      const response = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast("error", payload.error ?? "Media upload is not available.");
        return null;
      }

      await refreshBackendDashboard();
      toast("success", "Media uploaded.");
      return payload as { publicUrl: string; path: string };
    } catch {
      toast("error", "Media upload failed. Please try again.");
      return null;
    } finally {
      setUploadingMedia(null);
    }
  }

  async function postJson<T>(url: string, body: unknown): Promise<T | null | undefined> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });

      const rawText = await response.text();
      let payload: any = null;

      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        const isHtmlError = rawText.trim().startsWith("<!DOCTYPE") || rawText.trim().startsWith("<html");

        if (isHtmlError) {
          console.error(`${url} returned HTML error page`, rawText);
          payload = { error: "This action could not be completed. Please try again." };
        } else {
          payload = { error: rawText || "This action could not be completed." };
        }
      }

      if (!response.ok) {
        const message = payload?.error ?? "This action could not be completed.";
        setTestPanelMessage(message);
        toast("error", message);
        return null;
      }

      setTestPanelMessage(null);
      return payload as T;
    } catch {
      console.error(`${url} request failed`, body);
      setTestPanelMessage("Connection lost. Reconnecting...");
      toast("warning", "Connection lost. Reconnecting...");
      return undefined;
    }
  }

  function getPcDisplayStatus(pc: GamingPc): "Online" | "Offline" | "In Use" {
    if (pc.sessionId || pc.status === "in_use") {
      return "In Use";
    }

    if (pc.status === "offline") {
      return "Offline";
    }

    return "Online";
  }

  function formatHeartbeat(lastHeartbeat?: number) {
    if (!lastHeartbeat) {
      return "No heartbeat yet";
    }

    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(lastHeartbeat);
  }

  async function startTestSession(pc: GamingPc) {
    await startDashboardSession(selectedPlayer.id, ownerZone.id, pc.id, 5);
  }

  async function startDashboardSession(playerId: string, zoneId: string, pcId: string, durationMinutes: number) {
    const result = await postJson<{ session?: { id: string }; commandSent?: boolean }>("/api/start-session", {
      playerId,
      zoneId,
      pcId,
      durationMinutes
    });

    if (result?.session?.id) {
      setTestSessionId(result.session.id);
      if (result.commandSent === false) {
        const message = "Session was created, but the PC command was not delivered. Check realtime and PC connection.";
        setTestPanelMessage(message);
        toast("warning", message);
      } else {
        setTestPanelMessage(null);
        toast("success", "Session started and PC command sent.");
      }
      await refreshBackendDashboard();
      return;
    }
  }

  async function addDashboardTime(sessionId: string, extraMinutes: number) {
    const result = await postJson<{ session?: { id: string } }>("/api/add-time", {
      sessionId,
      extraMinutes
    });

    if (result?.session?.id) {
      setTestSessionId(result.session.id);
      toast("success", "Session time updated.");
      await refreshBackendDashboard();
      return;
    }

    if (result === undefined) {
      addTime(sessionId, extraMinutes);
    }
  }

  async function endDashboardSession(sessionId: string, requireConfirmation = true) {
    if (requireConfirmation) {
      const confirmed = await confirm({
        title: "End active session?",
        description: "This will complete the session, unlock settlement creation, and send an end-session command to the PC client.",
        impact: "The player will be returned to the locked kiosk screen.",
        confirmLabel: "End session",
        destructive: true
      });

      if (!confirmed) return;
    }

    const result = await postJson<{ session?: { id: string } }>("/api/end-session", { sessionId });

    if (result?.session) {
      setTestSessionId(null);
      toast("success", "Session ended.");
      await refreshBackendDashboard();
      return;
    }

    if (result === undefined) {
      endSession(sessionId);
    }
  }

  async function cleanupExpiredSessions() {
    setCleanupInFlight(true);
    const result = await postJson<{ count: number }>("/api/sessions/cleanup", {});

    if (result) {
      setTestPanelMessage(`Cleaned up ${result.count} expired session${result.count === 1 ? "" : "s"}.`);
      toast("success", "Expired sessions cleaned up.");
      await refreshBackendDashboard();
    }

    setCleanupInFlight(false);
  }

  async function registerPc() {
    const result = await postJson<{ setupConfig?: Record<string, string>; setupCommand?: string }>("/api/pcs", {
      name: newPcName,
      zoneId: ownerZone.id,
      ratePerHour: newPcRate,
      category: newPcCategory
    });

    if (result?.setupConfig) {
      const config = Object.entries(result.setupConfig)
        .map(([key, value]) => `${key}="${value}"`)
        .join("\n");
      setSetupConfig(config);
      setSetupCommand(result.setupCommand ?? null);
      toast("success", "PC registered. Setup config is ready.");
      await refreshBackendDashboard();
    }
  }

  async function updatePc(pcId: string, body: Record<string, unknown>) {
    if (body.maintenanceMode !== undefined) {
      const confirmed = await confirm({
        title: body.maintenanceMode ? "Put PC into maintenance?" : "Return PC to service?",
        description: body.maintenanceMode ? "This PC will be unavailable for new sessions until maintenance mode is turned off." : "This PC will be available again when it is online and healthy.",
        confirmLabel: body.maintenanceMode ? "Enable maintenance" : "Return to service",
        destructive: Boolean(body.maintenanceMode)
      });

      if (!confirmed) return;
    }

    if (body.regenerateToken || body.regenerateAuthToken) {
      const confirmed = await confirm({
        title: "Regenerate PC token?",
        description: "The current PC client token will stop working until the client is updated with the new configuration.",
        impact: "Use this only if a token was exposed or a machine is being re-paired.",
        confirmLabel: "Regenerate token",
        destructive: true
      });

      if (!confirmed) return;
    }

    const result = await postJson<{ pc?: GamingPc; setupConfig?: Record<string, string> }>(`/api/pcs/${pcId}`, body);

    if (result?.setupConfig) {
      setSetupConfig(Object.entries(result.setupConfig).map(([key, value]) => `${key}="${value}"`).join("\n"));
      setSetupCommand(`setx VITE_PC_ID "${pcId}" && setx VITE_PC_AUTH_TOKEN "${result.setupConfig.VITE_PC_AUTH_TOKEN}"`);
    }

    if (result) {
      toast("success", "PC settings saved.");
      await refreshBackendDashboard();
    }
  }

  async function removePc(pcId: string) {
    const confirmed = await confirm({
      title: "Remove this PC?",
      description: "This will remove the PC from the zone dashboard and invalidate its paired client credentials.",
      impact: "If the client is running, it will be told to return to pairing. Active sessions should be ended first.",
      confirmLabel: "Remove PC",
      destructive: true
    });

    if (!confirmed) return;

    const response = await fetch(`/api/pcs/${pcId}`, { method: "DELETE", credentials: "include" });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to remove PC" }));
      const message = payload.error ?? "PC could not be removed.";
      setTestPanelMessage(message);
      toast("error", message);
      return;
    }

    toast("success", "PC removed successfully.");
    await refreshBackendDashboard();
  }

  async function sendTestCommand() {
    const targetPc = ownerZone.pcs[0];

    if (!targetPc) {
      toast("warning", "No registered PC is available for a test command.");
      return;
    }

    const result = await postJson<{ ok?: boolean }>("/api/test-pc-command", {
      pcId: targetPc.id,
      message: "Dashboard command test"
    });

    if (result?.ok) {
      setTestPanelMessage(`Test command sent to ${targetPc.name}.`);
    }
  }

  async function sendPopupToPc(pcId: string) {
    const result = await postJson<{ ok?: boolean }>("/api/test-pc-command", {
      pcId,
      message: popupMessage
    });

    if (result?.ok) {
      setTestPanelMessage(`Popup sent to ${pcId}.`);
      toast("success", "Message sent to PC.");
    }
  }

  async function createManager() {
    const result = await postJson<{ manager?: { id: string; name: string } }>("/api/staff", {
      name: managerName,
      username: managerUsername,
      email: managerEmail,
      password: managerPassword,
      zoneId: ownerZone.id
    });

    if (result?.manager) {
      setTestPanelMessage(`Manager ${result.manager.name} created.`);
      toast("success", "Manager account created.");
    }
  }

  async function patchZoneStatus(zoneId: string, status: "active" | "pending" | "rejected" | "suspended") {
    const confirmed = await confirm({
      title: `${status === "active" ? "Approve/reactivate" : status === "suspended" ? "Suspend" : "Update"} zone?`,
      description: "This changes the zone visibility and operational status across SPICA ARENA OS.",
      impact: status === "suspended" || status === "rejected" ? "Players may no longer be able to start sessions at this zone." : "Approved zones can appear in player zone discovery.",
      confirmLabel: status === "active" ? "Approve zone" : status === "suspended" ? "Suspend zone" : "Update zone",
      destructive: status === "suspended" || status === "rejected"
    });

    if (!confirmed) return;

    let result: { ok?: boolean; zone?: unknown } | null = null;

    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => ({ ok: false, error: "Action could not be completed." }));

      if (!response.ok || payload.ok === false) {
        const message = payload.error ?? "Action could not be completed.";
        setTestPanelMessage(message);
        toast("error", message);
        return;
      }

      result = payload;
    } catch {
      const message = "Connection lost. Reconnecting...";
      setTestPanelMessage(message);
      toast("warning", message);
      return;
    }

    if (result) {
      toast("success", "Zone status updated.");
      await refreshBackendDashboard();
    }
  }

  async function patchSettlementStatus(settlementId: string, status: "approved" | "paid", payoutMethod = "PKR") {
    const confirmed = await confirm({
      title: status === "paid" ? "Mark settlement paid?" : "Approve settlement?",
      description: status === "paid" ? "This records the settlement as paid in the admin dashboard." : "This approves the settlement for payout processing.",
      impact: "This action affects platform financial reporting.",
      confirmLabel: status === "paid" ? "Mark paid" : "Approve settlement"
    });

    if (!confirmed) return;

    const result = await postJson<{ settlement?: unknown }>(`/api/settlements/${settlementId}`, { status, payoutMethod });

    if (result) {
      toast("success", status === "paid" ? "Settlement marked paid." : "Settlement approved.");
      await refreshBackendDashboard();
    }
  }

  async function copySetupConfig() {
    if (setupConfig) {
      await navigator.clipboard?.writeText(setupConfig);
      setTestPanelMessage("PC setup config copied.");
      toast("success", "PC setup config copied.");
    }
  }

  function downloadSetupConfig() {
    if (!setupConfig) {
      return;
    }

    const blob = new Blob([setupConfig], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spica-pc-client.env";
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderDebugPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-nebula">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Dev Debug</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Realtime Health</h3>
          </div>
          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
            <span>PC sockets: <strong className="text-cyan-100">{debug.connectedSockets}</strong></span>
            <span>Dashboards: <strong className="text-cyan-100">{debug.dashboardSockets}</strong></span>
            <span>PC IDs: <strong className="font-mono text-cyan-100">{debug.connectedPcIds.join(", ") || "None"}</strong></span>
            <span>Active: <strong className="text-cyan-100">{Object.keys(debug.activeSessions).length}</strong></span>
            <span>Generated: <strong className="text-cyan-100">{debug.generatedAt ? formatHeartbeat(new Date(debug.generatedAt).getTime()) : "Waiting"}</strong></span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Reconnects</p>
            <pre className="mt-2 max-h-24 overflow-auto text-xs text-slate-400">{JSON.stringify(debug.reconnectEvents, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Heartbeats</p>
            <pre className="mt-2 max-h-24 overflow-auto text-xs text-slate-400">{JSON.stringify(debug.heartbeats, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-200">Command Dispatch Logs</p>
            <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{debug.commandLogs.join("\n") || "No commands yet"}</pre>
          </div>
        </div>
      </section>
    );
  }

  function renderConnectedPcTestPanel() {
    if (!isDemoMode) {
      return null;
    }

    const pc = ownerZone.pcs[0];
    const activeSession =
      sessions.find((session) => session.id === testSessionId && session.status === "Active") ??
      sessions.find((session) => session.pcId === pc?.id && session.status === "Active");
    const activeSessionId = activeSession?.id ?? testSessionId;

    if (!pc) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-slate-400 shadow-nebula">
          No registered PCs found in the database.
        </div>
      );
    }

    const displayStatus = getPcDisplayStatus(pc);
    const canStart = displayStatus === "Online";
    const canControl = Boolean(activeSessionId);

    return (
      <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5 shadow-[0_0_34px_rgba(34,211,238,0.08)] backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Development PC Test Panel</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-semibold text-white">{pc.name}</h3>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  displayStatus === "In Use"
                    ? "border-purple-300/30 bg-purple-400/10 text-purple-100"
                    : displayStatus === "Online"
                      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                      : "border-red-300/30 bg-red-400/10 text-red-100"
                }`}
              >
                {displayStatus}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
              <span>PC id: <strong className="font-mono text-slate-200">{pc.id}</strong></span>
              <span>Last heartbeat: <strong className="text-slate-200">{formatHeartbeat(pc.lastHeartbeat)}</strong></span>
              <span>Current session: <strong className="font-mono text-slate-200">{activeSessionId ?? "None"}</strong></span>
            </div>
            {testPanelMessage ? <p className="mt-3 text-sm text-amber-200">{testPanelMessage}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canStart}
              onClick={() => startTestSession(pc)}
              type="button"
            >
              Start 5 min session
            </button>
            <button
              className="rounded-2xl border border-purple-300/25 bg-purple-300/10 px-4 py-3 text-sm font-semibold text-purple-50 transition hover:border-purple-100/60 hover:shadow-[0_0_24px_rgba(168,85,247,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canControl}
              onClick={() => activeSessionId && addDashboardTime(activeSessionId, 2)}
              type="button"
            >
              Add 2 min
            </button>
            <button
              className="rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-50 transition hover:border-red-100/60 hover:shadow-[0_0_24px_rgba(248,113,113,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canControl}
              onClick={() => activeSessionId && endDashboardSession(activeSessionId)}
              type="button"
            >
              End session
            </button>
            <button
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-100/40 hover:text-cyan-50"
              onClick={sendTestCommand}
              type="button"
            >
              Send Test Command
            </button>
            <button
              className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-100/50 disabled:opacity-40"
              disabled={cleanupInFlight}
              onClick={cleanupExpiredSessions}
              type="button"
            >
              Cleanup Expired Sessions
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderPcRegistrationPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Register PC</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Add New PC</h3>
            <p className="mt-2 text-sm text-slate-400">Creates a stable pcId, zoneId, and auth token. IP changes will not break identity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              onChange={(event) => setNewPcName(event.target.value)}
              value={newPcName}
            />
            <select
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              onChange={(event) => setNewPcCategory(event.target.value as "standard" | "premium" | "vip")}
              value={newPcCategory}
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="vip">VIP</option>
            </select>
            <input
              className="w-28 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-200/50"
              min={1}
              onChange={(event) => setNewPcRate(Number(event.target.value))}
              type="number"
              value={newPcRate}
            />
            <button
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-100/60"
              onClick={registerPc}
              type="button"
            >
              Add New PC
            </button>
          </div>
        </div>
        {setupConfig ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">PC client setup config</p>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100" onClick={copySetupConfig} type="button">
                Copy
              </button>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-cyan-100" onClick={downloadSetupConfig} type="button">
                Download .env
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-cyan-100">{setupConfig}</pre>
            {setupCommand ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Windows setup command</p>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{setupCommand}</pre>
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Pairing instructions: install the PC client, paste this `.env` file into the client root, restart the client, then confirm the dashboard shows the PC as Online.
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  function renderPcManagementPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Fleet Management</p>
            <h3 className="mt-2 text-xl font-semibold text-white">PC Operations</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm text-white outline-none"
              onChange={(event) => setPopupMessage(event.target.value)}
              value={popupMessage}
            />
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          {ownerZone.pcs.length === 0 ? (
            <EmptyState title="No PCs added yet" description="Add your first gaming PC or approve a plug-and-play pairing request to begin operations." />
          ) : (
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-3 py-3">PC</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Rate</th>
                <th className="px-3 py-3">Heartbeat</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ownerZone.pcs.map((pc) => {
                const active = pc.sessionId || pc.status === "in_use";
                const recovering = pc.status === "offline" && active;
                const status = pc.maintenanceMode ? "maintenance" : recovering ? "recovering" : active ? "in use" : pc.status === "offline" ? "offline" : "online";
                return (
                  <tr className="text-slate-300" key={pc.id}>
                    <td className="px-3 py-3">
                      <input
                        className="w-32 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        onBlur={(event) => event.currentTarget.value !== pc.name && updatePc(pc.id, { name: event.currentTarget.value })}
                        defaultValue={pc.name}
                      />
                      <p className="mt-1 font-mono text-xs text-slate-600">{pc.id}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs capitalize text-cyan-100">{status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        onChange={(event) => updatePc(pc.id, { category: event.target.value })}
                        value={pc.category ?? "standard"}
                      >
                        <option value="standard">standard</option>
                        <option value="premium">premium</option>
                        <option value="vip">VIP</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        min={1}
                        onBlur={(event) => updatePc(pc.id, { ratePerHour: Number(event.currentTarget.value) })}
                        type="number"
                        defaultValue={pc.ratePerHour}
                      />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">{formatHeartbeat(pc.lastHeartbeat)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200" onClick={() => updatePc(pc.id, { maintenanceMode: !pc.maintenanceMode })} type="button">
                          {pc.maintenanceMode ? "Clear maintenance" : "Maintenance"}
                        </button>
                        <button className="rounded-xl border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100" onClick={() => updatePc(pc.id, { regenerateAuthToken: true })} type="button">
                          Regen token
                        </button>
                        <button className="rounded-xl border border-purple-300/20 px-3 py-2 text-xs text-purple-100" onClick={() => sendPopupToPc(pc.id)} type="button">
                          Popup
                        </button>
                        <button className="rounded-xl border border-red-300/20 px-3 py-2 text-xs text-red-100 disabled:opacity-40" disabled={Boolean(active)} onClick={() => removePc(pc.id)} type="button">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </section>
    );
  }

  function renderZoneAnalyticsPanel() {
    const onlineCount = ownerZone.pcs.filter((pc) => pc.status !== "offline").length;
    const offlineCount = ownerZone.pcs.length - onlineCount;

    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard detail="Gross session volume" icon={Coins} title="SPICA Earned" value={formatSpica(ownerGross)} />
          <StatCard detail="Estimated Ezzstar fee" icon={ShieldCheck} title="Commission" tone="purple" value={formatSpica(Math.round(ownerGross * 0.1))} />
          <StatCard detail="Completed + active sessions" icon={Timer} title="Hours Played" tone="green" value={ownerHours.toFixed(1)} />
          <StatCard detail="Current live play" icon={Activity} title="Active Sessions" value={String(ownerSessions.filter((session) => session.status === "Active").length)} />
          <StatCard detail="Online/offline fleet" icon={Monitor} title="PC Presence" tone="purple" value={`${onlineCount}/${ownerZone.pcs.length}`} />
          <StatCard detail="Ready for payout cycle" icon={Banknote} title="Projected Net" tone="green" value={formatSpica(Math.round(ownerGross * 0.9))} />
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Most Used PCs</p>
            <div className="mt-3 space-y-2">
              {mostUsedPcs.length ? mostUsedPcs.map((pc, index) => (
                <div className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm" key={`${pc.pcName}-${index}`}>
                  <span className="text-slate-300">{pc.pcName}</span>
                  <span className="text-cyan-100">{pc.sessions} sessions - {pc.hours.toFixed(1)}h</span>
                </div>
              )) : <p className="text-sm text-slate-500">No PC usage yet.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Top Players</p>
            <div className="mt-3 space-y-2">
              {ownerTopPlayers.length ? ownerTopPlayers.map((player, index) => (
                <div className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm" key={`${player.name}-${index}`}>
                  <span className="text-slate-300">{player.name}</span>
                  <span className="text-purple-100">{formatSpica(player.spend)}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No player activity yet.</p>}
            </div>
          </div>
          <p className="text-xs text-slate-600">Fleet split: {onlineCount} online, {offlineCount} offline. Today/week/month buckets are ready once production reporting windows are added.</p>
        </div>
      </section>
    );
  }

  function renderZoneSessionHistoryPanel() {
    const term = sessionSearch.toLowerCase();
    const filtered = ownerSessions.filter((session) =>
      (sessionStatusFilter === "all" || session.status === sessionStatusFilter) &&
      [session.playerName, session.pcName, session.zoneName, session.status].some((value) => value.toLowerCase().includes(term))
    );
    const active = filtered.filter((session) => session.status === "Active");
    const history = filtered.filter((session) => session.status !== "Active");

    return (
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Session History</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Searchable Operations Ledger</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="app-input py-2" onChange={(event) => setSessionStatusFilter(event.target.value as "all" | "Active" | "Completed")} value={sessionStatusFilter}>
              <option value="all">All sessions</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
            <input
              className="app-input py-2"
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder="Search player, PC, status..."
              value={sessionSearch}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard detail="Currently running" icon={Activity} title="Active" value={String(active.length)} />
          <StatCard detail="Completed records" icon={Timer} title="History" tone="green" value={String(history.length)} />
          <StatCard detail="Filtered gross SPICA" icon={Coins} title="Volume" tone="purple" value={formatSpica(filtered.reduce((sum, session) => sum + session.grossSpica, 0))} />
        </div>
        {active.length ? <div className="space-y-3"><h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Active Sessions</h3>{renderSessionCards(active)}</div> : null}
        <div className="space-y-3"><h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Session History</h3>{renderSessionCards(history)}</div>
      </section>
    );
  }

  function renderZoneOperatorStartPanel() {
    const realtimeReady = debug.dashboardSockets > 0 || debug.connectedSockets > 0;
    const canStartPreview = Boolean(selectedOperatorPlayer?.id && selectedOperatorPc && operatorPlayableMinutes > 0 && ownerZone.status === "Active");
    const startDisabledReason = ownerZone.status !== "Active"
      ? "Zone must be approved before sessions can start."
      : !selectedOperatorPlayer
        ? "Search and verify a player first."
        : !selectedOperatorPc
          ? "No available PC is ready for a new session."
          : operatorPlayableMinutes <= 0
            ? "Player balance is not enough for this PC rate."
            : !realtimeReady
              ? "Realtime is reconnecting. Session can be prepared, but PC command delivery may fail."
              : "";

    return (
      <section className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5 shadow-nebula">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Operator Session Start</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Verify player and assign PC</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Players do not request sessions from the phone app. Search their Ezzstar identity, select an available PC, then confirm the calculated playable time.</p>
          </div>
          <StatusBadge tone={ownerZone.status === "Active" ? "success" : "warning"}>{ownerZone.status}</StatusBadge>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Step 1</p>
                <h4 className="mt-1 text-sm font-semibold text-white">Verify player</h4>
              </div>
              <StatusBadge tone={selectedOperatorPlayer ? "success" : "neutral"}>{selectedOperatorPlayer ? "Verified" : "Waiting"}</StatusBadge>
            </div>
            <div className="flex gap-2">
              <input
                className="app-input min-w-0 flex-1"
                onChange={(event) => setZonePlayerSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    searchZonePlayers();
                  }
                }}
                placeholder="Search email, username, or player ID"
                value={zonePlayerSearch}
              />
              <AppButton disabled={zonePlayerSearchLoading} onClick={searchZonePlayers} type="button" variant="secondary">
                {zonePlayerSearchLoading ? "Searching..." : "Verify"}
              </AppButton>
            </div>

            <div className="space-y-2">
              {zonePlayerSearchLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="app-shimmer h-4 w-40 rounded bg-white/10" />
                  <div className="app-shimmer mt-3 h-3 w-56 rounded bg-white/10" />
                </div>
              ) : zonePlayerResults.length ? zonePlayerResults.map((player) => (
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedOperatorPlayer?.id === player.id ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-black/25 hover:border-cyan-200/25"}`}
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  type="button"
                >
                  {renderAvatarSlot(player)}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{player.name}</span>
                    <span className="block truncate text-xs text-slate-500">{player.email ?? player.username ?? player.id}</span>
                  </span>
                  <span className="text-xs font-semibold text-cyan-100">{formatSpica(player.balance)}</span>
                </button>
              )) : <EmptyState title={zonePlayerSearch ? "No matching player found" : "No player selected"} description={zonePlayerSearch ? "Check the email, username, or player ID and try again." : "Search a player by email, username, or ID to prepare a zone-side session."} />}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Step 2</p>
                  <h4 className="mt-1 text-sm font-semibold text-white">Choose available PC</h4>
                </div>
                <span className="text-xs text-slate-500">{availableOperatorPcs.length} ready</span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {availableOperatorPcs.length ? availableOperatorPcs.slice(0, 6).map((pc) => {
                  const selected = selectedOperatorPc?.id === pc.id;
                  return (
                    <button
                      className={`rounded-2xl border p-3 text-left transition ${selected ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/[0.035] hover:border-cyan-200/25 hover:bg-white/[0.055]"}`}
                      key={pc.id}
                      onClick={() => setSelectedOperatorPcId(pc.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-white">{pc.name}</span>
                        <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">Ready</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{pc.category ?? "standard"} - {formatSpica(pc.ratePerHour)}/h</p>
                    </button>
                  );
                }) : (
                  <EmptyState title="No available PCs" description="All registered PCs are offline, active, or in maintenance mode." />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-start gap-3">
                {selectedOperatorPlayer ? renderAvatarSlot(selectedOperatorPlayer, "h-14 w-14") : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-500">ID</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{selectedOperatorPlayer?.name ?? "Verify a player"}</p>
                  <p className="truncate text-sm text-slate-500">{selectedOperatorPlayer?.email ?? selectedOperatorPlayer?.username ?? "Search to verify player"}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Playable time</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-100">{operatorPlayableMinutes} min</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="mt-1 font-semibold text-white">{selectedOperatorPlayer ? formatSpica(selectedOperatorPlayer.balance) : "Verify first"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-slate-500">Rent / hour</p>
                  <p className="mt-1 font-semibold text-purple-100">{selectedOperatorPc ? formatSpica(selectedOperatorPc.ratePerHour) : "No PC"}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">PC: {selectedOperatorPc?.name ?? "Not selected"}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">Realtime: {realtimeReady ? "Connected" : "Reconnecting"}</span>
              </div>

              {startDisabledReason ? (
                <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs text-amber-100">{startDisabledReason}</p>
              ) : null}
              {testPanelMessage ? (
                <p className="mt-3 rounded-2xl border border-red-300/15 bg-red-300/[0.06] px-3 py-2 text-xs text-red-100">{testPanelMessage}</p>
              ) : null}
              <AppButton className="mt-4 w-full" disabled={!canStartPreview} onClick={() => selectedOperatorPc && setSelectedPc(selectedOperatorPc)} type="button">
                Confirm Start Session
              </AppButton>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderDevelopmentTestingPanel() {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return (
      <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Development Testing Helper</p>
        <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-4">
          <span>User: <strong className="font-mono text-white">{currentUser?.id ?? "loading"}</strong></span>
          <span>Role: <strong className="text-white">{role}</strong></span>
          <span>Zone: <strong className="font-mono text-white">{ownerZone.id || "none"}</strong></span>
          <span>Dashboard API: <strong className="text-white">{dashboardApiStatus}</strong></span>
          <span>Realtime: <strong className="text-white">{debug.dashboardSockets > 0 || debug.connectedSockets > 0 ? "connected" : "waiting"}</strong></span>
        </div>
      </section>
    );
  }

  async function searchZonePlayers() {
    if (zonePlayerSearch.trim().length < 2) {
      toast("warning", "Enter an email, username, or player ID.");
      return;
    }

    setZonePlayerSearchLoading(true);

    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(zonePlayerSearch.trim())}`, { credentials: "include" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast("error", payload.error ?? "Player search failed.");
        return;
      }

      const results: Player[] = (payload.players ?? []).map((player: any) => ({
        id: player.id,
        name: player.name,
        username: player.username,
        email: player.email,
        avatar: player.avatar,
        banner: player.banner,
        membership: player.membership,
        favoriteZones: player.favoriteZones,
        favoriteGames: player.favoriteGames,
        xp: player.xp,
        level: player.level,
        onlineStatus: player.onlineStatus,
        balance: player.spica_balance
      }));
      setZonePlayerResults(results);

      if (results[0]) {
        setSelectedPlayerId(results[0].id);
      }

      if (!results.length) {
        toast("info", "No player found for that search.");
      }
    } catch {
      toast("error", "Player search failed.");
    } finally {
      setZonePlayerSearchLoading(false);
    }
  }

  function renderZoneCustomersPanel() {
    const customers = [...ownerSessions.reduce<Map<string, { playerId: string; name: string; visits: number; spent: number; lastVisit: number }>>((map, session) => {
      const current = map.get(session.playerId) ?? { playerId: session.playerId, name: session.playerName, visits: 0, spent: 0, lastVisit: 0 };
      map.set(session.playerId, {
        ...current,
        visits: current.visits + 1,
        spent: current.spent + session.grossSpica,
        lastVisit: Math.max(current.lastVisit, session.endedAt ?? session.startTime)
      });
      return map;
    }, new Map()).values()]
      .filter((customer) => customer.name.toLowerCase().includes(customerSearch.toLowerCase()))
      .sort((a, b) => b.spent - a.spent);

    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Zone Customers</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Repeat player activity</h3>
          </div>
          <input className="app-input py-2" onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customers..." value={customerSearch} />
        </div>
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Visits</th>
                  <th className="px-4 py-3">SPICA spent</th>
                  <th className="px-4 py-3">Last visit</th>
                  <th className="px-4 py-3">Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {customers.map((customer) => (
                  <tr className="text-slate-300" key={customer.playerId}>
                    <td className="px-4 py-3 font-semibold text-white">{customer.name}</td>
                    <td className="px-4 py-3">{customer.visits}</td>
                    <td className="px-4 py-3 text-cyan-100">{formatSpica(customer.spent)}</td>
                    <td className="px-4 py-3">{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : "Not available"}</td>
                    <td className="px-4 py-3"><StatusBadge tone={customer.visits > 3 ? "success" : "neutral"}>{customer.visits > 3 ? "Repeat customer" : "New customer"}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="No customers yet" description="Players who start sessions in this zone will appear here with visits, spend, and last activity." />
          </div>
        )}
      </section>
    );
  }

  function renderStaffPanel() {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Staff Access</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Create Manager Account</h3>
            <p className="mt-2 text-sm text-slate-400">Managers can control PCs, sessions, analytics, and live operations. They cannot withdraw funds or delete the zone.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerName(event.target.value)} value={managerName} />
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerUsername(event.target.value)} value={managerUsername} />
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerEmail(event.target.value)} value={managerEmail} />
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setManagerPassword(event.target.value)} type="password" value={managerPassword} />
            <button className="rounded-xl border border-purple-300/25 bg-purple-300/10 px-3 py-2 text-sm font-semibold text-purple-100" onClick={createManager} type="button">
              Add Manager
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderSessionCards(items: Session[]) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        {items.length === 0 ? (
          <EmptyState title="No sessions yet" description="Sessions will appear here once players start using SPICA credits at this zone." />
        ) : (
          items.map((session, index) => (
            <article
              className={`player-card-in player-card-hover rounded-2xl border p-4 shadow-nebula sm:p-5 ${role === "player" && session.status === "Active" ? "border-cyan-300/20 bg-cyan-300/[0.055]" : "border-white/10 bg-white/[0.055]"}`}
              key={session.id}
              style={{ animationDelay: `${Math.min(index * 55, 220)}ms` }}
            >
              {(() => {
                const sessionPlayer = players.find((player) => player.id === session.playerId) ?? { id: session.playerId, name: session.playerName, balance: 0 };
                const remaining = remainingBySession[session.id] ?? 0;
                const progress = session.status === "Active" ? Math.max(0, Math.min(100, (remaining / (session.durationSeconds * 1000)) * 100)) : 0;
                const endingSoon = session.status === "Active" && remaining > 0 && remaining <= 5 * 60 * 1000;
                return (
                  <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {renderAvatarSlot(sessionPlayer)}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-500">{session.playerName}</p>
                    <h3 className="mt-1 truncate text-xl font-semibold text-white">
                      {session.zoneName} - {session.pcName}
                    </h3>
                  </div>
                </div>
                <StatusBadge pulse={session.status === "Active"} tone={endingSoon ? "warning" : session.status === "Active" ? "active" : "neutral"}>{endingSoon ? "Ending soon" : session.status}</StatusBadge>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    {session.status === "Active" ? <span className="player-status-dot h-2 w-2 rounded-full bg-cyan-300" /> : null}
                    Timer
                  </p>
                  <p className={`mt-1 font-mono text-lg font-bold ${session.status === "Active" ? "text-cyan-100" : "text-slate-100"}`}>
                    {session.status === "Active" && remaining <= 0 ? "Expired" : formatTime(remaining)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">Gross</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatSpica(session.grossSpica)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">Rate</p>
                  <p className="mt-1 text-lg font-semibold text-purple-100">{formatSpica(session.ratePerHour)}/h</p>
                </div>
              </div>
              {session.status === "Active" ? (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full transition-all duration-700 ${endingSoon ? "bg-amber-300" : "bg-cyan-300"}`} style={{ width: `${progress || 100}%` }} />
                </div>
              ) : null}
              {role === "zone" && session.status === "Active" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <AppButton onClick={() => addDashboardTime(session.id, 15)} type="button" variant="secondary">
                    Add 15 min
                  </AppButton>
                  <AppButton onClick={() => endDashboardSession(session.id)} type="button" variant="danger">
                    End session
                  </AppButton>
                  <AppButton onClick={() => sendPopupToPc(session.pcId)} type="button" variant="ghost">
                    Send message
                  </AppButton>
                </div>
              ) : null}
                  </>
                );
              })()}
            </article>
          ))
        )}
      </div>
    );
  }

  function renderZonePcControl(zone: Zone) {
    const recentCutoff = now - 30_000;
    const visiblePcs = zone.pcs.filter((pc) => showOfflinePcs || pc.status !== "offline" || (pc.lastHeartbeat && pc.lastHeartbeat >= recentCutoff));

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input checked={showOfflinePcs} onChange={(event) => setShowOfflinePcs(event.target.checked)} type="checkbox" />
            Show Offline PCs
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visiblePcs.map((pc) => {
          const sessionRemaining = pc.sessionId ? remainingBySession[pc.sessionId] ?? 0 : 0;
          const heartbeatRemaining = pc.heartbeatRemainingSeconds ? pc.heartbeatRemainingSeconds * 1000 : 0;
          const metadataRemaining =
            pc.activeSessionStartTime && pc.activeSessionDurationSeconds
              ? getRemainingTime(pc.activeSessionStartTime, pc.activeSessionDurationSeconds, serverNow)
              : 0;
          const remainingMs = Math.max(sessionRemaining, heartbeatRemaining, metadataRemaining);

          return (
          <PCCard
            key={pc.id}
            onAddTime={(sessionId, minutes) => addDashboardTime(sessionId, minutes)}
            onEnd={(sessionId) => endDashboardSession(sessionId)}
            onStart={(selected) => setSelectedPc(selected)}
            pc={pc}
            remainingMs={remainingMs}
          />
        );})}
        </div>
        {visiblePcs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-slate-400 shadow-nebula">
            No online or recent PCs. Turn on Show Offline PCs to see registered machines.
          </div>
        ) : null}
      </div>
    );
  }

  function renderTournamentCards(items: PlatformTournament[], emptyTitle: string, emptyDescription: string) {
    if (contentLoading) {
      return <LoadingState label="Loading ecosystem content..." />;
    }

    if (contentError) {
      return <EmptyState title="Content could not load" description={contentError} />;
    }

    return items.length ? (
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article className="rounded-2xl border border-white/10 bg-black/25 p-4" key={item.id}>
            {item.imageUrl ? <img alt="" className="mb-3 h-28 w-full rounded-xl object-cover" src={item.imageUrl} /> : null}
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={item.status === "published" ? "success" : item.status === "archived" ? "neutral" : "warning"}>{item.status}</StatusBadge>
              <StatusBadge tone="active">{item.audience}</StatusBadge>
            </div>
            <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            {item.prize ? <p className="mt-3 text-xs font-semibold text-cyan-100">{item.prize}</p> : null}
            <p className="mt-3 text-xs text-slate-500">{item.startDate ? new Date(item.startDate).toLocaleString() : "Date to be announced"}</p>
          </article>
        ))}
      </div>
    ) : <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  function renderAnnouncementCards(items: PlatformAnnouncement[], emptyTitle: string, emptyDescription: string) {
    if (contentLoading) {
      return <LoadingState label="Loading updates..." />;
    }

    if (contentError) {
      return <EmptyState title="Updates could not load" description={contentError} />;
    }

    return items.length ? (
      <div className="space-y-3">
        {items.map((item) => (
          <article className="rounded-2xl border border-white/10 bg-black/25 p-4" key={item.id}>
            {item.imageUrl ? <img alt="" className="mb-3 h-28 w-full rounded-xl object-cover" src={item.imageUrl} /> : null}
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={item.status === "published" ? "success" : item.status === "archived" ? "neutral" : "warning"}>{item.status}</StatusBadge>
              <StatusBadge tone="active">{item.category}</StatusBadge>
              <StatusBadge tone="neutral">{item.audience}</StatusBadge>
            </div>
            <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
            {item.linkUrl ? <a className="mt-3 inline-flex text-xs font-semibold text-cyan-100 hover:text-white" href={item.linkUrl} rel="noreferrer" target="_blank">Open link</a> : null}
            <p className="mt-3 text-xs text-slate-500">{item.publishDate ? new Date(item.publishDate).toLocaleString() : "Not scheduled"}</p>
          </article>
        ))}
      </div>
    ) : <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  function renderPlayerDashboard() {
    function renderPlayerEcosystemPanel() {
      return (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="player-card-in player-card-hover overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-nebula">
            <div className="h-20 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(168,85,247,0.12),rgba(2,6,23,0.9))] sm:h-24" />
            <div className="p-4 sm:p-5">
              <div className="-mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex min-w-0 items-end gap-3 sm:gap-4">
                  {renderAvatarSlot(selectedPlayer, "h-16 w-16 sm:h-20 sm:w-20")}
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{selectedPlayer.membership ?? "Starter"}</p>
                    <h3 className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">{selectedPlayer.name}</h3>
                    <p className="truncate text-sm text-slate-400">@{selectedPlayer.username ?? "player"} - {selectedPlayer.onlineStatus ?? "online"}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-slate-500">Level {playerLevel}</p>
                  <div className="mt-2 h-2 w-full min-w-36 overflow-hidden rounded-full bg-white/10 sm:w-40">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, (playerXp / nextLevelXp) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-cyan-100">{playerXp} / {nextLevelXp} XP</p>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-400">{selectedPlayer.bio ?? "Global SPICA player identity active across connected gaming zones."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedPlayer.favoriteGames?.length ? selectedPlayer.favoriteGames.map((game) => (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300" key={game}>{game}</span>
                )) : <span className="text-xs text-slate-500">No favorite games added yet.</span>}
              </div>
            </div>
          </article>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="player-card-in" style={{ animationDelay: "60ms" }}><StatCard detail="Persistent across all zones" icon={WalletCards} title="SPICA Balance" value={formatSpica(selectedPlayer.balance)} /></div>
            <div className="player-card-in" style={{ animationDelay: "100ms" }}><StatCard detail="Completed + active sessions" icon={Timer} title="Hours Played" tone="green" value={playerHours.toFixed(1)} /></div>
            <div className="player-card-in" style={{ animationDelay: "140ms" }}><StatCard detail="All-time session spend" icon={Coins} title="SPICA Spent" tone="purple" value={formatSpica(playerSpent)} /></div>
            <div className="player-card-in" style={{ animationDelay: "180ms" }}><StatCard detail="Unlocked badges" icon={Trophy} title="Achievements" tone="green" value={`${playerAchievements.filter((item) => item.unlocked).length}/${playerAchievements.length}`} /></div>
          </div>
        </section>
      );
    }

    function renderAchievementsPanel() {
      return (
        <section className="grid gap-3 md:grid-cols-3">
          {playerAchievements.map((achievement) => (
            <article className={`player-card-in player-card-hover rounded-2xl border p-4 shadow-nebula ${achievement.unlocked ? "border-cyan-300/20 bg-cyan-300/[0.07]" : "border-white/10 bg-white/[0.035]"}`} key={achievement.name}>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{achievement.unlocked ? "Unlocked" : "Locked"}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{achievement.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{achievement.detail}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${achievement.unlocked ? "bg-cyan-300" : "bg-slate-700"}`} style={{ width: achievement.unlocked ? "100%" : "28%" }} />
              </div>
            </article>
          ))}
        </section>
      );
    }

    function renderSocialPanel() {
      const onlineFriends = players.filter((player) => player.id !== selectedPlayer.id).slice(0, 4);
      return (
        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Online Friends</p>
            <div className="mt-4 space-y-3">
              {onlineFriends.length ? onlineFriends.map((friend) => (
                <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-3" key={friend.id}>
                  <div>
                    <p className="font-semibold text-white">{friend.name}</p>
                    <p className="text-xs text-slate-500">@{friend.username ?? "player"} - {friend.onlineStatus ?? "online"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">Online</span>
                </div>
              )) : <p className="text-sm text-slate-500">Friend system is ready. Add friends from the API or future search UI.</p>}
            </div>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Ecosystem Feed</p>
            <div className="mt-4 space-y-3">
              {activity.slice(0, 6).map((item) => (
                <div className="rounded-xl bg-black/25 px-3 py-3" key={item.id}>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      );
    }

    function renderPlayerWalletPage() {
      const playerTransactions = transactions
        .filter((transaction) => transaction.actorId === selectedPlayer.id || transaction.actorName === selectedPlayer.name)
        .filter((transaction) => [transaction.type, transaction.actorName, String(transaction.amount)].some((value) => value.toLowerCase().includes(transactionSearch.toLowerCase())));
      const spendingByZone = playerSessions.reduce<Map<string, number>>((map, session) => {
        map.set(session.zoneName, (map.get(session.zoneName) ?? 0) + session.grossSpica);
        return map;
      }, new Map());

      return (
        <div className="space-y-5">
          <WalletCard onBuySpica={handleBuySpica} onPlayerChange={setSelectedPlayerId} onRequestWithdrawal={handleRequestWithdrawal} players={players} selectedPlayerId={selectedPlayerId} />
          <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
              <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-4 py-4 md:flex-row md:items-center md:px-5">
                <h3 className="font-semibold text-white">Transaction logs</h3>
                <input className="app-input py-2" onChange={(event) => setTransactionSearch(event.target.value)} placeholder="Search transactions..." value={transactionSearch} />
              </div>
              {playerTransactions.length ? (
                <div className="divide-y divide-white/10">
                  {playerTransactions.map((transaction) => (
                    <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-5" key={transaction.id}>
                      <div className="min-w-0">
                        <p className="font-semibold text-white capitalize">{transaction.type.replace("_", " ")}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-cyan-100 sm:text-base">{formatSpica(transaction.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="p-5"><EmptyState title="No transactions yet" description="Top-ups and spending records will appear here." /></div>}
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
              <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Spending by Zone</p>
              <div className="mt-4 space-y-3">
                {[...spendingByZone.entries()].length ? [...spendingByZone.entries()].map(([zoneName, amount]) => (
                  <div className="rounded-xl bg-black/25 px-3 py-3" key={zoneName}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{zoneName}</span>
                      <span className="text-purple-100">{formatSpica(amount)}</span>
                    </div>
                  </div>
                )) : <EmptyState title="No spending yet" description="Session charges will be grouped by gaming zone." />}
              </div>
            </section>
          </div>
        </div>
      );
    }

    function renderPlayerActivityPage() {
      const filteredSessions = playerSessions.filter((session) =>
        [session.zoneName, session.pcName, session.status].some((value) => value.toLowerCase().includes(playerActivitySearch.toLowerCase()))
      );
      const zonesVisited = new Set(playerSessions.map((session) => session.zoneId)).size;

      return (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard detail="Unique gaming zones" icon={Landmark} title="Zones Visited" value={String(zonesVisited)} />
            <StatCard detail="Total play time" icon={Timer} title="Hours Played" tone="green" value={playerHours.toFixed(1)} />
            <StatCard detail="All-time credits used" icon={Coins} title="SPICA Spent" tone="purple" value={formatSpica(playerSpent)} />
          </div>
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <h3 className="font-semibold text-white">Session activity</h3>
              <input className="app-input py-2" onChange={(event) => setPlayerActivitySearch(event.target.value)} placeholder="Search activity..." value={playerActivitySearch} />
            </div>
            {renderSessionCards(filteredSessions)}
          </section>
          {renderAchievementsPanel()}
        </div>
      );
    }

    function renderPlayerZonesPage() {
      const visible = playerVisibleZones.filter((zone) => [zone.name, zone.city].some((value) => value.toLowerCase().includes(playerZoneSearch.toLowerCase())));
      return (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Approved Zones</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Play anywhere with one SPICA account</h3>
            </div>
            <input className="app-input py-2" onChange={(event) => setPlayerZoneSearch(event.target.value)} placeholder="Search zones..." value={playerZoneSearch} />
          </div>
          {visible.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((zone) => {
                const minRate = Math.min(...zone.pcs.map((pc) => pc.ratePerHour || 100), 100);
                const available = zone.pcs.filter((pc) => pc.status === "available").length;
                return (
                  <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula" key={zone.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{zone.city}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{zone.name}</h3>
                      </div>
                      <StatusBadge tone={zone.status === "Active" ? "success" : "warning"}>{zone.status}</StatusBadge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-black/25 p-3">
                        <p className="text-xs text-slate-500">Availability</p>
                        <p className="mt-1 font-semibold text-cyan-100">{available} seats</p>
                      </div>
                      <div className="rounded-xl bg-black/25 p-3">
                        <p className="text-xs text-slate-500">From</p>
                        <p className="mt-1 font-semibold text-purple-100">{formatSpica(minRate)}/h</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">{zoneAnnouncements[0]?.title ?? "No recent zone updates"}</p>
                    <AppButton className="mt-4 w-full" onClick={() => toast("success", `${zone.name} added to favorites.`)} type="button" variant="ghost">
                      Favorite / Follow
                    </AppButton>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState title="No approved zones found" description="Approved gaming zones will appear here once they are available in your region." />}
        </div>
      );
    }

    function renderPlayerUpdatesPage() {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Ezzstar Updates</p>
            <div className="mt-4">{renderAnnouncementCards(platformAnnouncements, "No platform updates", "Ezzstar announcements will appear here when published.")}</div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Followed Zone Updates</p>
            <div className="mt-4 space-y-3">
              {zoneAnnouncements.length ? zoneAnnouncements.map((item) => (
                <article className="rounded-2xl border border-white/10 bg-black/25 p-4" key={item.id}>
                  <StatusBadge tone={item.type === "maintenance" ? "warning" : item.type === "offer" ? "success" : "active"}>{item.type}</StatusBadge>
                  <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.message}</p>
                  {item.mediaUrl ? <a className="mt-3 inline-flex text-xs font-semibold text-cyan-100 hover:text-white" href={item.mediaUrl} rel="noreferrer" target="_blank">View attached media</a> : null}
                </article>
              )) : <EmptyState title="No followed zone updates" description="Favorite zones to receive offers, events, and maintenance notices here." />}
            </div>
          </section>
        </div>
      );
    }

    function renderPlayerTournamentsPage() {
      return (
        <section className="player-card-in rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Competitive Layer</p>
          <h3 className="mt-3 text-xl font-semibold text-white">Tournaments</h3>
          <div className="mt-4">
            {renderTournamentCards(platformTournaments, "No tournaments available", "Published player tournaments and waitlists will appear here.")}
          </div>
        </section>
      );
    }

    function renderPlayerProfilePage() {
      return (
        <div className="space-y-5">
          {renderPlayerEcosystemPanel()}
          <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Profile Basics</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-cyan-200/30">
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  {profileDraft.avatar ? <img alt="" className="h-full w-full object-cover" src={profileDraft.avatar} /> : <ImageIcon className="h-5 w-5" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">Avatar</span>
                  <span className="mt-1 block text-xs text-slate-500">{uploadingMedia === "player-avatar" ? "Uploading..." : "Upload JPG, PNG, WebP, or GIF"}</span>
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingMedia === "player-avatar"}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const result = await uploadMedia(file, "player-avatar");
                    if (result?.publicUrl) setProfileDraft((current) => ({ ...current, avatar: result.publicUrl }));
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-purple-200/30">
                <span className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-2xl border border-purple-300/20 bg-purple-300/10 text-purple-100">
                  {profileDraft.banner ? <img alt="" className="h-full w-full object-cover" src={profileDraft.banner} /> : <UploadCloud className="h-5 w-5" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">Profile banner</span>
                  <span className="mt-1 block text-xs text-slate-500">{uploadingMedia === "player-banner" ? "Uploading..." : "Upload a wide profile image"}</span>
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingMedia === "player-banner"}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const result = await uploadMedia(file, "player-banner");
                    if (result?.publicUrl) setProfileDraft((current) => ({ ...current, banner: result.publicUrl }));
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="app-input" onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value }))} placeholder="Username" value={profileDraft.username} />
              <input className="app-input" onChange={(event) => setProfileDraft((current) => ({ ...current, favoriteGames: event.target.value }))} placeholder="Favorite games" value={profileDraft.favoriteGames} />
              <textarea className="app-input min-h-24 resize-none md:col-span-2" onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} placeholder="Bio" value={profileDraft.bio} />
            </div>
            <AppButton className="mt-4" onClick={saveProfileDraft} type="button">Save profile</AppButton>
          </section>
          {renderAchievementsPanel()}
        </div>
      );
    }

    const activeSessionPanel = (
        <div className="space-y-5">
          {playerActiveSession ? renderSessionCards([playerActiveSession]) : (
            <EmptyState
              title="No active session"
              description="Your live zone session will appear here after a zone operator verifies your account and starts play on an available PC."
            />
          )}
        </div>
    );

    const homePanel = (
        <div className="space-y-5">
          {renderPlayerEcosystemPanel()}
          <WalletCard onBuySpica={handleBuySpica} onPlayerChange={setSelectedPlayerId} onRequestWithdrawal={handleRequestWithdrawal} players={players} selectedPlayerId={selectedPlayerId} />
          <section className="player-card-in space-y-3" style={{ animationDelay: "120ms" }}>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
              <span className={playerActiveSession ? "player-status-dot h-2 w-2 rounded-full bg-cyan-300" : "h-2 w-2 rounded-full bg-slate-700"} />
              Live Session
            </p>
            {playerActiveSession ? renderSessionCards([playerActiveSession]) : (
              <EmptyState title="No active session" description="When a zone operator starts your verified session, live zone, PC, timer, and SPICA spend will appear here." />
            )}
          </section>
          <section className="player-card-in space-y-3" style={{ animationDelay: "180ms" }}>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent History</p>
            {playerCompletedSessions.length ? renderSessionCards(playerCompletedSessions.slice(0, 4)) : <EmptyState title="No session history yet" description="Completed gaming sessions will appear here after you play at a connected zone." />}
          </section>
        </div>
    );

    return (
      <PlayerDashboard
        activeView={activeView}
        home={homePanel}
        profile={renderPlayerProfilePage()}
        sessions={activeView === "Active Session" ? activeSessionPanel : renderPlayerActivityPage()}
        tournaments={renderPlayerTournamentsPage()}
        updates={renderPlayerUpdatesPage()}
        wallet={renderPlayerWalletPage()}
        zones={renderPlayerZonesPage()}
      />
    );
  }

  function renderZoneDashboard() {
    if (!zones.length) {
      return (
        <ZoneOSWorkspace
          activeView={activeView}
          customers={null}
          emptyState={(
            <EmptyState
              title="Your zone is pending approval"
              description="Once Ezzstar approves or creates your zone, PC operations, sessions, customers, and earnings will appear here."
            />
          )}
          home={null}
          pcs={null}
          sessions={null}
          settlements={null}
          updates={null}
        />
      );
    }

    const dailyBreakdown = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - index);
      const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000;
      const daySessions = ownerSessions.filter((session) => session.startTime >= dayStart.getTime() && session.startTime < dayEnd);
      const gross = daySessions.reduce((sum, session) => sum + session.grossSpica, 0);
      return {
        label: dayStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        sessions: daySessions.length,
        gross,
        commission: Math.round(gross * 0.1),
        net: Math.round(gross * 0.9)
      };
    });

    const pcsPanel = (
      <div className="space-y-5">
        {renderZoneOperatorStartPanel()}
        <PairingRequestsPanel />
        {renderPcRegistrationPanel()}
        {renderPcManagementPanel()}
        {renderZonePcControl(ownerZone)}
      </div>
    );

    const settlementsPanel = (
      <div className="space-y-5">
        {renderZoneAnalyticsPanel()}
        <div className="grid gap-5 md:grid-cols-3">
          <StatCard detail="Gross SPICA in this zone" icon={Coins} title="Zone Earnings" value={formatSpica(ownerGross)} />
          <StatCard detail="After 10% Ezzstar fee" icon={Banknote} title="Net Settlement" tone="green" value={formatSpica(Math.round(ownerGross * 0.9))} />
          <StatCard detail="PKR equivalent at mock rate" icon={Landmark} title="PKR Payout" tone="purple" value={formatPkr(spicaToPkr(Math.round(ownerGross * 0.9)))} />
        </div>
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Daily Breakdown</p>
          <div className="mt-4 grid gap-3 md:grid-cols-7">
            {[...dailyBreakdown].reverse().map((day) => (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3" key={day.label}>
                <p className="text-xs text-slate-500">{day.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatSpica(day.gross)}</p>
                <p className="mt-1 text-xs text-slate-500">{day.sessions} sessions</p>
              </div>
            ))}
          </div>
        </section>
        <SettlementTable settlements={ownerSettlements} />
      </div>
    );

    const updatesPanel = (
      <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Zone Updates</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{editingAnnouncementId ? "Edit announcement" : "Create announcement"}</h3>
          <div className="mt-5 space-y-3">
            <input className="app-input w-full" onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Title" value={announcementTitle} />
            <textarea className="app-input min-h-28 w-full resize-none" onChange={(event) => setAnnouncementMessage(event.target.value)} placeholder="Message for players" value={announcementMessage} />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-cyan-200/30">
              <span>
                <span className="block text-sm font-semibold text-white">Announcement media</span>
                <span className="mt-1 block text-xs text-slate-500">{uploadingMedia === "announcement-media" ? "Uploading..." : announcementMediaUrl ? "Media attached" : "Attach image or PDF"}</span>
              </span>
              <UploadCloud className="h-4 w-4 text-cyan-100" />
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="sr-only"
                disabled={uploadingMedia === "announcement-media"}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const result = await uploadMedia(file, "announcement-media", { zoneId: ownerZone.id });
                  if (result?.publicUrl) setAnnouncementMediaUrl(result.publicUrl);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="app-input" onChange={(event) => setAnnouncementType(event.target.value as ZoneAnnouncement["type"])} value={announcementType}>
                <option value="general">General</option>
                <option value="event">Event</option>
                <option value="maintenance">Maintenance</option>
                <option value="offer">Offer</option>
              </select>
              <select className="app-input" onChange={(event) => setAnnouncementVisibility(event.target.value as ZoneAnnouncement["visibility"])} value={announcementVisibility}>
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="customers">Customers</option>
              </select>
            </div>
            <div className="flex gap-2">
              <AppButton onClick={saveZoneAnnouncement} type="button">{editingAnnouncementId ? "Save changes" : "Publish update"}</AppButton>
              {editingAnnouncementId ? <AppButton onClick={() => { setEditingAnnouncementId(null); setAnnouncementTitle(""); setAnnouncementMessage(""); setAnnouncementMediaUrl(""); }} type="button" variant="ghost">Cancel</AppButton> : null}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Published Updates</p>
          <div className="mt-4 space-y-3">
            {zoneAnnouncements.length ? zoneAnnouncements.map((announcement) => (
              <article className="rounded-2xl border border-white/10 bg-black/25 p-4" key={announcement.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={announcement.type === "maintenance" ? "warning" : announcement.type === "offer" ? "success" : "active"}>{announcement.type}</StatusBadge>
                      <StatusBadge tone="neutral">{announcement.visibility}</StatusBadge>
                    </div>
                    <h4 className="mt-3 font-semibold text-white">{announcement.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{announcement.message}</p>
                    {announcement.mediaUrl ? <a className="mt-3 inline-flex text-xs font-semibold text-cyan-100 hover:text-white" href={announcement.mediaUrl} rel="noreferrer" target="_blank">View media</a> : null}
                    <p className="mt-3 text-xs text-slate-600">{new Date(announcement.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <AppButton onClick={() => editZoneAnnouncement(announcement)} type="button" variant="ghost">Edit</AppButton>
                    <AppButton onClick={() => deleteZoneAnnouncement(announcement.id)} type="button" variant="danger">Delete</AppButton>
                  </div>
                </div>
              </article>
            )) : <EmptyState title="No announcements yet" description="Create offers, maintenance notices, and event updates for your players." />}
          </div>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Ezzstar Zone Updates</p>
          <div className="mt-4">{renderAnnouncementCards(platformAnnouncements, "No platform updates", "Published Ezzstar updates for zones will appear here.")}</div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Zone Tournaments</p>
          <div className="mt-4">{renderTournamentCards(platformTournaments, "No zone tournaments", "Published zone-facing tournaments will appear here.")}</div>
        </section>
      </div>
      </section>
    );

    const payoutsPanel = (
      <div className="space-y-5">
        {renderStaffPanel()}
        <WalletCard onBuySpica={handleBuySpica} onPlayerChange={setSelectedPlayerId} onRequestWithdrawal={handleRequestWithdrawal} players={players} selectedPlayerId={selectedPlayerId} showWithdrawal />
        <WithdrawalTable withdrawals={withdrawals.filter((withdrawal) => withdrawal.type === "Owner")} />
      </div>
    );

    const homePanel = (
      <div className="space-y-6">
        {renderZoneOperatorStartPanel()}
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard detail="Owner console zone" icon={Landmark} title="Zone" value={ownerZone.name} />
          <StatCard detail="PCs currently in use" icon={Monitor} title="Active PCs" tone="purple" value={String(ownerZone.pcs.filter((pc) => pc.sessionId || pc.status === "in_use").length)} />
          <StatCard detail="Gross zone revenue" icon={Coins} title="Earnings" tone="green" value={formatSpica(ownerGross)} />
          <StatCard detail="Pending owner withdrawal requests" icon={WalletCards} title="Payout Requests" tone="red" value={String(withdrawals.filter((item) => item.type === "Owner" && item.status === "Pending").length)} />
        </div>
        {renderZoneAnalyticsPanel()}
        {renderZoneSessionHistoryPanel()}
        <SettlementTable settlements={ownerSettlements} />
      </div>
    );

    return (
      <ZoneOSWorkspace
        activeView={activeView}
        customers={renderZoneCustomersPanel()}
        home={homePanel}
        payouts={payoutsPanel}
        pcs={pcsPanel}
        sessions={renderZoneSessionHistoryPanel()}
        settlements={settlementsPanel}
        updates={updatesPanel}
      />
    );
  }

  function renderApprovalTable() {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula backdrop-blur-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Withdrawal Approvals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Request</th>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Net</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {withdrawals.map((withdrawal) => (
                <tr className="text-slate-300" key={withdrawal.id}>
                  <td className="px-5 py-4 font-mono text-cyan-100">{withdrawal.id}</td>
                  <td className="px-5 py-4">{withdrawal.userName}</td>
                  <td className="px-5 py-4">{withdrawal.type}</td>
                  <td className="px-5 py-4">{formatSpica(withdrawal.amount)}</td>
                  <td className="px-5 py-4 text-emerald-100">{formatSpica(withdrawal.netAmount)}</td>
                  <td className="px-5 py-4">{withdrawal.status}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100 disabled:opacity-40" disabled={withdrawal.status !== "Pending"} onClick={() => approveWithdrawal(withdrawal.id)} type="button">
                        Approve
                      </button>
                      <button className="rounded-full border border-red-300/25 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-100 disabled:opacity-40" disabled={withdrawal.status !== "Pending"} onClick={() => rejectWithdrawal(withdrawal.id)} type="button">
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderSettlementApprovals() {
    return (
      <div className="space-y-5">
        <SettlementTable settlements={settlements} />
        <div className="grid gap-3 md:grid-cols-3">
          {pendingSettlements.map((settlement) => (
            <button className="rounded-2xl border border-purple-300/20 bg-purple-300/10 p-4 text-left text-sm text-purple-50 transition hover:border-purple-100/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.18)]" key={settlement.id} onClick={() => approveSettlement(settlement.id)} type="button">
              <span className="block font-semibold">{settlement.transactionId}</span>
              <span className="mt-1 block text-slate-400">{settlement.zone} - {formatSpica(settlement.zoneNetAmount)}</span>
              <span className="mt-3 block text-xs uppercase tracking-[0.18em] text-cyan-200">Approve settlement</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderAdminDashboard() {
    const filteredZones = zones.filter((zone) =>
      [zone.name, zone.city, zone.status].some((value) => value.toLowerCase().includes(adminSearch.toLowerCase()))
    );
    const totalZoneNet = settlements.reduce((sum, settlement) => sum + settlement.zoneNetAmount, 0);
    const platformPcCapacity = zones.reduce((sum, zone) => sum + zone.pcs.length, 0);
    const staleSessionCount = activeSessions.filter((session) => getRemainingTime(session.startTime, session.durationSeconds, serverNow) === 0).length;
    const offlineWithSessionCount = activeSessions.filter((session) => zones.some((zone) => zone.pcs.some((pc) => pc.id === session.pcId && pc.status === "offline"))).length;
    const adminNotifications = [
      ...zones.filter((zone) => zone.status === "Pending").map((zone) => ({ id: `zone-pending-${zone.id}`, title: "New zone pending", detail: `${zone.name} awaits review.` })),
      ...settlements.filter((settlement) => settlement.status === "Pending" || settlement.status === "Ready").map((settlement) => ({ id: `settlement-${settlement.id}`, title: "Settlement pending", detail: `${settlement.zone} has ${formatSpica(settlement.zoneNetAmount)} net pending.` })),
      ...(offlineWithSessionCount ? [{ id: "offline-active-session-warning", title: "Operational warning", detail: `${offlineWithSessionCount} session${offlineWithSessionCount === 1 ? "" : "s"} need zone follow-up.` }] : []),
      ...(staleSessionCount ? [{ id: "stale-session-cleanup-warning", title: "Session cleanup needed", detail: `${staleSessionCount} expired session${staleSessionCount === 1 ? "" : "s"} awaiting cleanup.` }] : [])
    ].slice(0, 8);

    function renderPendingZoneApprovals() {
      const pendingZones = zones.filter((zone) => zone.status === "Pending");

      return (
        <section className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5 shadow-nebula">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Zone Approval Queue</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{pendingZones.length} pending zone{pendingZones.length === 1 ? "" : "s"}</h3>
            </div>
            <StatusBadge tone={pendingZones.length ? "warning" : "success"}>{pendingZones.length ? "Review needed" : "Clear"}</StatusBadge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {pendingZones.length ? pendingZones.map((zone) => (
              <article className="rounded-2xl border border-white/10 bg-black/25 p-4" key={zone.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-white">{zone.name}</h4>
                    <p className="mt-1 text-sm text-slate-500">{zone.city} - {zone.pricing?.pcCount ?? zone.pcs.length} PCs requested</p>
                    <p className="mt-1 text-xs text-slate-500">{zone.owner?.name ?? "Owner"} - {zone.owner?.email ?? "No owner email"}</p>
                    <p className="mt-1 text-xs text-slate-500">{zone.pricing?.rentPerHour ?? 100} SPICA/hour - {zone.pricing?.currentPricingModel ?? "Pricing submitted"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-600">{zone.id}</p>
                  </div>
                  <StatusBadge tone="warning">Pending</StatusBadge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AppButton onClick={() => patchZoneStatus(zone.id, "active")} type="button" variant="secondary">Approve</AppButton>
                  <AppButton onClick={() => patchZoneStatus(zone.id, "rejected")} type="button" variant="danger">Reject</AppButton>
                </div>
              </article>
            )) : <EmptyState title="No pending zones" description="New zone owner signups and listing approvals will appear here." />}
          </div>
        </section>
      );
    }

    function renderAdminZoneTable() {
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center">
            <h3 className="text-lg font-semibold text-white">Zone Management</h3>
            <input className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white" onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search zones..." value={adminSearch} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3">SPICA</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredZones.length ? filteredZones.map((zone) => {
                  const zoneSettlements = settlements.filter((settlement) => settlement.zoneId === zone.id);
                  const gross = zoneSettlements.reduce((sum, item) => sum + item.grossSpica, 0);
                  const fee = zoneSettlements.reduce((sum, item) => sum + item.ezzstarFee, 0);
                  const live = activeSessions.filter((session) => session.zoneId === zone.id).length;
                  return (
                    <tr className="text-slate-300" key={zone.id}>
                      <td className="px-4 py-3"><p className="font-semibold text-white">{zone.name}</p><p className="text-xs text-slate-500">{zone.city}</p></td>
                      <td className="px-4 py-3 text-slate-400"><p>{zone.owner?.name ?? "Owner"}</p><p className="text-xs text-slate-500">{zone.owner?.email ?? ""}</p></td>
                      <td className="px-4 py-3">{zone.status}</td>
                      <td className="px-4 py-3">{zone.pcs.length} seats</td>
                      <td className="px-4 py-3">{live}</td>
                      <td className="px-4 py-3 text-cyan-100">{formatSpica(gross)}</td>
                      <td className="px-4 py-3 text-purple-100">{formatSpica(fee)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-lg border border-emerald-300/20 px-2 py-1 text-xs text-emerald-100" onClick={() => patchZoneStatus(zone.id, "active")} type="button">Approve</button>
                          <button className="rounded-lg border border-amber-300/20 px-2 py-1 text-xs text-amber-100" onClick={() => patchZoneStatus(zone.id, "suspended")} type="button">Suspend</button>
                          <button className="rounded-lg border border-red-300/20 px-2 py-1 text-xs text-red-100" onClick={() => patchZoneStatus(zone.id, "rejected")} type="button">Reject</button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="px-4 py-6" colSpan={8}>
                      <EmptyState title="No zones found" description="Real zone owner applications and approved zones will appear here." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    function renderAdminSettlementControl() {
      return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-lg font-semibold text-white">Settlement Control</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Settlement</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {settlements.map((settlement) => (
                  <tr className="text-slate-300" key={settlement.id}>
                    <td className="px-4 py-3 font-mono text-cyan-100">{settlement.transactionId}</td>
                    <td className="px-4 py-3">{settlement.zone}</td>
                    <td className="px-4 py-3">{formatSpica(settlement.grossSpica)}</td>
                    <td className="px-4 py-3 text-purple-100">{formatSpica(settlement.ezzstarFee)}</td>
                    <td className="px-4 py-3 text-emerald-100">{formatSpica(settlement.zoneNetAmount)}</td>
                    <td className="px-4 py-3">{settlement.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-cyan-300/20 px-2 py-1 text-xs text-cyan-100" onClick={() => patchSettlementStatus(settlement.id, "approved", "PKR")} type="button">Approve</button>
                        <button className="rounded-lg border border-emerald-300/20 px-2 py-1 text-xs text-emerald-100" onClick={() => patchSettlementStatus(settlement.id, "paid", "hybrid")} type="button">Paid</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    function renderEcosystemSessionSummary() {
      return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Ecosystem Sessions</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard detail="Across approved zones" icon={Activity} title="Active Sessions" tone="purple" value={String(activeSessions.length)} />
            <StatCard detail="Operational seats registered" icon={Landmark} title="Network Capacity" value={String(platformPcCapacity)} />
            <StatCard detail="Completed and active spend" icon={WalletCards} title="SPICA Volume" tone="green" value={formatSpica(totalSpent)} />
          </div>
        </section>
      );
    }

    function renderSafetyPanel() {
      const longSessions = activeSessions.filter((session) => session.durationSeconds >= 6 * 3600);
      const issues = [
        ...(offlineWithSessionCount ? [{ title: "Offline active sessions", detail: `${offlineWithSessionCount} zone-level operational issue${offlineWithSessionCount === 1 ? "" : "s"} detected.` }] : []),
        ...(longSessions.length ? [{ title: "Unusually long sessions", detail: `${longSessions.length} active session${longSessions.length === 1 ? "" : "s"} exceeded the review threshold.` }] : []),
        ...(staleSessionCount ? [{ title: "Expired session cleanup", detail: `${staleSessionCount} session${staleSessionCount === 1 ? "" : "s"} should be reconciled.` }] : [])
      ];
      return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
          <p className="text-xs uppercase tracking-[0.18em] text-red-200">Fraud / Safety</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {issues.length ? issues.slice(0, 8).map((issue, index) => (
              <div className="rounded-xl border border-red-300/15 bg-red-400/10 p-3" key={`${issue.title}-${issue.detail}-${index}`}>
                <p className="font-semibold text-red-100">{issue.title}</p>
                <p className="mt-1 text-xs text-slate-400">{issue.detail}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No active safety flags.</p>}
          </div>
        </section>
      );
    }

    const filteredPlayers = players.filter((player) =>
      [player.name, player.email ?? "", player.username ?? ""].some((value) => value.toLowerCase().includes(adminSearch.toLowerCase()))
    );

    const playersPanel = (
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] shadow-nebula">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Players</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Global player accounts</h3>
          </div>
          <input className="app-input py-2" onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search players..." value={adminSearch} />
        </div>
        {filteredPlayers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">SPICA spent</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredPlayers.map((player) => {
                  const playerRows = sessions.filter((session) => session.playerId === player.id);
                  const spent = playerRows.reduce((sum, session) => sum + session.grossSpica, 0);
                  return (
                    <tr className="text-slate-300" key={player.id}>
                      <td className="px-4 py-3"><p className="font-semibold text-white">{player.name}</p><p className="text-xs text-slate-500">{player.email}</p></td>
                      <td className="px-4 py-3 text-cyan-100">{formatSpica(player.balance)}</td>
                      <td className="px-4 py-3 text-purple-100">{formatSpica(spent)}</td>
                      <td className="px-4 py-3">{playerRows.length}</td>
                      <td className="px-4 py-3">Level {player.level ?? 1}</td>
                      <td className="px-4 py-3"><StatusBadge tone={player.onlineStatus === "online" ? "success" : "neutral"}>{player.onlineStatus ?? "active"}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="p-5"><EmptyState title="No players found" description="Global player accounts will appear here after signup." /></div>}
      </section>
    );

    const commissionsPanel = (
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-3">
          <StatCard detail="Completed session fee capture" icon={ShieldCheck} title="Commission Earned" tone="green" value={formatSpica(commissionEarned)} />
          <StatCard detail="Mock credit purchases" icon={Coins} title="Credits Sold" value={formatSpica(creditsSold)} />
          <StatCard detail="All session volume" icon={BarChart3} title="Total Spend" tone="purple" value={formatSpica(totalSpent)} />
        </div>
        <SettlementTable settlements={settlements} />
      </div>
    );

    function renderAdminTournamentManager() {
      return (
        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Tournament Control</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{tournamentDraft.id ? "Edit tournament" : "Create tournament"}</h3>
            <div className="mt-4 space-y-3">
              <input className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" value={tournamentDraft.title} />
              <textarea className="app-input min-h-24 resize-none" onChange={(event) => setTournamentDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" value={tournamentDraft.description} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, startDate: event.target.value }))} type="datetime-local" value={tournamentDraft.startDate} />
                <input className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, endDate: event.target.value }))} type="datetime-local" value={tournamentDraft.endDate} />
                <select className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, status: event.target.value as PlatformTournament["status"] }))} value={tournamentDraft.status}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <select className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, audience: event.target.value as PlatformTournament["audience"] }))} value={tournamentDraft.audience}>
                  <option value="players">Players</option>
                  <option value="zones">Zones</option>
                  <option value="all">All</option>
                </select>
              </div>
              <input className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, prize: event.target.value }))} placeholder="Prize / reward text" value={tournamentDraft.prize} />
              <input className="app-input" onChange={(event) => setTournamentDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Image / banner URL" value={tournamentDraft.imageUrl} />
              <div className="flex gap-2">
                <AppButton onClick={savePlatformTournament} type="button">{tournamentDraft.id ? "Save changes" : "Create tournament"}</AppButton>
                {tournamentDraft.id ? <AppButton onClick={() => setTournamentDraft({ id: "", title: "", description: "", startDate: "", endDate: "", status: "draft", audience: "players", prize: "", imageUrl: "" })} type="button" variant="ghost">Cancel</AppButton> : null}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Tournament List</p>
            <div className="mt-4">{renderTournamentCards(platformTournaments, "No tournaments scheduled", "Create a tournament to publish it to players or zones.")}</div>
            {platformTournaments.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {platformTournaments.map((item) => (
                  <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-200/30 hover:text-white" key={item.id} onClick={() => setTournamentDraft({ id: item.id, title: item.title, description: item.description, startDate: item.startDate?.slice(0, 16) ?? "", endDate: item.endDate?.slice(0, 16) ?? "", status: item.status, audience: item.audience, prize: item.prize ?? "", imageUrl: item.imageUrl ?? "" })} type="button">
                    Edit {item.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      );
    }

    function renderAdminAnnouncementManager() {
      return (
        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-purple-200">Platform Updates</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{platformAnnouncementDraft.id ? "Edit announcement" : "Create announcement"}</h3>
            <div className="mt-4 space-y-3">
              <input className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" value={platformAnnouncementDraft.title} />
              <textarea className="app-input min-h-24 resize-none" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Body" value={platformAnnouncementDraft.body} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, category: event.target.value as PlatformAnnouncement["category"] }))} value={platformAnnouncementDraft.category}>
                  <option value="system">System</option>
                  <option value="tournament">Tournament</option>
                  <option value="zone">Zone</option>
                  <option value="player">Player</option>
                  <option value="security">Security</option>
                  <option value="event">Event</option>
                </select>
                <select className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, audience: event.target.value as PlatformAnnouncement["audience"] }))} value={platformAnnouncementDraft.audience}>
                  <option value="players">Players</option>
                  <option value="zones">Zones</option>
                  <option value="all">All</option>
                </select>
                <select className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, status: event.target.value as PlatformAnnouncement["status"] }))} value={platformAnnouncementDraft.status}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <input className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, publishDate: event.target.value }))} type="datetime-local" value={platformAnnouncementDraft.publishDate} />
              </div>
              <input className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Image URL" value={platformAnnouncementDraft.imageUrl} />
              <input className="app-input" onChange={(event) => setPlatformAnnouncementDraft((current) => ({ ...current, linkUrl: event.target.value }))} placeholder="Optional link URL" value={platformAnnouncementDraft.linkUrl} />
              <div className="flex gap-2">
                <AppButton onClick={savePlatformAnnouncement} type="button">{platformAnnouncementDraft.id ? "Save changes" : "Create update"}</AppButton>
                {platformAnnouncementDraft.id ? <AppButton onClick={() => setPlatformAnnouncementDraft({ id: "", title: "", body: "", category: "system", audience: "players", status: "draft", publishDate: "", imageUrl: "", linkUrl: "" })} type="button" variant="ghost">Cancel</AppButton> : null}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Announcement List</p>
            <div className="mt-4">{renderAnnouncementCards(platformAnnouncements, "No announcements published", "Create a platform update to publish it to players or zones.")}</div>
            {platformAnnouncements.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {platformAnnouncements.map((item) => (
                  <button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-200/30 hover:text-white" key={item.id} onClick={() => setPlatformAnnouncementDraft({ id: item.id, title: item.title, body: item.body, category: item.category, audience: item.audience, status: item.status, publishDate: item.publishDate?.slice(0, 16) ?? "", imageUrl: item.imageUrl ?? "", linkUrl: item.linkUrl ?? "" })} type="button">
                    Edit {item.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      );
    }

    const simplePage = (
      activeView === "Tournaments" ? renderAdminTournamentManager() : activeView === "Announcements" ? renderAdminAnnouncementManager() : <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
        <p className="text-xs uppercase tracking-[0.18em] text-purple-200">
          {activeView === "Moderation" ? "Trust & Safety" : activeView === "Support" ? "Support Desk" : "Ecosystem Events"}
        </p>
        <h3 className="mt-3 text-xl font-semibold text-white">
          {activeView === "Moderation" ? "Moderation Queue" : activeView === "Support" ? "Operator & Player Support" : "Ecosystem Control"}
        </h3>
        <EmptyState
          title={activeView === "Moderation" ? "No moderation items" : activeView === "Support" ? "No support tickets" : "No records yet"}
          description={activeView === "Moderation"
            ? "Suspicious activity, player reports, and zone review flags will appear here."
            : activeView === "Support"
              ? "Zone owner requests, player billing questions, and technical support cases will be handled here."
              : "This admin workspace will show real Supabase-backed records when available."}
        />
      </section>
    );

    const systemHealthPanel = (
      <div className="space-y-5">
        {renderPendingZoneApprovals()}
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard detail="Active operators" icon={Landmark} title="Active Zones" value={String(activeZones)} />
          <StatCard detail="Current live sessions" icon={Activity} title="Live Sessions" tone="purple" value={String(activeSessions.length)} />
          <StatCard detail="Approval queue volume" icon={Banknote} title="Pending Settlements" tone="red" value={String(pendingSettlements.length)} />
          <StatCard detail="Graph-ready daily volume" icon={BarChart3} title="SPICA Volume" tone="green" value={formatSpica(totalSpent)} />
        </div>
        {renderSafetyPanel()}
        {renderEcosystemSessionSummary()}
      </div>
    );

    const homePanel = (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard detail={`${zones.filter((zone) => zone.status === "Pending").length} pending review`} icon={Landmark} title="Total Zones" value={String(zones.length)} />
          <StatCard detail="Player wallets in mock network" icon={Users} title="Total Players" tone="purple" value={String(players.length)} />
          <StatCard detail="Registered seats across zones" icon={Monitor} title="Network Capacity" tone="green" value={String(platformPcCapacity)} />
          <StatCard detail="All live gameplay" icon={Activity} title="Active Sessions" tone="purple" value={String(activeSessions.length)} />
          <StatCard detail="All-time SPICA purchases" icon={Coins} title="SPICA Credits Sold" value={formatSpica(creditsSold)} />
          <StatCard detail="All session volume" icon={WalletCards} title="SPICA Spent" tone="purple" value={formatSpica(totalSpent)} />
          <StatCard detail="10% fee on completed settlements" icon={ShieldCheck} title="Commission Earned" tone="green" value={formatSpica(commissionEarned)} />
          <StatCard detail="Zone net earned" icon={Banknote} title="Zone Net" tone="green" value={formatSpica(totalZoneNet)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.55fr]">
          {renderAdminZoneTable()}
          <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-nebula">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Admin Notifications</p>
            <div className="mt-4 space-y-3">
              {adminNotifications.length ? adminNotifications.map((item, index) => (
                <div className="rounded-xl bg-black/25 p-3" key={item.id ?? `${item.title}-${item.detail}-${index}`}>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No admin notifications.</p>}
            </div>
          </section>
        </div>
        <div className="grid gap-4 2xl:grid-cols-[1fr_0.85fr]">
          {renderAdminSettlementControl()}
          <WithdrawalTable withdrawals={withdrawals} />
        </div>
        {renderEcosystemSessionSummary()}
        {renderSafetyPanel()}
      </div>
    );

    return (
      <AdminDashboard
        activeView={activeView}
        commissions={commissionsPanel}
        home={homePanel}
        players={playersPanel}
        requests={renderPendingZoneApprovals()}
        sessions={<div className="space-y-5">{renderEcosystemSessionSummary()}</div>}
        settlements={<div className="space-y-5">{renderAdminSettlementControl()}{renderSettlementApprovals()}</div>}
        simplePage={simplePage}
        systemHealth={systemHealthPanel}
        withdrawals={renderApprovalTable()}
        zones={<div className="space-y-5">{renderPendingZoneApprovals()}{renderAdminZoneTable()}</div>}
      />
    );
  }

  function renderContent() {
    if (activeView === "Settings") {
      if (role === "zone") {
        return (
          <ZoneSettings>
            <div className="space-y-5">
              <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Zone Branding</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{ownerZone.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Upload public-facing media through Supabase Storage. The operational PC/session system stays on Prisma and realtime.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-cyan-200/30">
                    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                      {ownerZone.branding?.logoUrl ? <img alt="" className="h-full w-full object-cover" src={ownerZone.branding.logoUrl} /> : <ImageIcon className="h-5 w-5" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">Zone logo</span>
                      <span className="mt-1 block text-xs text-slate-500">{uploadingMedia === "zone-logo" ? "Uploading..." : "Upload logo image"}</span>
                    </span>
                    <input
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={uploadingMedia === "zone-logo"}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await uploadMedia(file, "zone-logo", { zoneId: ownerZone.id });
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-purple-200/30">
                    <span className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-2xl border border-purple-300/20 bg-purple-300/10 text-purple-100">
                      {ownerZone.branding?.bannerUrl ? <img alt="" className="h-full w-full object-cover" src={ownerZone.branding.bannerUrl} /> : <UploadCloud className="h-5 w-5" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">Zone banner</span>
                      <span className="mt-1 block text-xs text-slate-500">{uploadingMedia === "zone-banner" ? "Uploading..." : "Upload wide banner image"}</span>
                    </span>
                    <input
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={uploadingMedia === "zone-banner"}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await uploadMedia(file, "zone-banner", { zoneId: ownerZone.id });
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                </div>
              </section>
              <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-nebula">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Operations Settings</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Commission 10% - Withdrawal Fee 3%</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Pricing, settlement cycles, owner permissions, and payment rails remain controlled by the existing operational backend.</p>
              </section>
            </div>
          </ZoneSettings>
        );
      }

      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-nebula">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">MVP Settings</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Commission 10% - Withdrawal Fee 3%</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Production settings can later control pricing, settlement cycles, owner permissions, player limits, and real payment rails.</p>
        </div>
      );
    }

    if (role === "player") {
      return renderPlayerDashboard();
    }

    if (role === "zone") {
      return renderZoneDashboard();
    }

    return renderAdminDashboard();
  }

  const pageSubcopy: Record<DashboardRole, string> = {
    player: "Your mobile-first Ezzstar identity app for SPICA balance, live sessions, and play history.",
    zone: "Installed operator software for paired PCs, player sessions, local settings, and settlements.",
    admin: "Ezzstar web control center for public onboarding, zones, players, approvals, and ecosystem health."
  };

  async function logoutToLogin() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    window.location.assign("/login");
  }

  function renderProfileSyncError() {
    const detail = dashboardApiError ?? (dashboardApiStatus === "ok" ? "Profile data was missing from the dashboard response." : "Could not sync your profile.");

    return (
      <main className="min-h-screen">
        <RoleSidebar activeView={activeView} onViewChange={setActiveView} role={role} />
        <div className="lg:pl-72">
          <section className="flex min-h-screen items-center justify-center px-5 py-8">
            <div className="w-full max-w-xl rounded-2xl border border-red-300/20 bg-[#0b0d12] p-5 shadow-nebula">
              <p className="text-xs uppercase tracking-[0.18em] text-red-200">Profile Sync</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Could not sync your profile</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Your account is signed in, but the dashboard data did not load correctly. Retry the sync, or sign out and sign in again.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <AppButton onClick={refreshBackendDashboard} type="button">
                  Retry sync
                </AppButton>
                <AppButton onClick={logoutToLogin} type="button" variant="ghost">
                  Logout
                </AppButton>
              </div>
              {process.env.NODE_ENV === "development" ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-3 text-xs text-slate-400">
                  <p><span className="text-slate-500">Status:</span> {dashboardApiStatus}</p>
                  <p className="mt-1"><span className="text-slate-500">Error:</span> {detail}</p>
                  <p className="mt-1"><span className="text-slate-500">Role:</span> {role}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen">
        <div className="lg:pl-72">
          <section className="px-5 py-6 md:px-8 md:py-8">
            <LoadingState label="Syncing your profile..." />
          </section>
        </div>
      </main>
    );
  }

  if (!currentUser && (dashboardApiStatus === "error" || dashboardApiStatus === "ok")) {
    return renderProfileSyncError();
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen">
        <RoleSidebar activeView={activeView} onViewChange={setActiveView} role={role} />
        <div className="lg:pl-72">
          <section className="px-5 py-6 md:px-8 md:py-8">
            <LoadingState label="Syncing your profile..." />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28 lg:pb-0">
      <RoleSidebar activeView={activeView} onViewChange={setActiveView} role={role} />

      <div className="lg:pl-72">
        <Topbar
          activeZones={activeZones}
          activityCount={role === "player" ? 0 : roleActivity.length}
          commissionEarned={commissionEarned}
          eyebrow={roleEyebrow[role]}
          onOpenActivity={role === "player" ? undefined : () => setOpenDrawer("activity")}
          onOpenNotifications={() => setOpenDrawer("notifications")}
          playerBalance={selectedPlayer.balance}
          title={roleTitle[role]}
          unreadCount={unreadNotifications}
        />
        {dashboardDataStatus === "error" ? (
          <div className="px-4 pt-4 sm:px-5 md:px-8">
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <span>{dashboardDataError ?? "Some data could not load. Retry."}</span>
              <button className="rounded-xl border border-amber-200/25 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:border-amber-100/60" onClick={refreshBackendDashboard} type="button">
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <section className="px-4 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8">
          <div className="mb-5 flex flex-col justify-between gap-3 md:mb-6 md:flex-row md:items-end">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">{pageSubcopy[role]}</p>
              <h2 className="mt-2 truncate text-lg font-semibold text-slate-100 sm:text-xl">{activeView}</h2>
            </div>
            <div className="w-fit max-w-full truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400 sm:px-4 sm:text-sm">
              {role === "player"
                ? `${formatSpica(selectedPlayer.balance)} balance`
                : role === "zone"
                  ? `${ownerZone.pcs.filter((pc) => pc.status !== "offline").length} operational PCs - ${formatSpica(ownerGross)} gross`
                  : `${activeZones} active zones - ${formatSpica(commissionEarned)} commission`}
            </div>
          </div>

          <div className="space-y-5">
            {renderContent()}
            {renderDevelopmentTestingPanel()}
          </div>
        </section>
      </div>

      <OverlayDrawer eyebrow={roleEyebrow[role]} onClose={closeNotificationDrawer} open={openDrawer === "notifications"} title="Notifications">
        <NotificationCenter activity={roleActivity} onMarkRead={() => setNotificationReadAt(Date.now())} readAt={notificationReadAt} role={role} variant="drawer" />
      </OverlayDrawer>

      {role !== "player" ? (
        <OverlayDrawer eyebrow={roleEyebrow[role]} onClose={() => setOpenDrawer(null)} open={openDrawer === "activity"} title={role === "zone" ? "Zone Activity" : "Admin Activity"}>
          <SystemActivityFeed activity={roleActivity} variant="drawer" />
        </OverlayDrawer>
      ) : null}

      <SessionModal
        onClose={() => setSelectedPc(null)}
        onPlayerChange={setSelectedPlayerId}
        onStart={(playerId, duration) => {
          if (selectedPc) {
            startDashboardSession(playerId, role === "zone" ? ownerZone.id : selectedZone.id, selectedPc.id, duration);
          }
          setSelectedPc(null);
        }}
        open={Boolean(selectedPc)}
        pc={selectedPc}
        players={role === "zone" ? zonePlayerResults : allKnownPlayers}
        selectedPlayerId={selectedPlayerId}
        zone={role === "zone" ? ownerZone : selectedZone}
      />
    </main>
  );
}
