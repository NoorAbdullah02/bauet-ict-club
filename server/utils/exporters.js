const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType, BorderStyle, ShadingType, Footer, PageNumber } = require('docx');
const { UPLOAD_DIR } = require('./saveImage');

const TYPE_LABEL = { committee: 'Committee', general: 'General member', ambassador: 'Department ambassador' };
const STATUS_COLOR = { pending: '#B7791F', approved: '#0E7C5A', rejected: '#C53030' };
const FONTS = path.join(__dirname, '..', 'assets', 'fonts');
const BN = /[ঀ-৿]/;

const dateText = (v) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '');
const list = (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));
const clean = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();

/** The label/value pairs shown for one applicant, in reading order. Empty values are skipped. */
function fieldsOf(r) {
  return [
    ['Type', TYPE_LABEL[r.type] || r.type],
    r.type === 'committee' && ['Post applied for', r.post],
    ['Student ID', r.student_id],
    ['Batch', r.batch],
    ['Department', r.department],
    ['Gender', r.gender],
    ['Phone', r.phone],
    ['Email', r.email],
    ['Interests', list(r.interests)],
    ['Experience', r.experience],
    ['Note', r.note],
    ['Status', r.status],
    ['Applied on', dateText(r.created_at)],
  ].filter((f) => f && clean(f[1]) !== '').map(([k, v]) => [k, clean(v)]);
}

const heading = (rows, filter) => {
  const bits = [];
  if (filter.type && filter.type !== 'all') bits.push(TYPE_LABEL[filter.type] || filter.type);
  if (filter.status && filter.status !== 'all') bits.push(filter.status);
  const count = (s) => rows.filter((r) => r.status === s).length;
  return {
    title: 'BAUET ICT Club: applications',
    sub: `${rows.length} applicant${rows.length === 1 ? '' : 's'}${bits.length ? ` · ${bits.join(' · ')}` : ''} · exported ${dateText(new Date())}`,
    totals: `Pending ${count('pending')} · Approved ${count('approved')} · Rejected ${count('rejected')}`,
  };
};

/**
 * Photo bytes for an applicant as a small JPEG/PNG, or null. Local uploads are read from disk, Cloudinary links are asked
 * for a 240px JPEG, other https links are fetched with a short timeout. Anything slow, huge or not JPEG/PNG is skipped.
 */
async function photoOf(url) {
  try {
    if (!url) return null;
    let buf;
    if (url.startsWith('/uploads/')) {
      const file = path.join(UPLOAD_DIR, path.basename(url));
      if (!fs.existsSync(file)) return null;
      buf = fs.readFileSync(file);
    } else if (/^https:\/\/res\.cloudinary\.com\//.test(url)) {
      const src = /res\.cloudinary\.com\/.+\/upload\//.test(url) && !url.includes('/upload/w_') ? url.replace('/upload/', '/upload/w_700,h_700,c_fill,g_face,f_jpg,q_90/') : url;
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      const res = await fetch(src, { signal: ctl.signal }).finally(() => clearTimeout(timer));
      if (!res.ok || Number(res.headers.get('content-length') || 0) > 3e6) return null;
      buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 3e6) return null;
    } else return null;
    const jpg = buf[0] === 0xff && buf[1] === 0xd8;
    const png = buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
    return jpg ? { buf, type: 'jpg' } : png ? { buf, type: 'png' } : null;
  } catch { return null; }
}

/** Load photos for every applicant, a few at a time. */
async function withPhotos(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 6) {
    out.push(...await Promise.all(rows.slice(i, i + 6).map(async (r) => ({ r, photo: await photoOf(r.photo_url) }))));
  }
  return out;
}

