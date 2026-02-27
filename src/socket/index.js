/**
 * Socket.IO + WebRTC signaling server
 * - Peers join rooms; signaling (offer, answer, ice-candidate) is relayed within the room.
 */
import { Server } from "socket.io";

const SOCKET_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://resume-ai-frontend-mj2p.vercel.app",
];

/**
 * Attach Socket.IO to the HTTP server and set up WebRTC signaling.
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: SOCKET_CORS_ORIGINS,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("[Socket] Client connected:", socket.id);

    socket.on("join-room", (roomId, userMeta = {}) => {
      if (!roomId || typeof roomId !== "string") {
        socket.emit("error", { message: "Invalid room id" });
        return;
      }
      const room = roomId.trim();
      socket.join(room);
      socket.roomId = room;
      socket.userMeta = userMeta;
      socket.to(room).emit("user-joined", { socketId: socket.id, userMeta });
      console.log("[Socket] Joined room:", room, "socket:", socket.id);
    });

    socket.on("offer", ({ to, offer }) => {
      if (to && offer) io.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
      if (to && answer) io.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      if (to && candidate) io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("leave-room", () => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit("user-left", { socketId: socket.id });
        socket.leave(socket.roomId);
        socket.roomId = null;
      }
    });

    socket.on("disconnect", (reason) => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit("user-left", { socketId: socket.id });
      }
      console.log("[Socket] Disconnected:", socket.id, reason);
    });
  });

  return io;
}
