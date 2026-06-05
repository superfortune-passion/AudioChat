import { Server, Socket } from "socket.io";
import { JoinPayload, MAX_ROOMS, User } from "../types";
import { IceCandidatePayload, SessionDescription } from "../webrtc-types";
import { RoomManager } from "./RoomManager";

export interface ServerStats {
  online: number;
  calling: number;
  matching: number;
}

export class UserManager {
  private users: Map<string, User> = new Map();
  private queue: string[] = [];
  private roomManager: RoomManager;
  private io: Server | null = null;

  constructor() {
    this.roomManager = new RoomManager();
  }

  setIo(io: Server): void {
    this.io = io;
  }

  getStats(): ServerStats {
    const calling = Array.from(this.users.values()).filter(
      (user) => user.roomId !== null
    ).length;
    const matching = this.queue.length;
    const online = this.io?.sockets.sockets.size ?? this.users.size;
    return { online, calling, matching };
  }

  private broadcastStats(): void {
    this.io?.emit("server-stats", this.getStats());
  }

  addUser(socket: Socket, payload: JoinPayload = {}): void {
    const interests = payload.interests ?? [];
    const matchMode = payload.matchMode ?? "random";

    const user: User = {
      socket,
      interests,
      matchMode,
      roomId: null,
    };

    this.users.set(socket.id, user);
    this.enqueue(socket.id);
    socket.emit("lobby");
    this.tryMatch();
    this.initHandlers(socket);
    this.broadcastStats();
  }

  removeUser(socketId: string): void {
    const user = this.users.get(socketId);
    if (!user) return;

    if (user.roomId) {
      this.handlePartnerLeft(user.roomId, socketId, "partner-disconnected");
    }

    this.dequeue(socketId);
    this.users.delete(socketId);
    this.broadcastStats();
  }

  skipUser(socketId: string): void {
    const user = this.users.get(socketId);
    if (!user) return;

    if (user.roomId) {
      this.handlePartnerLeft(user.roomId, socketId, "partner-skipped");
    }

    this.dequeue(socketId);
    this.enqueue(socketId);
    user.socket.emit("lobby");
    this.tryMatch();
    this.broadcastStats();
  }

  rematchUser(socketId: string, payload: JoinPayload = {}): void {
    const user = this.users.get(socketId);
    if (!user) return;

    if (user.roomId) {
      this.handlePartnerLeft(user.roomId, socketId, "partner-left");
    }

    user.interests = payload.interests ?? user.interests;
    user.matchMode = payload.matchMode ?? user.matchMode;

    this.dequeue(socketId);
    this.enqueue(socketId);
    user.socket.emit("lobby");
    this.tryMatch();
    this.broadcastStats();
  }

  private handlePartnerLeft(
    roomId: string,
    leaverId: string,
    event: "partner-disconnected" | "partner-skipped" | "partner-left"
  ): void {
    const partner = this.roomManager.getPartner(roomId, leaverId);
    this.roomManager.deleteRoom(roomId);

    if (partner && this.users.has(partner.socket.id)) {
      partner.roomId = null;
      this.dequeue(partner.socket.id);
      this.enqueue(partner.socket.id);
      partner.socket.emit(event);
      partner.socket.emit("lobby");
      this.tryMatch();
    }
    this.broadcastStats();
  }

  private enqueue(socketId: string): void {
    if (!this.queue.includes(socketId)) {
      this.queue.push(socketId);
    }
  }

  private dequeue(socketId: string): void {
    this.queue = this.queue.filter((id) => id !== socketId);
  }

  private tryMatch(): void {
    if (this.roomManager.roomCount >= MAX_ROOMS) {
      return;
    }

    while (
      this.queue.length >= 2 &&
      this.roomManager.roomCount < MAX_ROOMS
    ) {
      const match = this.findBestMatch();
      if (!match) break;

      const [id1, id2] = match;
      const user1 = this.users.get(id1);
      const user2 = this.users.get(id2);
      if (!user1 || !user2) continue;

      this.dequeue(id1);
      this.dequeue(id2);
      this.roomManager.createRoom(user1, user2);
      this.broadcastStats();
    }
  }

  private findBestMatch(): [string, string] | null {
    if (this.queue.length < 2) return null;

    let bestPair: [string, string] | null = null;
    let bestScore = 0;

    for (let i = 0; i < this.queue.length; i++) {
      for (let j = i + 1; j < this.queue.length; j++) {
        const id1 = this.queue[i];
        const id2 = this.queue[j];
        const user1 = this.users.get(id1);
        const user2 = this.users.get(id2);
        if (!user1 || !user2) continue;

        const score = this.compatibilityScore(user1, user2);
        if (score > bestScore) {
          bestScore = score;
          bestPair = [id1, id2];
        }
      }
    }

    if (bestPair && bestScore > 0) {
      return bestPair;
    }

    const id1 = this.queue[0];
    const id2 = this.queue[1];
    if (!this.users.has(id1) || !this.users.has(id2)) return null;
    return [id1, id2];
  }

  private compatibilityScore(user1: User, user2: User): number {
    if (user1.matchMode !== "interest" && user2.matchMode !== "interest") {
      return 0;
    }

    if (user1.matchMode === "interest" && user2.matchMode === "interest") {
      const overlap = user1.interests.filter((i) =>
        user2.interests.includes(i)
      );
      return overlap.length;
    }

    return 0;
  }

  private initHandlers(socket: Socket): void {
    socket.on(
      "offer",
      ({ sdp, roomId }: { sdp: SessionDescription; roomId: string }) => {
        this.roomManager.onOffer(roomId, sdp, socket.id);
      }
    );

    socket.on(
      "answer",
      ({ sdp, roomId }: { sdp: SessionDescription; roomId: string }) => {
        this.roomManager.onAnswer(roomId, sdp, socket.id);
      }
    );

    socket.on(
      "add-ice-candidate",
      ({
        candidate,
        roomId,
        type,
      }: {
        candidate: IceCandidatePayload;
        roomId: string;
        type: "sender" | "receiver";
      }) => {
        this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
      }
    );

    socket.on("skip", () => {
      this.skipUser(socket.id);
    });

    socket.on("rematch", (payload: JoinPayload) => {
      this.rematchUser(socket.id, payload);
    });
  }
}
