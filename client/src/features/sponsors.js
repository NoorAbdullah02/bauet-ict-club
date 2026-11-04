import { Handshake } from 'lucide-react';

export default {
  type: 'sponsors', name: 'Sponsor', icon: Handshake, nav: 'Content',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'tier', label: 'Tier', type: 'select', options: ['Gold', 'Silver', 'Bronze', 'Partner'] },
    { key: 'logo_url', label: 'Logo', type: 'image' },
    { key: 'sort_order', label: 'Order (1 shows first)', type: 'number' },
  ],
  cols: ['name', 'tier', 'website'],
};