async function toPdf(rows, filter) {
  const { title, sub, totals } = heading(rows, filter);
  const items = await withPhotos(rows);
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: title, Author: 'BAUET ICT Club' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.registerFont('bn', path.join(FONTS, 'NotoSansBengali-Regular.ttf'));
  doc.registerFont('bn-b', path.join(FONTS, 'NotoSansBengali-Bold.ttf'));
  const face = (text, bold) => (BN.test(text) ? (bold ? 'bn-b' : 'bn') : (bold ? 'Helvetica-Bold' : 'Helvetica'));
  const W = doc.page.width - 80;
  const bottom = () => doc.page.height - 56;

  // cover band
  doc.rect(0, 0, doc.page.width, 92).fill('#0A1A4A');
  doc.rect(0, 92, doc.page.width, 4).fill('#17A2D8');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(21).text(title, 40, 28, { width: W });
  doc.fillColor('#BFD3FF').font('Helvetica').fontSize(9.5).text(sub, 40, 58, { width: W }).text(totals, 40, 72, { width: W });
  doc.y = 116;

  if (!rows.length) {
    doc.fillColor('#5B6B8C').font('Helvetica').fontSize(11).text('No applications match this filter.', 40, doc.y);
  }

  // summary table
  if (rows.length) {
    const cols = [['#', 24], ['Name', 126], ['Type', 112], ['ID', 62], ['Dept', 40], ['Status', 58], ['Applied', 70]];
    let y = doc.y;
    const head = () => {
      doc.rect(40, y, W, 20).fill('#EEF3FF');
      let x = 40;
      doc.fillColor('#0A1A4A').font('Helvetica-Bold').fontSize(8.5);
      cols.forEach(([c, w]) => { doc.text(c.toUpperCase(), x + 6, y + 6, { width: w - 8, lineBreak: false }); x += w; });
      y += 20;
    };
    head();
    rows.forEach((r, i) => {
      if (y + 20 > bottom()) { doc.addPage(); y = 40; head(); }
      if (i % 2) doc.rect(40, y, W, 20).fill('#F8FAFF');
      const vals = [String(i + 1), clean(r.full_name), TYPE_LABEL[r.type] || r.type, clean(r.student_id), clean(r.department), r.status, String(r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '')];
      let x = 40;
      vals.forEach((v, k) => {
        doc.fillColor(k === 5 ? (STATUS_COLOR[r.status] || '#111827') : '#111827').font(face(v, k === 5)).fontSize(8.5).text(v, x + 6, y + 6, { width: cols[k][1] - 10, height: 12, ellipsis: true, lineBreak: false });
        x += cols[k][1];
      });
      y += 20;
    });
    doc.y = y + 8;
  }

  // one card per applicant (photo + details), never split across pages
  if (rows.length) { doc.addPage(); }
  items.forEach(({ r, photo }, i) => {
    const fields = fieldsOf(r);
    const textW = W - 96;
    const measure = fields.reduce((h, [k, v]) => { doc.font(face(v)).fontSize(9.5); return h + Math.max(15, doc.heightOfString(v, { width: textW - 92 }) + 4); }, 0);
    const cardH = Math.max(112, 44 + measure);
    if (doc.y + cardH > bottom()) doc.addPage();
    const top = doc.y;
    doc.roundedRect(40, top, W, cardH, 8).lineWidth(0.7).strokeColor('#D6DEF0').stroke();
    doc.rect(40, top, 4, cardH).fill('#1F4FD8');
    // photo or initials
    if (photo) { try { doc.save().roundedRect(56, top + 14, 72, 72, 10).clip(); doc.image(photo.buf, 56, top + 14, { cover: [72, 72], align: 'center', valign: 'center' }); doc.restore(); } catch { /* bad image: skip */ } }
    else { doc.roundedRect(56, top + 14, 72, 72, 10).fill('#EEF3FF'); doc.fillColor('#1F4FD8').font(face(r.full_name, true)).fontSize(26).text(clean(r.full_name).slice(0, 1).toUpperCase(), 56, top + 36, { width: 72, align: 'center', lineBreak: false }); }
    // name and status
    doc.fillColor('#0A1A4A').font(face(r.full_name, true)).fontSize(13).text(`${i + 1}. ${clean(r.full_name)}`, 144, top + 14, { width: textW - 70, lineBreak: false, ellipsis: true });
    doc.roundedRect(W - 30, top + 12, 70, 16, 8).fill(STATUS_COLOR[r.status] || '#5B6B8C');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text(String(r.status).toUpperCase(), W - 30, top + 17, { width: 70, align: 'center', lineBreak: false });
    // fields
    let y = top + 38;
    fields.filter(([k]) => k !== 'Status').forEach(([k, v]) => {
      doc.fillColor('#5B6B8C').font('Helvetica-Bold').fontSize(8).text(k.toUpperCase(), 144, y + 1.5, { width: 86, lineBreak: false });
      doc.fillColor('#111827').font(face(v)).fontSize(9.5).text(v, 232, y, { width: textW - 92 });
      y += Math.max(15, doc.heightOfString(v, { width: textW - 92 }) + 4);
    });
    doc.y = top + cardH + 12;
  });

  // footer on every page
  const range = doc.bufferedPageRange();
  for (let p = range.start; p < range.start + range.count; p += 1) {
    doc.switchToPage(p);
    doc.page.margins.bottom = 0; // writing inside the bottom margin would otherwise add a blank page
    doc.fillColor('#8A97B4').font('Helvetica').fontSize(8);
    doc.text('BAUET ICT Club · confidential applicant data', 40, doc.page.height - 34, { width: W / 2, lineBreak: false });
    doc.text(`Page ${p - range.start + 1} of ${range.count}`, 40 + W / 2, doc.page.height - 34, { width: W / 2, align: 'right', lineBreak: false });
  }
  doc.end();
  return done;
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: 'D6DEF0' };
const run = (text, o = {}) => new TextRun({ text: String(text), font: 'Calibri', size: o.size || 20, bold: !!o.bold, color: o.color });
const cell = (children, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.PERCENTAGE },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
  verticalAlign: 'center', margins: { top: 60, bottom: 60, left: 100, right: 100 },
  borders: { top: LINE, bottom: LINE, left: LINE, right: LINE },
  children: Array.isArray(children) ? children : [new Paragraph({ children: [run(children, o)] })],
});

