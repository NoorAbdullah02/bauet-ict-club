import { Calendar, Bell, Users, Image, Trophy, FileText } from 'lucide-react';

const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
export const BATCHES = Array.from({ length: 24 }, (_, i) => ordinal(i + 6));
const DEPTS = [['ICE', 'ICE — Information & Communication Eng.'], ['CSE', 'CSE — Computer Science & Eng.'], ['EEE', 'EEE — Electrical & Electronic Eng.'], ['CE', 'CE — Civil Eng.'], ['ME', 'ME — Mechanical Eng.'], ['BBA', 'BBA — Business Administration'], ['LLB', 'LLB — Bachelor of Laws'], ['ELL', 'ELL — English Language & Literature']];

export const TYPES = {
  events: {
    name: 'Event', icon: Calendar,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['Workshop', 'Competition', 'Seminar', 'Hackathon', 'Social'], allowOther: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'featured', label: 'Featured', type: 'checkbox' },
      { key: 'image_url', label: 'Image', type: 'image' },
      { key: 'reg_open', label: 'Registration open', type: 'checkbox' },
      { key: 'capacity', label: 'Seats (leave 0 for unlimited)', type: 'number' },
      { key: 'reg_url', label: 'Own registration form link (optional, e.g. Google Form)', type: 'text' },
      { key: 'publish_at', label: 'When to publish', type: 'publish' },
      { key: 'is_draft', type: 'hidden' },
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
      { key: 'image_url', label: 'Picture (optional)', type: 'image' },
      { key: 'publish_at', label: 'When to publish', type: 'publish' },
      { key: 'is_draft', type: 'hidden' },
    ],
    cols: ['title', 'date', 'priority', 'pinned'],
  },
  members: {
    name: 'Member', icon: Users,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'position', label: 'Position', type: 'select', options: [
        'President', 'Vice President (Administration)', 'Vice President (Technical)',
        'General Secretary', 'Asst. General Secretary', 'Joint Secretary',
        'Organizing Secretary', 'Treasurer',
        'Chief Executive (HR)', 'Chief Executive (Logistics)', 'Chief Executive (Development)',
        'Chief Executive (Event Planning)', 'Chief Executive (Public Relations)',
        'Chief Executive (Cultural)', 'Chief Executive (Media)',
        'Executive (HR)', 'Executive (Logistics)', 'Executive (Development)',
        'Executive (Event Planning)', 'Executive (Public Relations)',
        'Executive (Cultural)', 'Executive (Media)', 'Executive (Photography)',
        'General Executive', 'General Member', 'Department Ambassador',
      ], required: true },
      { key: 'department', label: 'Department', type: 'select', options: DEPTS.map(([value, label]) => ({ value, label })) },
      { key: 'batch', label: 'Batch', type: 'select', options: BATCHES },
      { key: 'committee_session', label: 'Committee Session', type: 'select', options: [], dynamic: 'sessions', required: true },
      { key: 'display_order', label: 'Display Order', type: 'number' },
      { key: 'image_url', label: 'Photo', type: 'image', kind: 'avatar' },
      { key: 'social_fb', label: 'Facebook URL', type: 'text' },
      { key: 'social_gh', label: 'GitHub URL', type: 'text' },
      { key: 'social_li', label: 'LinkedIn URL', type: 'text' },
    ],
    cols: ['name', 'position', 'department', 'batch', 'committee_session'],
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
      { key: 'image_url', label: 'Picture (optional)', type: 'image' },
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

// drop-in admin sections: every client/src/features/*.js (not starting with "_") becomes a full admin page
export const FEATURES = Object.values(import.meta.glob(['../features/*.js', '!../features/_*.js'], { eager: true })).map((m) => m.default);
FEATURES.forEach((f) => { TYPES[f.type] = f; });
