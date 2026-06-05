"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
let GLOBAL_ROOM_ID = 1;
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    get roomCount() {
        return this.rooms.size;
    }
    createRoom(user1, user2) {
        const roomId = this.generate().toString();
        user1.roomId = roomId;
        user2.roomId = roomId;
        this.rooms.set(roomId, { user1, user2 });
        user1.socket.emit("send-offer", { roomId });
        user2.socket.emit("send-offer", { roomId });
        return roomId;
    }
    getPartner(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        return room.user1.socket.id === socketId ? room.user2 : room.user1;
    }
    deleteRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.user1.roomId = null;
            room.user2.roomId = null;
        }
        this.rooms.delete(roomId);
    }
    onOffer(roomId, sdp, senderSocketId) {
        const partner = this.getPartner(roomId, senderSocketId);
        partner === null || partner === void 0 ? void 0 : partner.socket.emit("offer", { sdp, roomId });
    }
    onAnswer(roomId, sdp, senderSocketId) {
        const partner = this.getPartner(roomId, senderSocketId);
        partner === null || partner === void 0 ? void 0 : partner.socket.emit("answer", { sdp, roomId });
    }
    onIceCandidates(roomId, senderSocketId, candidate, type) {
        const partner = this.getPartner(roomId, senderSocketId);
        partner === null || partner === void 0 ? void 0 : partner.socket.emit("add-ice-candidate", { candidate, type });
    }
    generate() {
        return GLOBAL_ROOM_ID++;
    }
}
exports.RoomManager = RoomManager;
