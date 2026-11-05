/** QR code of any text as a PNG data URL. The QR library is loaded only when a QR code is actually shown. */
export async function qrDataUrl(text, width = 360) {
  const QR = (await import('qrcode')).default;
  return QR.toDataURL(text, { width, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0A1A4A', light: '#FFFFFF' } });
}
export const prettyCode = (c = '') => (c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
