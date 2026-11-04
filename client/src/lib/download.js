import toast from 'react-hot-toast';
import { api } from '../context/store';

/** Downloads a file the server builds (needs the admin login). Shows a progress toast because ZIPs with pictures can take a few seconds. */
export async function saveFile(path, params, filename) {
  const id = toast.loading('Preparing your download…');
  try {
    const { data } = await api.get(path, { params, responseType: 'blob', timeout: 180000 });
    const url = URL.createObjectURL(data);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success('Download started', { id });
  } catch (e) {
    let msg = 'Could not build the download';
    try { msg = JSON.parse(await e.response.data.text()).error || msg; } catch { /* keep the default */ }
    toast.error(msg, { id });
  }
}

export const IMAGE_FORMATS = [['original', 'Original (WebP, best quality)'], ['jpg', 'JPG (for print and posters)'], ['png', 'PNG']];
