import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('kindred_token');
      if (token) {
        const res = await api.get('/auth/me');
        set({ user: res.data.user, token, isAuthenticated: true });
        await connectSocket();
      }
    } catch {
      await SecureStore.deleteItemAsync('kindred_token');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, token } = res.data;
    await SecureStore.setItemAsync('kindred_token', token);
    set({ user, token, isAuthenticated: true });
    await connectSocket();
    return user;
  },

  register: async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    const { user, token } = res.data;
    await SecureStore.setItemAsync('kindred_token', token);
    set({ user, token, isAuthenticated: true });
    await connectSocket();
    return user;
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  logout: async () => {
    await SecureStore.deleteItemAsync('kindred_token');
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
