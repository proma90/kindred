import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

let socket = null;

export const connectSocket = async () => {
  const token = await SecureStore.getItemAsync('kindred_token');
  if (!token) return null;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    forceNew: true,
    autoConnect: true,
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinMatchRoom = (match_id) => socket?.emit('join:match', { match_id });
export const leaveMatchRoom = (match_id) => socket?.emit('leave:match', { match_id });
export const sendMessage = (match_id, content, type = 'text') =>
  socket?.emit('message:send', { match_id, content, type });
export const startTyping = (match_id) => socket?.emit('typing:start', { match_id });
export const stopTyping = (match_id) => socket?.emit('typing:stop', { match_id });
