// Copy this file to e.g. sponsors.js (remove the leading underscore). It adds a full admin section:
// sidebar link, list with search, add/edit drawer, delete-to-Trash with Undo.
import { Handshake } from 'lucide-react';

export default {
  type: 'sponsors',            // must match the server feature's "table"
  name: 'Sponsor',
  icon: Handshake,
  nav: 'Content',              // sidebar group: Overview | People | Content | System
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'tier', label: 'Tier', type: 'select', options: ['Gold', 'Silver', 'Bronze'] },
    { key: 'logo_url', label: 'Logo', type: 'image' },
  ],
  cols: ['name', 'tier', 'website'],
};
