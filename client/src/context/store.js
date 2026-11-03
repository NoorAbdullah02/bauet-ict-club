import { create } from 'zustand';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bauet-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const useStore = create((set, get) => ({
  events: [],
  notices: [],
  members: [],
  gallery: [],
  achievements: [],
  posts: [],
  messages: [],
  settings: null,
  user: null,
  loading: true,
  theme: localStorage.getItem('bauet-theme') || 'light',

  setTheme: (theme) => {
    localStorage.setItem('bauet-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  fetchAll: async () => {
    try {
      const [events, notices, members, gallery, achievements, settings] = await Promise.all([
        api.get('/events').catch(() => ({ data: [] })),
        api.get('/notices').catch(() => ({ data: [] })),
        api.get('/members').catch(() => ({ data: [] })),
        api.get('/gallery').catch(() => ({ data: [] })),
        api.get('/achievements').catch(() => ({ data: [] })),
        api.get('/settings').catch(() => ({ data: null })),
      ]);
      set({
        events: events.data,
        notices: notices.data,
        members: members.data,
        gallery: gallery.data,
        achievements: achievements.data,
        settings: settings.data || {
          heroTitle: 'BAUET ICT CLUB',
          heroSub: 'Where Technology Meets Innovation',
          aboutText: 'BAUET ICT Club is the premier technology club of Bangladesh Army University of Engineering & Technology, Rajshahi.',
          mission: 'To foster a culture of innovation and technological excellence among BAUET students.',
          vision: 'To become the leading university tech community in Bangladesh.',
          goal: 'Bridge the gap between academic knowledge and real-world technology.',
          socialLinks: { fb: 'https://www.facebook.com/bauetictclub', email: 'ictclubbauet@gmail.com', phone: '01707-533471' },
        },
        loading: false,
      });
    } catch (e) {
      set({ loading: false });
    }
  },

  addItem: async (type, data) => {
    const res = await api.post(`/${type}`, data);
    set((s) => ({ [type]: [...s[type], res.data] }));
    return res.data;
  },

  updateItem: async (type, id, data) => {
    const res = await api.put(`/${type}/${id}`, data);
    set((s) => ({ [type]: s[type].map((i) => (i.id === id ? res.data : i)) }));
    return res.data;
  },

  deleteItem: async (type, id) => {
    await api.delete(`/${type}/${id}`);
    set((s) => ({ [type]: s[type].filter((i) => i.id !== id) }));
  },

  updateSettings: async (data) => {
    const res = await api.put('/settings', data);
    set({ settings: res.data });
  },

  sendMessage: async (data) => {
    const res = await api.post('/messages', data);
    return res.data;
  },

  fetchMessages: async () => {
    const res = await api.get('/messages');
    set({ messages: res.data });
  },

  chatWithAI: async (message, history) => {
    const res = await api.post('/chat', { message, history });
    return res.data.reply;
  },

  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('bauet-token', res.data.token);
    set({ user: res.data.user });
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('bauet-token');
    set({ user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('bauet-token');
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data });
    } catch {
      localStorage.removeItem('bauet-token');
    }
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/upload', formData);
    return res.data.url;
  },
}));

export default useStore;
