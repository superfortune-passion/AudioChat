"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const os_1 = __importDefault(require("os"));
const socket_io_1 = require("socket.io");
const UserManager_1 = require("./managers/UserManager");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const clientOrigin = (_a = process.env.CLIENT_ORIGIN) !== null && _a !== void 0 ? _a : "*";
const port = Number((_b = process.env.PORT) !== null && _b !== void 0 ? _b : 3000);
const host = (_c = process.env.HOST) !== null && _c !== void 0 ? _c : "0.0.0.0";
const io = new socket_io_1.Server(server, {
    cors: {
        origin: clientOrigin,
        methods: ["GET", "POST"],
    },
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
const userManager = new UserManager_1.UserManager();
io.on("connection", (socket) => {
    console.log("user connected:", socket.id);
    socket.on("join", (payload) => {
        userManager.addUser(socket, payload);
    });
    socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);
        userManager.removeUser(socket.id);
    });
});
function getLocalAddresses() {
    const addresses = [];
    for (const interfaces of Object.values(os_1.default.networkInterfaces())) {
        for (const iface of interfaces !== null && interfaces !== void 0 ? interfaces : []) {
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
