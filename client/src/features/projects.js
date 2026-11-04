import { Rocket } from 'lucide-react';

export default {
  type: 'projects', name: 'Project', icon: Rocket, nav: 'Content',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'summary', label: 'Summary', type: 'textarea' },
    { key: 'tech', label: 'Tech stack (comma separated)', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Completed', 'Planning'] },
    { key: 'team', label: 'Team', type: 'text' },
    { key: 'live_url', label: 'Live link', type: 'text' },
    { key: 'repo_url', label: 'Source code link', type: 'text' },
    { key: 'image_url', label: 'Image', type: 'image' },
  ],
  cols: ['title', 'status', 'tech'],
};
