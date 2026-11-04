import { Mail } from 'lucide-react';

export default {
  type: 'subscribers', name: 'Subscriber', icon: Mail, nav: 'System',
  fields: [{ key: 'email', label: 'Email', type: 'text', required: true }],
  cols: ['email', 'created_at'],
};
