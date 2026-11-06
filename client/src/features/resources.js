import { Library } from 'lucide-react';

export default {
  type: 'resources', name: 'Resource', icon: Library, nav: 'Content',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Short description', type: 'textarea' },
    { key: 'category', label: 'Category (for example Web, AI, Career)', type: 'text' },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Slides', 'Notes', 'Tutorial', 'Video', 'Code', 'Link'] },
    { key: 'url', label: 'Link (https://…)', type: 'text', required: true },
  ],
  cols: ['title', 'category', 'kind'],
};
