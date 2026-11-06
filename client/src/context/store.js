import { create } from 'zustand';
import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bauet-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 'light' | 'dark' | 'system' (follows the phone or computer setting)
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const resolveTheme = (t) => (t === 'system' ? (media && media.matches ? 'dark' : 'light') : t === 'dark' ? 'dark' : 'light');
const savedTheme = (() => { try { const t = localStorage.getItem('bauet-theme'); return t === 'dark' || t === 'system' ? t : 'light'; } catch { return 'light'; } })();

const savedLang = (() => { try { return localStorage.getItem('bauet-lang') === 'bn' ? 'bn' : 'en'; } catch { return 'en'; } })();
if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', savedLang);

const useStore = create((set, get) => ({
  events: [],
  notices: [],
  members: [],
  gallery: [],
  achievements: [],
  projects: [],
  faqs: [],
  sponsors: [],
  subscribers: [],
  posts: [],
  messages: [],
  registrations: [],
  trash: { items: [], retentionDays: 30 },
  sessions: [],
  settings: null,
  user: null,
  loading: true,
  theme: savedTheme,
  resolvedTheme: resolveTheme(savedTheme),
  lang: savedLang,
  setLang: (lang) => {
    const l = lang === 'bn' ? 'bn' : 'en';
    try { localStorage.setItem('bauet-lang', l); } catch { /* storage blocked */ }
    document.documentElement.setAttribute('lang', l);
    set({ lang: l });
  },
  adminTheme: localStorage.getItem('bauet-admin-theme') || 'light',
  setAdminTheme: (adminTheme) => {
    localStorage.setItem('bauet-admin-theme', adminTheme);
    set({ adminTheme });
  },

  setTheme: (theme) => {
    try { localStorage.setItem('bauet-theme', theme); } catch { /* storage blocked: the choice lasts until reload */ }
    const resolvedTheme = resolveTheme(theme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    set({ theme, resolvedTheme });
  },

  fetchAll: async (fresh = false) => {
    const q = fresh ? { params: { _: Date.now() } } : undefined;
    try {
      let all = null;
      try { all = (await api.get('/bootstrap', q)).data; } catch { /* older server: use the separate requests below */ }
      if (all) {
        set({ events: all.events || [], notices: all.notices || [], members: all.members || [], gallery: all.gallery || [], achievements: all.achievements || [], projects: all.projects || [], faqs: all.faqs || [], sponsors: all.sponsors || [], ...(all.settings ? { settings: all.settings } : {}), loading: false });
        return;
      }
      const [events, notices, members, gallery, achievements, settings, projects, faqs, sponsors] = await Promise.all([
        api.get('/events', q).catch(() => ({ data: [] })),
        api.get('/notices', q).catch(() => ({ data: [] })),
        api.get('/members', q).catch(() => ({ data: [] })),
        api.get('/gallery', q).catch(() => ({ data: [] })),
        api.get('/achievements', q).catch(() => ({ data: [] })),
        api.get('/settings', q).catch(() => ({ data: null })),
        api.get('/projects', q).catch(() => ({ data: [] })),
        api.get('/faqs', q).catch(() => ({ data: [] })),
        api.get('/sponsors', q).catch(() => ({ data: [] })),
      ]);
      set({
        events: events.data,
        notices: notices.data,
        members: members.data,
        gallery: gallery.data,
        achievements: achievements.data,
        projects: projects.data,
        faqs: faqs.data,
        sponsors: sponsors.data,
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

  fetchList: async (type) => {
    // the admin always wants fresh rows, never the 30s public cache
    const res = await api.get(`/${type}`, { params: { _: Date.now() } });
    set({ [type]: res.data });
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
    const res = await api.get('/messages', { params: { _: Date.now() } });
    set({ messages: res.data });
  },

  chatWithAI: async (message, history) => {
    const res = await api.post('/chat', { message, history });
    return res.data.reply;
  },

  submitRegistration: async (data) => {
    const res = await api.post('/registrations', data);
    return res.data;
  },

  uploadApplicantPhoto: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post('/registrations/photo', formData);
    return res.data.url;
  },

  fetchSessions: async () => {
    const res = await api.get('/committees', { params: { _: Date.now() } });
    set({ sessions: res.data });
  },

  launchCommittee: async (payload) => {
    const res = await api.post('/committees/launch', payload);
    await Promise.all([get().fetchSessions(), get().fetchList('members')]);
    return res.data;
  },

  deleteCommittee: async (session) => {
    const res = await api.delete(`/committees/${encodeURIComponent(session)}`);
    await Promise.all([get().fetchSessions(), get().fetchList('members'), get().fetchTrash()]);
    return res.data;
  },

  transferPeople: async (payload) => {
    const res = await api.post('/committees/transfer', payload);
    await Promise.all([get().fetchSessions(), get().fetchList('members')]);
    return res.data;
  },

  demoStatus: async () => (await api.get('/committees/demo')).data.count,

  loadDemo: async () => {
    const res = await api.post('/committees/demo');
    await Promise.all([get().fetchAll(true), get().fetchSessions(), get().fetchRegistrations()]);
    return res.data;
  },

  removeDemo: async () => {
    const res = await api.delete('/committees/demo');
    await Promise.all([get().fetchAll(true), get().fetchSessions(), get().fetchRegistrations()]);
    return res.data;
  },

  fetchTrash: async () => {
    const res = await api.get('/trash', { params: { _: Date.now() } });
    set({ trash: res.data });
  },

  restoreTrash: async (type, id) => {
    await api.post(`/trash/${type}/${id}/restore`);
    set((s) => ({ trash: { ...s.trash, items: s.trash.items.filter((i) => !(i.type === type && i.id === id)) } }));
    // bring the restored row back into its list
    if (type === 'registrations') await get().fetchRegistrations();
    else if (type === 'messages') await get().fetchMessages();
    else await get().fetchList(type);
  },

  purgeTrash: async (type, id) => {
    await api.delete(`/trash/${type}/${id}`);
    set((s) => ({ trash: { ...s.trash, items: s.trash.items.filter((i) => !(i.type === type && i.id === id)) } }));
  },

  emptyTrash: async () => {
    const res = await api.delete('/trash');
    set((s) => ({ trash: { ...s.trash, items: [] } }));
    return res.data.count;
  },

  fetchRegistrations: async () => {
    const res = await api.get('/registrations', { params: { _: Date.now() } });
    set({ registrations: res.data });
  },

  setRegistrationStatus: async (id, status) => {
    const res = await api.patch(`/registrations/${id}/status`, { status });
    set((s) => ({ registrations: s.registrations.map((r) => (r.id === id ? res.data : r)) }));
  },

  setRegistrationPost: async (id, post) => {
    const res = await api.patch(`/registrations/${id}/post`, { post });
    set((s) => ({ registrations: s.registrations.map((r) => (r.id === id ? res.data : r)) }));
  },

  deleteRegistration: async (id) => {
    await api.delete(`/registrations/${id}`);
    set((s) => ({ registrations: s.registrations.filter((r) => r.id !== id) }));
  },

  selectRegistration: async (id, payload) => {
    const res = await api.post(`/registrations/${id}/select`, payload);
    set((s) => ({
      registrations: s.registrations.map((r) => (r.id === id ? res.data.registration : r)),
      members: [...s.members, res.data.member],
    }));
    return res.data;
  },

  login: async (username, password, code) => {
    const res = await api.post('/auth/login', { username, password, ...(code ? { code } : {}) });
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

  uploadImage: async (file, kind = 'cover', where = {}) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/upload', formData, { params: { kind, ...where } });
    return res.data.url;
  },
}));

// when the phone switches between light and dark (sunset, a schedule, the user), follow it if the visitor chose "auto"
if (media) {
  const follow = () => { if (useStore.getState().theme === 'system') useStore.setState({ resolvedTheme: resolveTheme('system') }); };
  if (media.addEventListener) media.addEventListener('change', follow); else if (media.addListener) media.addListener(follow);
}

export default useStore;
