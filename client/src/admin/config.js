import { Calendar, Bell, Users, Image, Trophy, FileText } from 'lucide-react';

export const TYPES = {
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
        'General Executive', 'General Member', 'Department Ambassador',
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
