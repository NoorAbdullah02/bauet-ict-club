import { GraduationCap } from 'lucide-react';

export default {
  type: 'advisors', name: 'Advisor', icon: GraduationCap, nav: 'Content',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'designation', label: 'Role in the club (write it: Chief Advisor, Assistant Advisor...)', type: 'text', placeholder: 'Assistant Advisor' },
    { key: 'rank_title', label: 'Title (for example Associate Professor)', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'email', label: 'E-mail (optional)', type: 'text' },
    { key: 'phone', label: 'Phone (optional)', type: 'text' },
    { key: 'image_url', label: 'Photo (a square photo shows best on the card)', type: 'image', kind: 'avatar' },
    { key: 'sort_order', label: 'Order (1 shows first)', type: 'number' },
  ],
  cols: ['name', 'designation', 'department'],
};
