import { User } from "../types";
import { IceCandidatePayload, SessionDescription } from "../webrtc-types";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User;
  user2: User;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  get roomCount(): number {
    return this.rooms.size;
  }

  createRoom(user1: User, user2: User): string {
    const roomId = this.generate().toString();
    user1.roomId = roomId;
    user2.roomId = roomId;

    this.rooms.set(roomId, { user1, user2 });

    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });

    return roomId;
  }

  getPartner(roomId: string, socketId: string): User | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.user1.socket.id === socketId ? room.user2 : room.user1;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.user1.roomId = null;
      room.user2.roomId = null;
    }
    this.rooms.delete(roomId);
  }

  onOffer(
    roomId: string,
    sdp: SessionDescription,
    senderSocketId: string
  ): void {
    const partner = this.getPartner(roomId, senderSocketId);
    partner?.socket.emit("offer", { sdp, roomId });
  }

  onAnswer(
    roomId: string,
    sdp: SessionDescription,
    senderSocketId: string
  ): void {
    const partner = this.getPartner(roomId, senderSocketId);
    partner?.socket.emit("answer", { sdp, roomId });
  }

  onIceCandidates(
    roomId: string,
    senderSocketId: string,
    candidate: IceCandidatePayload,
    type: "sender" | "receiver"
  ): void {
    const partner = this.getPartner(roomId, senderSocketId);
    partner?.socket.emit("add-ice-candidate", { candidate, type });
  }

  private generate(): number {
    return GLOBAL_ROOM_ID++;
  }
}
