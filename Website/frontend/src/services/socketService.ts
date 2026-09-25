import { io, Socket } from 'socket.io-client';

let dashboardSocket: Socket | null = null;

export function getDashboardSocket(): Socket {
  if (!dashboardSocket) {
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    dashboardSocket = io(`http://${host}:3001/dashboard`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
  }
  return dashboardSocket;
}
