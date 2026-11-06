import { Briefcase } from 'lucide-react';

export default {
  type: 'jobs', name: 'Job', icon: Briefcase, nav: 'Content',
  fields: [
    { key: 'title', label: 'Job title', type: 'text', required: true },
    { key: 'company', label: 'Company', type: 'text' },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Job', 'Internship', 'Part-time', 'Freelance', 'Training'] },
    { key: 'work_mode', label: 'Work mode', type: 'select', options: ['On-site', 'Remote', 'Hybrid'] },
    { key: 'location', label: 'Where (city, office)', type: 'text' },
    { key: 'salary', label: 'Pay (optional, e.g. 15,000 BDT a month)', type: 'text' },
    { key: 'description', label: 'About the job and what is needed', type: 'textarea' },
    { key: 'apply_url', label: 'Apply link (https://…)', type: 'text' },
    { key: 'apply_email', label: 'Or apply by e-mail', type: 'text' },
    { key: 'deadline', label: 'Apply before', type: 'date' },
    { key: 'image_url', label: 'Company logo (optional)', type: 'image', kind: 'logo' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
    { key: 'publish_at', label: 'When to publish', type: 'publish' },
    { key: 'is_draft', type: 'hidden' },
  ],
  cols: ['title', 'company', 'kind', 'deadline'],
};
