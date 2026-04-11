import { io, Socket } from "socket.io-client";

const WS_URL = import.meta.env.VITE_WS_URL as string;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}

export function registerSocket(userId: string): void {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("register", userId);
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export default getSocket;
