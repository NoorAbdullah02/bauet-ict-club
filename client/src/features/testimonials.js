import { Quote } from 'lucide-react';

export default {
  type: 'testimonials', name: 'Testimonial', icon: Quote, nav: 'Content',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'role', label: 'Job or role (Software Engineer @ Tech Co.)', type: 'text' },
    { key: 'batch', label: 'Batch and post (ICE 7th Batch, Ex-President)', type: 'text' },
    { key: 'quote', label: 'What they said', type: 'textarea', required: true },
    { key: 'rating', label: 'Stars (1–5)', type: 'select', options: ['5', '4', '3', '2', '1'] },
    { key: 'image_url', label: 'Photo', type: 'image', kind: 'avatar' },
    { key: 'sort_order', label: 'Order (1 shows first)', type: 'number' },
    { key: 'active', label: 'Show on the website', type: 'checkbox' },
  ],
  cols: ['name', 'role', 'batch'],
};
