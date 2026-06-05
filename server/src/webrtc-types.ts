export type SdpType = "offer" | "answer" | "pranswer" | "rollback";

export interface SessionDescription {
  type: SdpType;
  sdp: string;
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string;
}
