import { Repeat } from 'lucide-react';

export default {
  type: 'weekly_sessions', name: 'Weekly session', icon: Repeat, nav: 'Content',
  fields: [
    { key: 'title', label: 'Session name', type: 'text', required: true },
    { key: 'topic', label: 'Topic', type: 'select', options: ['Programming', 'Web development', 'Competitive programming', 'AI & machine learning', 'Design', 'Cyber security', 'Other'], allowOther: true },
    { key: 'day', label: 'Day', type: 'select', options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
    { key: 'time', label: 'Time (for example 4:00 PM)', type: 'text' },
    { key: 'place', label: 'Room / place', type: 'text' },
    { key: 'note', label: 'Short note (who it is for)', type: 'text' },
    { key: 'sort_order', label: 'Order (1 shows first)', type: 'number' },
    { key: 'active', label: 'Show on the website and app', type: 'checkbox' },
  ],
  cols: ['title', 'topic', 'day', 'time'],
};
