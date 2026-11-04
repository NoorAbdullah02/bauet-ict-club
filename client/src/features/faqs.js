import { HelpCircle } from 'lucide-react';

export default {
  type: 'faqs', name: 'FAQ', icon: HelpCircle, nav: 'Content',
  fields: [
    { key: 'question', label: 'Question', type: 'text', required: true },
    { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    { key: 'sort_order', label: 'Order (1 shows first)', type: 'number' },
  ],
  cols: ['question', 'sort_order'],
};
