function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  const stunUrl =
    import.meta.env.VITE_STUN_URL ?? "stun:stun.l.google.com:19302";
  servers.push({ urls: stunUrl });

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: buildIceServers(),
  iceCandidatePoolSize: 10,
};

function getSocketUrl(): string {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const { protocol, hostname } = window.location;
  // Local dev / LAN: signaling server runs on same machine, port 3000
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.endsWith(".local");
  if (isLocal) {
    return `${protocol}//${hostname}:3000`;
  }
  throw new Error(
    "VITE_SOCKET_URL is not configured. Set it to your deployed server URL (e.g. https://your-app.onrender.com)."
  );
}

export const SOCKET_URL = getSocketUrl();
