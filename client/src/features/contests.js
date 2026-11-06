import { Swords } from 'lucide-react';

export default {
  type: 'contests', name: 'Contest', icon: Swords, nav: 'Content',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'About the contest', type: 'textarea' },
    { key: 'rules', label: 'Rules (one per line)', type: 'textarea' },
    { key: 'prize', label: 'Prizes', type: 'text' },
    { key: 'location', label: 'Where', type: 'text' },
    { key: 'start_date', label: 'Starts on', type: 'date' },
    { key: 'deadline', label: 'Sign-up deadline', type: 'date' },
    { key: 'team_min', label: 'Smallest team (people)', type: 'number' },
    { key: 'team_max', label: 'Biggest team (people)', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['open', 'closed', 'finished'] },
    { key: 'image_url', label: 'Picture (optional)', type: 'image' },
  ],
  cols: ['title', 'deadline', 'status'],
};
