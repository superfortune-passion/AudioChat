"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManager = void 0;
const types_1 = require("../types");
const RoomManager_1 = require("./RoomManager");
class UserManager {
    constructor() {
        this.users = new Map();
        this.queue = [];
        this.io = null;
        this.roomManager = new RoomManager_1.RoomManager();
    }
    setIo(io) {
        this.io = io;
    }
    getStats() {
        var _a, _b;
        const calling = Array.from(this.users.values()).filter((user) => user.roomId !== null).length;
        const matching = this.queue.length;
        const online = (_b = (_a = this.io) === null || _a === void 0 ? void 0 : _a.sockets.sockets.size) !== null && _b !== void 0 ? _b : this.users.size;
        return { online, calling, matching };
    }
    broadcastStats() {
        var _a;
        (_a = this.io) === null || _a === void 0 ? void 0 : _a.emit("server-stats", this.getStats());
    }
    addUser(socket, payload = {}) {
        var _a, _b;
        const interests = (_a = payload.interests) !== null && _a !== void 0 ? _a : [];
        const matchMode = (_b = payload.matchMode) !== null && _b !== void 0 ? _b : "random";
        const user = {
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
    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (!user)
            return;
        if (user.roomId) {
            this.handlePartnerLeft(user.roomId, socketId, "partner-disconnected");
        }
        this.dequeue(socketId);
        this.users.delete(socketId);
        this.broadcastStats();
    }
    skipUser(socketId) {
        const user = this.users.get(socketId);
        if (!user)
            return;
        if (user.roomId) {
            this.handlePartnerLeft(user.roomId, socketId, "partner-skipped");
        }
        this.dequeue(socketId);
        this.enqueue(socketId);
        user.socket.emit("lobby");
        this.tryMatch();
        this.broadcastStats();
    }
    rematchUser(socketId, payload = {}) {
        var _a, _b;
        const user = this.users.get(socketId);
        if (!user)
            return;
        if (user.roomId) {
            this.handlePartnerLeft(user.roomId, socketId, "partner-left");
        }
        user.interests = (_a = payload.interests) !== null && _a !== void 0 ? _a : user.interests;
        user.matchMode = (_b = payload.matchMode) !== null && _b !== void 0 ? _b : user.matchMode;
        this.dequeue(socketId);
        this.enqueue(socketId);
        user.socket.emit("lobby");
        this.tryMatch();
        this.broadcastStats();
    }
    handlePartnerLeft(roomId, leaverId, event) {
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
    enqueue(socketId) {
        if (!this.queue.includes(socketId)) {
            this.queue.push(socketId);
        }
    }
    dequeue(socketId) {
        this.queue = this.queue.filter((id) => id !== socketId);
    }
    tryMatch() {
        if (this.roomManager.roomCount >= types_1.MAX_ROOMS) {
            return;
        }
        while (this.queue.length >= 2 &&
            this.roomManager.roomCount < types_1.MAX_ROOMS) {
            const match = this.findBestMatch();
            if (!match)
                break;
            const [id1, id2] = match;
            const user1 = this.users.get(id1);
            const user2 = this.users.get(id2);
            if (!user1 || !user2)
                continue;
            this.dequeue(id1);
            this.dequeue(id2);
            this.roomManager.createRoom(user1, user2);
            this.broadcastStats();
        }
    }
    findBestMatch() {
        if (this.queue.length < 2)
            return null;
        let bestPair = null;
        let bestScore = 0;
        for (let i = 0; i < this.queue.length; i++) {
            for (let j = i + 1; j < this.queue.length; j++) {
                const id1 = this.queue[i];
                const id2 = this.queue[j];
                const user1 = this.users.get(id1);
                const user2 = this.users.get(id2);
                if (!user1 || !user2)
                    continue;
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
        if (!this.users.has(id1) || !this.users.has(id2))
            return null;
        return [id1, id2];
    }
    compatibilityScore(user1, user2) {
        if (user1.matchMode !== "interest" && user2.matchMode !== "interest") {
            return 0;
        }
        if (user1.matchMode === "interest" && user2.matchMode === "interest") {
            const overlap = user1.interests.filter((i) => user2.interests.includes(i));
            return overlap.length;
        }
        return 0;
    }
    initHandlers(socket) {
        socket.on("offer", ({ sdp, roomId }) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        });
        socket.on("answer", ({ sdp, roomId }) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });
        socket.on("add-ice-candidate", ({ candidate, roomId, type, }) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });
        socket.on("skip", () => {
            this.skipUser(socket.id);
        });
        socket.on("rematch", (payload) => {
            this.rematchUser(socket.id, payload);
        });
    }
}
exports.UserManager = UserManager;
