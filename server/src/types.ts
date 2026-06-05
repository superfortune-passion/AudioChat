import { Socket } from "socket.io";

export interface User {
  socket: Socket;
  interests: string[];
  matchMode: "random" | "interest";
  roomId: string | null;
}

export interface JoinPayload {
  interests?: string[];
  matchMode?: "random" | "interest";
}

export const MAX_ROOMS = 500;
