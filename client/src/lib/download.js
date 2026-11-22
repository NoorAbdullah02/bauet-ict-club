import toast from 'react-hot-toast';
import { api } from '../context/store';

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Downloads a file the server builds (needs the admin login). Shows a progress toast because ZIPs with pictures can take a few seconds. */
export async function saveFile(path, params, filename) {
  const id = toast.loading('Preparing your download…');
  try {
    const { data } = await api.get(path, { params, responseType: 'blob', timeout: 180000 });
    save(data, filename);
    toast.success('Download started', { id });
  } catch (e) {
    let msg = 'Could not build the download';
    try { msg = JSON.parse(await e.response.data.text()).error || msg; } catch { /* keep the default */ }
    toast.error(msg, { id });
  }
}

/** The rows a table is showing (filtered and sorted), as a real Excel workbook. */
export async function saveTableExcel({ title, subtitle, columns, rows, filename }) {
  const id = toast.loading('Preparing your Excel file…');
  try {
    const { data } = await api.post('/exports/table', { title, subtitle, columns, rows }, { responseType: 'blob', timeout: 120000 });
    save(data, filename);
    toast.success('Excel file downloaded', { id });
  } catch {
    toast.error('Could not build the Excel file', { id });
  }
}

export const IMAGE_FORMATS = [['original', 'Original (WebP, best quality)'], ['jpg', 'JPG (for print and posters)'], ['png', 'PNG']];
