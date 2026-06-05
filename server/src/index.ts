import express from "express";
import http from "http";
import os from "os";
import { Server } from "socket.io";
import { Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";
import { JoinPayload } from "./types";

const app = express();
const server = http.createServer(app);

const clientOrigin = process.env.CLIENT_ORIGIN ?? "*";
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
  },
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (clientOrigin === "*") {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
  } else {
    res.setHeader("Access-Control-Allow-Origin", clientOrigin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const userManager = new UserManager();
userManager.setIo(io);

app.get("/stats", (_req, res) => {
  res.json(userManager.getStats());
});

io.on("connection", (socket: Socket) => {
  console.log("user connected:", socket.id);
  socket.emit("server-stats", userManager.getStats());

  socket.on("join", (payload: JoinPayload) => {
    userManager.addUser(socket, payload);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    userManager.removeUser(socket.id);
  });
});

function getLocalAddresses(): string[] {
  const addresses: string[] = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(port, host, () => {
  console.log(`JamLink server listening on port ${port}`);
  const ips = getLocalAddresses();
  if (ips.length > 0) {
    console.log("Other devices on your network can connect to:");
    for (const ip of ips) {
      console.log(`  http://${ip}:3000 (signaling)`);
    }
  }
});
