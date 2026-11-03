import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Calendar, Bell, Users, Image, Trophy, FileText, MessageSquare, Settings, Plus, Pencil, Trash2, Share2, Eye, EyeOff, Upload, Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../context/store';

const TYPES = {
  events: {
    name: 'Event', icon: Calendar,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['Workshop', 'Competition', 'Seminar', 'Social', 'Other'] },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'featured', label: 'Featured', type: 'checkbox' },
      { key: 'image_url', label: 'Image', type: 'image' },
    ],
    cols: ['title', 'date', 'category', 'featured'],
  },
  notices: {
    name: 'Notice', icon: Bell,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'content', label: 'Content', type: 'textarea', required: true },
      { key: 'priority', label: 'Priority', type: 'select', options: ['urgent', 'normal', 'low'] },
      { key: 'pinned', label: 'Pinned', type: 'checkbox' },
    ],
    cols: ['title', 'date', 'priority', 'pinned'],
  },
  members: {
    name: 'Member', icon: Users,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'position', label: 'Position', type: 'select', options: [
        'President', 'Vice President',
        'General Secretary', 'Asst. General Secretary', 'Joint Secretary',
        'Organizing Secretary', 'Treasurer',
        'Chief Executive (HR)', 'Chief Executive (Logistics)', 'Chief Executive (Development)',
        'Chief Executive (Event Planning)', 'Chief Executive (Public Relations)',
        'Chief Executive (Cultural)', 'Chief Executive (Media)',
        'Executive (HR)', 'Executive (Logistics)', 'Executive (Development)',
        'Executive (Event Planning)', 'Executive (Public Relations)',
        'Executive (Cultural)', 'Executive (Media)', 'Executive (Photography)',
        'General Executive', 'General Member',
      ], required: true },
      { key: 'department', label: 'Department', type: 'select', options: [
        'ICE - Information & Communication Engineering',
        'CSE - Computer Science & Engineering',
        'EEE - Electrical & Electronic Engineering',
        'CE - Civil Engineering',
        'ME - Mechanical Engineering',
        'BBA - Business Administration',
        'LLB - Bachelor of Laws',
        'ELL - English Language & Literature',
      ] },
      { key: 'batch', label: 'Batch', type: 'text' },
      { key: 'committee_session', label: 'Committee Session', type: 'select', options: [
        'Summer 2026', 'Winter 2025', 'Session 2023-24', 'Session 2022-23',
      ] },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'image_url', label: 'Photo', type: 'image' },
      { key: 'social_fb', label: 'Facebook URL', type: 'text' },
      { key: 'social_gh', label: 'GitHub URL', type: 'text' },
      { key: 'social_li', label: 'LinkedIn URL', type: 'text' },
    ],
    cols: ['name', 'position', 'department', 'batch'],
  },
  gallery: {
    name: 'Photo', icon: Image,
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['Events', 'Workshops', 'Competitions', 'Campus', 'Team', 'Other'] },
      { key: 'image_url', label: 'Image', type: 'image', required: true },
      { key: 'date', label: 'Date', type: 'date' },
    ],
    cols: ['title', 'category', 'date'],
  },
  achievements: {
    name: 'Achievement', icon: Trophy,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    cols: ['title', 'date'],
  },
  posts: {
    name: 'Post', icon: FileText,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'content', label: 'Content', type: 'textarea', required: true },
      { key: 'image_url', label: 'Image', type: 'image' },
    ],
    cols: ['title'],
  },
};

function Field({ field, value, onChange, onImageUpload, uploading }) {
  const baseInput = {
    padding: '12px 16px', borderRadius: 'var(--radius-xs)',
    background: 'var(--bg-alt)', border: '1px solid var(--border)',
    color: 'var(--fg)', fontSize: 14, width: '100%', outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
  };

  if (field.type === 'textarea') return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
      <textarea style={{ ...baseInput, resize: 'vertical', minHeight: 100 }} value={value || ''} onChange={(e) => onChange(field.key, e.target.value)} required={field.required} />
    </div>
  );
  if (field.type === 'select') return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
      <select style={baseInput} value={value || ''} onChange={(e) => onChange(field.key, e.target.value)}>
        <option value="">Select...</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  if (field.type === 'checkbox') return (
    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(field.key, e.target.checked)} id={`f_${field.key}`} />
      <label htmlFor={`f_${field.key}`} style={{ fontSize: 14 }}>{field.label}</label>
    </div>
  );
  if (field.type === 'image') return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <button type="button" onClick={() => onImageUpload(field.key)} disabled={uploading}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.5 : 1 }}>
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {value && <img src={value} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />}
      </div>
      <input style={baseInput} placeholder="Or paste image URL" value={value || ''} onChange={(e) => onChange(field.key, e.target.value)} />
    </div>
  );
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
      <input style={baseInput} type={field.type || 'text'} value={value || ''} onChange={(e) => onChange(field.key, e.target.value)} required={field.required} />
    </div>
  );
}