async function toDocx(rows, filter) {
  const { title, sub, totals } = heading(rows, filter);
  const items = await withPhotos(rows);
  const children = [
    new Paragraph({ children: [run(title, { size: 40, bold: true, color: '0A1A4A' })], spacing: { after: 60 } }),
    new Paragraph({ children: [run(sub, { size: 20, color: '5B6B8C' })] }),
    new Paragraph({ children: [run(totals, { size: 20, bold: true, color: '1F4FD8' })], spacing: { after: 240 } }),
  ];

  if (rows.length) {
    children.push(new Paragraph({ children: [run('Summary', { size: 28, bold: true, color: '0A1A4A' })], spacing: { after: 100 } }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [['#', 5], ['Name', 27], ['Type', 20], ['Student ID', 15], ['Dept', 10], ['Status', 11], ['Applied', 12]].map(([h, w]) => cell(h, { w, bold: true, fill: 'EEF3FF', color: '0A1A4A', size: 18 })) }),
        ...rows.map((r, i) => new TableRow({ children: [
          cell(String(i + 1), { w: 5, size: 18 }), cell(clean(r.full_name), { w: 27, size: 18, bold: true }), cell(TYPE_LABEL[r.type] || r.type, { w: 20, size: 18 }),
          cell(clean(r.student_id), { w: 15, size: 18 }), cell(clean(r.department), { w: 10, size: 18 }),
          cell(r.status, { w: 11, size: 18, bold: true, color: (STATUS_COLOR[r.status] || '#111827').slice(1) }),
          cell(r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '', { w: 12, size: 18 }),
        ] })),
      ],
    }));
  }

  items.forEach(({ r, photo }, i) => {
    children.push(new Paragraph({ children: [run(`${i + 1}. ${clean(r.full_name)}`, { size: 28, bold: true, color: '1F4FD8' })], spacing: { before: 360, after: 100 }, keepNext: true, pageBreakBefore: i === 0 }));
    const photoCell = new TableCell({
      width: { size: 22, type: WidthType.PERCENTAGE }, verticalAlign: 'center', borders: { top: LINE, bottom: LINE, left: LINE, right: LINE },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: photo ? [new ImageRun({ data: photo.buf, type: photo.type, transformation: { width: 96, height: 96 } })] : [run(clean(r.full_name).slice(0, 1).toUpperCase(), { size: 56, bold: true, color: '1F4FD8' })] })],
    });
    const details = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: fieldsOf(r).map(([k, v]) => new TableRow({ cantSplit: true, children: [cell(k, { w: 30, bold: true, fill: 'EEF3FF', color: '0A1A4A', size: 18 }), cell(v, { w: 70 })] })),
    });
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
      rows: [new TableRow({ cantSplit: true, children: [photoCell, new TableCell({ width: { size: 78, type: WidthType.PERCENTAGE }, borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }, children: [details] })] })],
    }));
  });
  if (!rows.length) children.push(new Paragraph({ children: [run('No applications match this filter.', { color: '5B6B8C' })] }));

  return Packer.toBuffer(new Document({
    creator: 'BAUET ICT Club', title,
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 900, right: 900 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('BAUET ICT Club · confidential applicant data · page ', { size: 16, color: '8A97B4' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8A97B4' })] })] }) },
      children,
    }],
  }));
}

