const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType, PageBreak } = require('docx');

const TYPE_LABEL = { committee: 'Committee', general: 'General member', ambassador: 'Department ambassador' };
const dateText = (v) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '');
const list = (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));

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
    ['Photo', r.photo_url],
    ['Status', r.status],
    ['Applied on', dateText(r.created_at)],
  ].filter((f) => f && String(f[1] ?? '').trim() !== '');
}

const heading = (rows, filter) => {
  const bits = [];
  if (filter.type && filter.type !== 'all') bits.push(TYPE_LABEL[filter.type] || filter.type);
  if (filter.status && filter.status !== 'all') bits.push(filter.status);
  return { title: 'BAUET ICT Club: applications', sub: `${rows.length} applicant${rows.length === 1 ? '' : 's'}${bits.length ? ` · ${bits.join(' · ')}` : ''} · exported ${dateText(new Date())}` };
};

function toPdf(rows, filter) {
  const { title, sub } = heading(rows, filter);
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: title, Author: 'BAUET ICT Club' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.fillColor('#0A1A4A').font('Helvetica-Bold').fontSize(20).text(title);
  doc.moveDown(0.2).fillColor('#5B6B8C').font('Helvetica').fontSize(10).text(sub);
  doc.moveDown(1);

  rows.forEach((r, i) => {
    const fields = fieldsOf(r);
    // keep one applicant together on a page when it fits
    if (doc.y + 40 + fields.length * 16 > doc.page.height - 60) doc.addPage();
    doc.fillColor('#1F4FD8').font('Helvetica-Bold').fontSize(13).text(`${i + 1}. ${r.full_name}`);
    doc.moveTo(48, doc.y + 2).lineTo(doc.page.width - 48, doc.y + 2).strokeColor('#D6DEF0').lineWidth(0.6).stroke();
    doc.moveDown(0.5);
    fields.forEach(([k, v]) => {
      doc.fillColor('#5B6B8C').font('Helvetica-Bold').fontSize(9).text(`${k}: `, { continued: true });
      doc.fillColor('#111827').font('Helvetica').fontSize(10).text(String(v), { lineGap: 2 });
    });
    doc.moveDown(1);
  });
  if (!rows.length) doc.fillColor('#5B6B8C').text('No applications match this filter.');

  doc.end();
  return done;
}

const cell = (text, opts = {}) => new TableCell({
  width: { size: opts.w || 50, type: WidthType.PERCENTAGE },
  shading: opts.fill ? { fill: opts.fill } : undefined,
  children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: !!opts.bold, size: 20, color: opts.color })] })],
});

function toDocx(rows, filter) {
  const { title, sub } = heading(rows, filter);
  const children = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: sub, color: '5B6B8C', size: 20 })], spacing: { after: 300 } }),
  ];
  rows.forEach((r, i) => {
    children.push(new Paragraph({ text: `${i + 1}. ${r.full_name}`, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 } }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: fieldsOf(r).map(([k, v]) => new TableRow({ children: [cell(k, { w: 28, bold: true, fill: 'EEF3FF', color: '0A1A4A' }), cell(v, { w: 72 })] })),
    }));
  });
  if (!rows.length) children.push(new Paragraph('No applications match this filter.'));
  return Packer.toBuffer(new Document({ creator: 'BAUET ICT Club', title, sections: [{ children }] }));
}

module.exports = { toPdf, toDocx, fieldsOf };
