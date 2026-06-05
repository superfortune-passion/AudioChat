import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "../config/webrtc";

export interface ServerStats {
  online: number;
  calling: number;
  matching: number;
}

export type ServerReachability = "connecting" | "online" | "offline";

const EMPTY_STATS: ServerStats = { online: 0, calling: 0, matching: 0 };

export function useServerStats(enabled = true): {
  stats: ServerStats;
  reachability: ServerReachability;
} {
  const [stats, setStats] = useState<ServerStats>(EMPTY_STATS);
  const [reachability, setReachability] = useState<ServerReachability>(
    enabled ? "connecting" : "offline"
  );

  useEffect(() => {
    if (!enabled) return;

    const statsUrl = `${SOCKET_URL.replace(/\/$/, "")}/stats`;
    let socket: Socket | null = null;
    let mounted = true;

    const markOnline = () => {
      if (mounted) setReachability("online");
    };

    const markOffline = () => {
      if (mounted) setReachability("offline");
    };

    const fetchStats = async () => {
      try {
        const res = await fetch(statsUrl);
        if (res.ok) {
          const data = (await res.json()) as ServerStats;
          if (mounted) {
            setStats(data);
            setReachability("online");
          }
          return true;
        }
      } catch {
        /* server unreachable */
      }
      return false;
    };

    setReachability("connecting");
    fetchStats().then((ok) => {
      if (!ok && mounted && !socket?.connected) {
        setReachability("offline");
      }
    });

    try {
      socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        autoConnect: true,
      });

      socket.on("connect", markOnline);

      socket.on("disconnect", () => {
        fetchStats().then((ok) => {
          if (!ok) markOffline();
        });
      });

      socket.on("connect_error", () => {
        fetchStats().then((ok) => {
          if (!ok) markOffline();
        });
      });

      socket.on("server-stats", (data: ServerStats) => {
        if (mounted) {
          setStats(data);
          markOnline();
        }
      });
    } catch {
      markOffline();
    }

    const pollId = window.setInterval(async () => {
      const ok = await fetchStats();
      if (!ok && socket && !socket.connected && mounted) {
        setReachability("offline");
      }
    }, 3000);

    return () => {
      mounted = false;
      window.clearInterval(pollId);
      socket?.disconnect();
    };
  }, [enabled]);

  return { stats, reachability };
}