/** A plain branded table as PDF. cols: [[heading, key | (row) => text]] */
async function tableToPdf(title, sub, cols, rows) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: title, Author: 'BAUET ICT Club' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.registerFont('bn', path.join(FONTS, 'NotoSansBengali-Regular.ttf'));
  const face = (t, b) => (BN.test(t) ? 'bn' : (b ? 'Helvetica-Bold' : 'Helvetica'));
  const W = doc.page.width - 72;
  doc.rect(0, 0, doc.page.width, 74).fill('#0A1A4A');
  doc.rect(0, 74, doc.page.width, 3).fill('#17A2D8');
  doc.fillColor('#FFFFFF').font(face(title, true)).fontSize(17).text(title, 36, 20, { width: W, lineBreak: false, ellipsis: true });
  doc.fillColor('#BFD3FF').font(face(sub)).fontSize(9.5).text(sub, 36, 46, { width: W, lineBreak: false, ellipsis: true });
  const widths = cols.map((c) => (c[0] === 'Email' ? 2.2 : c[0] === 'Name' ? 1.8 : 1));
  const total = widths.reduce((a, b) => a + b, 0);
  const cw = widths.map((w) => (w / total) * (W - 24));
  let y = 94;
  const head = () => {
    doc.rect(36, y, W, 20).fill('#EEF3FF');
    let x = 36; doc.fillColor('#0A1A4A').font('Helvetica-Bold').fontSize(8.5);
    doc.text('#', x + 6, y + 6, { width: 20, lineBreak: false }); x += 24;
    cols.forEach(([h], i) => { doc.text(h.toUpperCase(), x + 4, y + 6, { width: cw[i] - 6, lineBreak: false }); x += cw[i]; });
    y += 20;
  };
  head();
  rows.forEach((r, n) => {
    if (y + 20 > doc.page.height - 50) { doc.addPage(); y = 40; head(); }
    if (n % 2) doc.rect(36, y, W, 20).fill('#F8FAFF');
    let x = 36; doc.fillColor('#5B6B8C').font('Helvetica').fontSize(8.5).text(String(n + 1), x + 6, y + 6, { width: 20, lineBreak: false }); x += 24;
    cols.forEach(([, k], i) => { const v = clean(typeof k === 'function' ? k(r) : r[k]); doc.fillColor('#111827').font(face(v)).fontSize(9).text(v, x + 4, y + 5.5, { width: cw[i] - 8, height: 12, ellipsis: true, lineBreak: false }); x += cw[i]; });
    y += 20;
  });
  if (!rows.length) doc.fillColor('#5B6B8C').font('Helvetica').fontSize(11).text('Nobody has registered yet.', 36, y + 12);
  const range = doc.bufferedPageRange();
  for (let p = range.start; p < range.start + range.count; p += 1) {
    doc.switchToPage(p); doc.page.margins.bottom = 0;
    doc.fillColor('#8A97B4').font('Helvetica').fontSize(8).text(`BAUET ICT Club · page ${p - range.start + 1} of ${range.count}`, 36, doc.page.height - 28, { width: W, align: 'right', lineBreak: false });
  }
  doc.end();
  return done;
}

/** A plain table as a Word document. */
async function tableToDocx(title, sub, cols, rows) {
  const head = new TableRow({ tableHeader: true, children: [cell('#', { w: 5, bold: true, fill: 'EEF3FF', color: '0A1A4A', size: 18 }), ...cols.map(([h]) => cell(h, { w: Math.floor(95 / cols.length), bold: true, fill: 'EEF3FF', color: '0A1A4A', size: 18 }))] });
  const body = rows.map((r, n) => new TableRow({ cantSplit: true, children: [cell(String(n + 1), { w: 5, size: 18 }), ...cols.map(([, k]) => cell(clean(typeof k === 'function' ? k(r) : r[k]), { w: Math.floor(95 / cols.length), size: 18 }))] }));
  return Packer.toBuffer(new Document({
    creator: 'BAUET ICT Club', title,
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{ properties: { page: { size: { orientation: 'landscape' }, margin: { top: 900, bottom: 900, left: 800, right: 800 } } }, children: [
      new Paragraph({ children: [run(title, { size: 36, bold: true, color: '0A1A4A' })], spacing: { after: 60 } }),
      new Paragraph({ children: [run(sub, { size: 20, color: '5B6B8C' })], spacing: { after: 220 } }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body] }),
    ] }],
  }));
}

module.exports = { toPdf, toDocx, fieldsOf, tableToPdf, tableToDocx };
