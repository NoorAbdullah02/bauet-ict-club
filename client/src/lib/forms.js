// Event registration forms (built by the admin like a Google Form). The same shape is validated again on the server.
export const BATCH_LIST = Array.from({ length: 19 }, (_, i) => String(12 + i));
export const DEPT_LIST = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'BBA', 'LLB', 'ELL', 'Other'];

export const DEFAULT_FIELDS = [
  { id: 'name', key: 'name', type: 'short', label: 'Full name', required: true },
  { id: 'student_id', key: 'student_id', type: 'short', label: 'Student ID', required: true },
  { id: 'batch', key: 'batch', type: 'dropdown', label: 'Batch', required: false, options: BATCH_LIST },
  { id: 'department', key: 'department', type: 'dropdown', label: 'Department', required: false, options: DEPT_LIST },
  { id: 'email', key: 'email', type: 'email', label: 'Email', required: true },
  { id: 'phone', key: 'phone', type: 'phone', label: 'Mobile (optional)', required: false },
];

export const fieldsOf = (ev) => (ev?.reg_form?.fields?.length ? ev.reg_form.fields : DEFAULT_FIELDS);

export const TYPE_LABELS = {
  short: 'Short answer', long: 'Paragraph', email: 'Email', phone: 'Mobile number', number: 'Number',
  dropdown: 'Dropdown', radio: 'Multiple choice', checkbox: 'Checkboxes', date: 'Date', time: 'Time', yesno: 'Yes / No',
  scale: 'Rating scale', photo: 'Picture upload', section: 'Heading / note',
};
export const PAY_METHODS = ['bKash', 'Nagad', 'Rocket'];
export const isAnswerType = (t) => t !== 'section';

/** Ready-made questions people ask most often. */
export const PRESETS = [
  { key: 'name', type: 'short', label: 'Full name', required: true },
  { key: 'student_id', type: 'short', label: 'Student ID', required: true },
  { key: 'email', type: 'email', label: 'Email', required: true },
  { key: 'phone', type: 'phone', label: 'Mobile number', required: false },
  { key: 'department', type: 'dropdown', label: 'Department', required: false, options: DEPT_LIST },
  { key: 'batch', type: 'dropdown', label: 'Batch', required: false, options: BATCH_LIST },
];

export const uid = () => `f${Math.random().toString(36).slice(2, 8)}`;
export const newField = (type = 'short', extra = {}) => ({
  id: uid(), type, label: '', required: false, ...(['dropdown', 'radio', 'checkbox'].includes(type) ? { options: ['Option 1', 'Option 2'] } : {}), ...(type === 'scale' ? { scale: { max: 5, low: '', high: '' } } : {}), ...extra,
});
export const hasOptions = (t) => ['dropdown', 'radio', 'checkbox'].includes(t);
/** Conditional questions: shown only when an earlier question has the chosen answer. */
export function isVisible(f, values) {
  if (!f.showIf) return true;
  const got = values[f.showIf.field];
  return Array.isArray(got) ? got.includes(f.showIf.equals) : String(got ?? '') === f.showIf.equals;
}
export const OTHER = 'Other: ';
export const isOther = (x) => typeof x === 'string' && x.startsWith(OTHER);
/** An answer that counts as "nothing entered" (including an "Other:" with no text). */
export const isEmpty = (v) => v === undefined || v === null || v === '' || v === OTHER || (Array.isArray(v) && (!v.length || v.every((x) => x === OTHER)));
export const show = (v) => (Array.isArray(v) ? v.join(', ') : v ?? '');
