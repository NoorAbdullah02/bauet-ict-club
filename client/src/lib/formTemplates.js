import { BATCH_LIST, DEPT_LIST } from './forms';

const name = { id: 'name', key: 'name', type: 'short', label: 'Full name', required: true };
const sid = { id: 'student_id', key: 'student_id', type: 'short', label: 'Student ID', required: true };
const email = { id: 'email', key: 'email', type: 'email', label: 'Email', required: true };
const phone = { id: 'phone', key: 'phone', type: 'phone', label: 'Mobile number', required: true };
const dept = { id: 'department', key: 'department', type: 'dropdown', label: 'Department', required: true, options: DEPT_LIST };
const batch = { id: 'batch', key: 'batch', type: 'dropdown', label: 'Batch', required: true, options: BATCH_LIST };

/** Ready-made forms. "color" is only for the card in the gallery. */
export const TEMPLATES = [
  { key: 'event', icon: 'ticket', color: '#1f4fd8', name: 'Event sign-up', desc: 'Name, ID, department, batch and contact. One sign-up per email.',
    form: { intro: 'Fill in your details to reserve your seat.', confirmation: 'Thank you! You are registered. See you there.', unique: 'email', fields: [name, sid, dept, batch, email, { ...phone, required: false }] } },
  { key: 'feedback', icon: 'star', color: '#c2410c', name: 'Workshop feedback', desc: 'A rating, what was best, what to improve and a yes/no.',
    form: { intro: 'Two minutes to help us make the next one better.', confirmation: 'Thank you for your feedback!', fields: [
      { id: 'rating', type: 'scale', label: 'How was the session overall?', required: true, scale: { max: 5, low: 'Poor', high: 'Excellent' } },
      { id: 'best', type: 'long', label: 'What did you like the most?' },
      { id: 'improve', type: 'long', label: 'What should we improve?' },
      { id: 'again', type: 'yesno', label: 'Would you join another session?', required: true },
      { id: 'topics', type: 'checkbox', label: 'Which topics next?', options: ['Web', 'AI / ML', 'Robotics', 'Cyber security', 'Design', 'Competitive programming'], allowOther: true, minSel: 1 },
    ] } },
  { key: 'member', icon: 'users', color: '#0b7f58', name: 'Club membership', desc: 'Two pages: about you, then interests and why you want to join.',
    form: { intro: 'Join the BAUET ICT Club.', confirmation: 'Your application is received. We will contact you soon.', unique: 'email', fields: [
      { ...name }, { ...sid }, { ...dept }, { ...batch }, { ...email }, { ...phone },
      { id: 'p2', type: 'section', label: 'Your interests', page: true, help: 'Tell us what you enjoy.' },
      { id: 'interests', type: 'checkbox', label: 'What are you interested in?', options: ['Programming', 'Web development', 'AI / ML', 'Robotics / IoT', 'Networking', 'Graphics / Design', 'Event management'], allowOther: true, required: true, minSel: 1 },
      { id: 'why', type: 'long', label: 'Why do you want to join?', required: true, minLen: 20 },
      { id: 'photo', type: 'photo', label: 'Your photo' },
    ] } },
  { key: 'volunteer', icon: 'hand', color: '#7c3aed', name: 'Volunteer sign-up', desc: 'Role, free time and any experience.',
    form: { intro: 'Help us run the next event.', confirmation: 'Thank you for volunteering!', unique: 'email', fields: [
      name, sid, phone, email,
      { id: 'role', type: 'radio', label: 'Where would you like to help?', required: true, options: ['Registration desk', 'Logistics', 'Photography', 'Hosting / stage', 'Social media'], allowOther: true },
      { id: 'when', type: 'checkbox', label: 'When are you free?', options: ['Morning', 'Afternoon', 'Evening'], required: true },
      { id: 'exp', type: 'long', label: 'Any experience? (optional)' },
    ] } },
  { key: 'team', icon: 'trophy', color: '#be123c', name: 'Contest team entry', desc: 'Team name and up to three members with IDs.',
    form: { intro: 'Register your team for the contest.', confirmation: 'Your team is registered. Good luck!', unique: 'leader_email', fields: [
      { id: 'team', type: 'short', label: 'Team name', required: true, maxLen: 40 },
      { id: 'leader', type: 'short', label: 'Team leader name', required: true },
      { id: 'leader_id', type: 'short', label: 'Leader student ID', required: true },
      { id: 'leader_email', type: 'email', label: 'Leader email', required: true },
      { id: 'leader_phone', type: 'phone', label: 'Leader mobile', required: true },
      { id: 'm2', type: 'short', label: 'Member 2 (name and ID)', required: true },
      { id: 'm3', type: 'short', label: 'Member 3 (name and ID)' },
    ] } },
  { key: 'poll', icon: 'poll', color: '#0e7490', name: 'Quick poll', desc: 'One question, many choices, plus an "Other".',
    form: { intro: '', confirmation: 'Thanks for voting!', fields: [
      { id: 'q', type: 'radio', label: 'Which day suits you best?', required: true, options: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'], allowOther: true },
    ] } },
  { key: 'contact', icon: 'help', color: '#475569', name: 'Help / suggestion box', desc: 'Let members send a question or an idea.',
    form: { intro: 'Tell us what is on your mind.', confirmation: 'Thank you. We read every message.', fields: [
      { id: 'name', key: 'name', type: 'short', label: 'Your name' },
      { id: 'email', key: 'email', type: 'email', label: 'Email (so we can reply)' },
      { id: 'kind', type: 'dropdown', label: 'This is a', required: true, options: ['Question', 'Idea', 'Problem', 'Compliment'] },
      { id: 'msg', type: 'long', label: 'Your message', required: true, minLen: 5 },
    ] } },
];
