import { useCallback, useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";
import { RTC_CONFIG, SOCKET_URL } from "../config/webrtc";
import { MatchMode } from "../constants/interests";

export type ConnectionStatus =
  | "connecting"
  | "lobby"
  | "matched"
  | "partner-left";

interface UseWebRTCOptions {
  audioTrack: MediaStreamTrack | null;
  interests: string[];
  matchMode: MatchMode;
  enabled: boolean;
}

export interface ServerStats {
  online: number;
  calling: number;
  matching: number;
}

interface UseWebRTCResult {
  status: ConnectionStatus;
  statusMessage: string | null;
  remoteStream: MediaStream | null;
  serverStats: ServerStats;
  skip: () => void;
  rematch: () => void;
}

function cleanupPeerConnection(pc: RTCPeerConnection | null): void {
  if (!pc) return;
  pc.onicecandidate = null;
  pc.onnegotiationneeded = null;
  pc.ontrack = null;
  pc.onconnectionstatechange = null;
  pc.close();
}

async function addIceCandidateSafe(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
  pending: RTCIceCandidateInit[]
): Promise<void> {
  if (!pc.remoteDescription) {
    pending.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.warn("Failed to add ICE candidate:", err);
  }
}

async function flushPendingCandidates(
  pc: RTCPeerConnection,
  pending: RTCIceCandidateInit[]
): Promise<void> {
  while (pending.length > 0) {
    const candidate = pending.shift();
    if (!candidate) break;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("Failed to flush ICE candidate:", err);
    }
  }
}

export function useWebRTC({
  audioTrack,
  interests,
  matchMode,
  enabled,
}: UseWebRTCOptions): UseWebRTCResult {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [serverStats, setServerStats] = useState<ServerStats>({
    online: 0,
    calling: 0,
    matching: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const sendingPcRef = useRef<RTCPeerConnection | null>(null);
  const receivingPcRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const audioTrackRef = useRef(audioTrack);
  const interestsRef = useRef(interests);
  const matchModeRef = useRef(matchMode);
  const sendingPendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const receivingPendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  audioTrackRef.current = audioTrack;
  interestsRef.current = interests;
  matchModeRef.current = matchMode;

  const clearRemoteAudio = useCallback(() => {
    if (remoteAudioRef.current?.srcObject) {
      const stream = remoteAudioRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  const cleanupConnections = useCallback(() => {
    cleanupPeerConnection(sendingPcRef.current);
    cleanupPeerConnection(receivingPcRef.current);
    sendingPcRef.current = null;
    receivingPcRef.current = null;
    roomIdRef.current = null;
    sendingPendingIceRef.current = [];
    receivingPendingIceRef.current = [];

    clearRemoteAudio();
    setRemoteStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, [clearRemoteAudio]);

  const resetToLobby = useCallback(
    (message?: string) => {
      cleanupConnections();
      setStatus("lobby");
      setStatusMessage(message ?? null);
    },
    [cleanupConnections]
  );

  const skip = useCallback(() => {
    socketRef.current?.emit("skip");
    resetToLobby("Finding another musician...");
  }, [resetToLobby]);

  const rematch = useCallback(() => {
    socketRef.current?.emit("rematch", {
      interests: interestsRef.current,
      matchMode: matchModeRef.current,
    });
    resetToLobby("Finding another musician...");
  }, [resetToLobby]);

  useEffect(() => {
    if (!enabled || !audioTrack) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;
    sendingPendingIceRef.current = [];
    receivingPendingIceRef.current = [];

    socket.on("connect", () => {
      setStatus("lobby");
      socket.emit("join", {
        interests: interestsRef.current,
        matchMode: matchModeRef.current,
      });
    });

    socket.on("server-stats", (data: ServerStats) => {
      setServerStats(data);
    });

    socket.on("lobby", () => {
      resetToLobby();
    });

    socket.on("send-offer", async ({ roomId }: { roomId: string }) => {
      cleanupConnections();
      roomIdRef.current = roomId;
      setStatus("matched");
      setStatusMessage(null);

      const pc = new RTCPeerConnection(RTC_CONFIG);
      sendingPcRef.current = pc;

      const track = audioTrackRef.current;
      if (track) {
        pc.addTrack(track);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate && roomIdRef.current) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate.toJSON(),
            type: "sender",
            roomId: roomIdRef.current,
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (roomIdRef.current) {
            socket.emit("offer", {
              sdp: pc.localDescription,
              roomId: roomIdRef.current,
            });
          }
        } catch (err) {
          console.error("Negotiation failed:", err);
        }
      };
    });

    socket.on(
      "offer",
      async ({
        roomId,
        sdp,
      }: {
        roomId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        roomIdRef.current = roomId;
        setStatus("matched");
        setStatusMessage(null);

        const pc = new RTCPeerConnection(RTC_CONFIG);
        receivingPcRef.current = pc;

        const stream = new MediaStream();
        setRemoteStream(stream);

        pc.ontrack = (e) => {
          if (e.track.kind === "audio") {
            stream.addTrack(e.track);
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
              remoteAudioRef.current.play().catch(() => {});
            }
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate && roomIdRef.current) {
            socket.emit("add-ice-candidate", {
              candidate: e.candidate.toJSON(),
              type: "receiver",
              roomId: roomIdRef.current,
            });
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(pc, receivingPendingIceRef.current);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", {
            roomId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error("Failed to handle offer:", err);
        }
      }
    );

    socket.on(
      "answer",
      async ({
        sdp,
      }: {
        roomId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        const pc = sendingPcRef.current;
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(pc, sendingPendingIceRef.current);
        } catch (err) {
          console.error("Failed to set remote description:", err);
        }
      }
    );

    socket.on(
      "add-ice-candidate",
      async ({
        candidate,
        type,
      }: {
        candidate: RTCIceCandidateInit;
        type: "sender" | "receiver";
      }) => {
        const pc =
          type === "sender" ? receivingPcRef.current : sendingPcRef.current;
        const pending =
          type === "sender"
            ? receivingPendingIceRef.current
            : sendingPendingIceRef.current;
        if (pc) {
          await addIceCandidateSafe(pc, candidate, pending);
        }
      }
    );

    const onPartnerGone = (message: string) => {
      resetToLobby(message);
    };

    socket.on("partner-disconnected", () =>
      onPartnerGone("Your jam partner disconnected.")
    );
    socket.on("partner-skipped", () =>
      onPartnerGone("Your jam partner skipped. Finding someone new...")
    );
    socket.on("partner-left", () =>
      onPartnerGone("Your jam partner left. Finding someone new...")
    );

    socket.on("disconnect", () => {
      setStatus("connecting");
      setStatusMessage("Reconnecting...");
      cleanupConnections();
    });

    return () => {
      socket.emit("skip");
      socket.disconnect();
      socketRef.current = null;
      cleanupConnections();
    };
  }, [enabled, audioTrack, cleanupConnections, resetToLobby]);

  useEffect(() => {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "");
    remoteAudioRef.current = audio;

    return () => {
      audio.pause();
      audio.srcObject = null;
      remoteAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  return { status, statusMessage, remoteStream, serverStats, skip, rematch };
}