export default function AdminPanel({ open, onClose }) {
  const store = useStore();
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const isLoggedIn = !!store.user;

  useEffect(() => {
    if (view === 'settings' && !settingsForm && store.settings) setSettingsForm({ ...store.settings });
  }, [view, store.settings]);

  useEffect(() => {
    if (open) store.fetchMessages?.();
  }, [open]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      await store.login(loginForm.username, loginForm.password);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setLoginError('Invalid username or password');
    }
    setLoggingIn(false);
  };

  const onChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleImageUpload = async (key) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      setUploading(true);
      try {
        const url = await store.uploadImage(file);
        setForm((p) => ({ ...p, [key]: url }));
        toast.success('Image uploaded!');
      } catch (e) { toast.error('Upload failed'); }
      setUploading(false);
    };
    input.click();
  };

  const save = async () => {
    if (!modal) return;
    const { type, mode, id } = modal;
    try {
      if (mode === 'add') await store.addItem(type, form);
      else await store.updateItem(type, id, form);
      toast.success(`${mode === 'add' ? 'Added' : 'Updated'} successfully!`);
      setModal(null);
    } catch (e) { toast.error('Error: ' + (e.response?.data?.error || e.message)); }
  };

  const del = async (type, id) => {
    try { await store.deleteItem(type, id); toast.success('Deleted!'); }
    catch (e) { toast.error('Error: ' + e.message); }
  };

  const navItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'events', icon: Calendar, label: 'Events' },
    { key: 'notices', icon: Bell, label: 'Notices' },
    { key: 'members', icon: Users, label: 'Members' },
    { key: 'gallery', icon: Image, label: 'Gallery' },
    { key: 'achievements', icon: Trophy, label: 'Achievements' },
    { key: 'posts', icon: FileText, label: 'Posts' },
    { key: 'messages', icon: MessageSquare, label: 'Messages' },
    { key: 'settings', icon: Settings, label: 'Settings' },
  ];

  const renderTable = (type) => {
    const cfg = TYPES[type];
    const items = store[type] || [];
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <cfg.icon size={24} /> {cfg.name}s
          </h2>
          <button onClick={() => { setForm({}); setModal({ type, mode: 'add' }); }}
            style={{ padding: '10px 24px', borderRadius: 'var(--radius-xs)', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add {cfg.name}
          </button>
        </div>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--fg-muted)' }}>
            <p>No {cfg.name.toLowerCase()}s yet. Click &quot;Add&quot; to create one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {cfg.cols.map((c) => (
                    <th key={c} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-muted)', borderBottom: '2px solid var(--border)', background: 'var(--bg-alt)' }}>{c}</th>
                  ))}
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-muted)', borderBottom: '2px solid var(--border)', background: 'var(--bg-alt)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    {cfg.cols.map((c) => (
                      <td key={c} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--fg-secondary)' }}>
                        {typeof item[c] === 'boolean' ? (item[c] ? '✓' : '—') : String(item[c] || '—')}
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setForm({ ...item }); setModal({ type, mode: 'edit', id: item.id }); }}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--tech-light)', color: 'var(--tech)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => del(type, item.id)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', display: 'flex', overflow: 'hidden' }}
        >
          {!isLoggedIn ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <div style={{ width: '100%', maxWidth: 380 }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 8, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                  <X size={18} />
                </button>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, var(--accent), #B89530)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)',
                  }}>ICT</div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Admin Login</h2>
                  <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>BAUET ICT Club Dashboard</p>
                </div>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>Username</label>
                    <input style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 14, width: '100%', outline: 'none' }}
                      value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required autoFocus />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
                    <input type="password" style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 14, width: '100%', outline: 'none' }}
                      value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
                  </div>
                  {loginError && <div style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center' }}>{loginError}</div>}
                  <button type="submit" disabled={loggingIn}
                    style={{ padding: '13px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff', opacity: loggingIn ? 0.6 : 1, marginTop: 4 }}>
                    {loggingIn ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center', marginTop: 20 }}>
                  Default: admin / bauet@ict2026
                </p>
              </div>
            </div>
          ) : (<>
          <div style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto', width: 260, minWidth: 260, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Admin Panel</h3>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {navItems.map((n) => (
                <button key={n.key} onClick={() => setView(n.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 'var(--radius-xs)', fontSize: 14, fontWeight: 500, textAlign: 'left',
                    color: view === n.key ? 'var(--accent)' : 'var(--fg-secondary)',
                    background: view === n.key ? 'var(--accent-light)' : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                  <n.icon size={18} /> {n.label}
                </button>
              ))}
            </div>
            <button onClick={() => { store.logout(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-xs)', fontSize: 13, fontWeight: 500, color: 'var(--danger)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 16, width: '100%' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>

          <div style={{ padding: 28, overflowY: 'auto', flex: 1, minWidth: 0 }}>
            {view === 'dashboard' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 24, fontFamily: 'var(--font-display)', fontWeight: 700 }}>Dashboard</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    ['Events', store.events.length, Calendar],
                    ['Notices', store.notices.length, Bell],
                    ['Members', store.members.length, Users],
                    ['Gallery', store.gallery.length, Image],
                    ['Messages', store.messages.filter((m) => !m.is_read).length + ' unread', MessageSquare],
                  ].map(([label, value, Icon]) => (
                    <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={16} /> {label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'messages' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 24, fontFamily: 'var(--font-display)', fontWeight: 700 }}>Messages</h2>
                {store.messages.length === 0 ? <p style={{ color: 'var(--fg-muted)' }}>No messages yet.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {store.messages.map((m) => (
                      <div key={m.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <strong style={{ fontSize: 15 }}>{m.name}</strong>
                          <span className={`badge ${m.is_read ? 'badge-success' : 'badge-danger'}`}>{m.is_read ? 'Read' : 'New'}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 6 }}>{m.email} · {m.subject || '—'}</div>
                        <p style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.6 }}>{m.message}</p>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <button onClick={() => store.updateItem('messages', m.id, { is_read: !m.is_read })}
                            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--tech-light)', color: 'var(--tech)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {m.is_read ? <EyeOff size={12} /> : <Eye size={12} />} {m.is_read ? 'Unread' : 'Read'}
                          </button>
                          <button onClick={() => del('messages', m.id)}
                            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'settings' && settingsForm && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Site Settings</h2>
                  <button onClick={async () => {
                    try { await store.updateSettings(settingsForm); toast.success('Settings saved!'); }
                    catch (e) { toast.error('Error saving'); }
                  }} style={{ padding: '10px 24px', borderRadius: 'var(--radius-xs)', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Save size={16} /> Save
                  </button>
                </div>
                <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[['heroTitle', 'Hero Title', 'text'], ['heroSub', 'Hero Subtitle', 'text'], ['aboutText', 'About Text', 'textarea'], ['mission', 'Mission', 'textarea'], ['vision', 'Vision', 'textarea'], ['goal', 'Goal', 'textarea']].map(([key, label, type]) => (
                    <div key={key}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
                      {type === 'textarea' ? (
                        <textarea style={{ padding: '12px 16px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 14, width: '100%', resize: 'vertical', minHeight: 80, outline: 'none', fontFamily: 'var(--font-body)' }}
                          value={settingsForm[key] || ''} onChange={(e) => setSettingsForm((p) => ({ ...p, [key]: e.target.value }))} />
                      ) : (
                        <input style={{ padding: '12px 16px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 14, width: '100%', outline: 'none' }}
                          value={settingsForm[key] || ''} onChange={(e) => setSettingsForm((p) => ({ ...p, [key]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                  <h3 style={{ marginTop: 16, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Social Links</h3>
                  {[['fb', 'Facebook URL'], ['email', 'Email'], ['phone', 'Phone']].map(([key, label]) => (
                    <div key={key}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
                      <input style={{ padding: '12px 16px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-alt)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 14, width: '100%', outline: 'none' }}
                        value={settingsForm.socialLinks?.[key] || ''} onChange={(e) => setSettingsForm((p) => ({ ...p, socialLinks: { ...p.socialLinks, [key]: e.target.value } }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {TYPES[view] && renderTable(view)}
          </div>

          <AnimatePresence>
            {modal && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
                style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
              >
                <motion.div
                  initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.96 }}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      {modal.mode === 'add' ? 'Add' : 'Edit'} {TYPES[modal.type]?.name}
                    </h3>
                    <button onClick={() => setModal(null)} style={{ color: 'var(--fg-muted)' }}><X size={20} /></button>
                  </div>
                  <div style={{ padding: 24 }}>
                    {TYPES[modal.type]?.fields.map((f) => (
                      <Field key={f.key} field={f} value={form[f.key]} onChange={onChange} onImageUpload={handleImageUpload} uploading={uploading} />
                    ))}
                  </div>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 'var(--radius-xs)', fontSize: 14, fontWeight: 500, background: 'var(--bg-alt)', color: 'var(--fg-secondary)' }}>Cancel</button>
                    <button onClick={save} style={{ padding: '10px 24px', borderRadius: 'var(--radius-xs)', fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}>Save</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
