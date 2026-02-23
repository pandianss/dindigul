import { io } from "socket.io-client";

// In production (served from same host), an empty string/undefined uses the current origin
const SOCKET_URL = import.meta.env.VITE_WS_URL || undefined;

export const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false, // Connect when SocketProvider mounts
});
