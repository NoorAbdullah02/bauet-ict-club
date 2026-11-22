const { ZipArchive } = require('archiver');

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const NUMBER = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/;
const BAD_SHEET = /[\\/?*[\]:]/g;

const plain = (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? '')).replace(CONTROL, '');
const esc = (v) => plain(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const numeric = (v) => (typeof v === 'number' ? Number.isFinite(v) : NUMBER.test(String(v).trim()));
const colName = (n) => { let s = ''; for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const widthOf = (v) => plain(v).split('\n').reduce((w, line) => Math.max(w, [...line].length), 0);

const FILES = {
  types: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
  rels: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>',
  bookRels: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  styles: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>'
    + '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A1A4A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F6FF"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD6DEF0"/></left><right style="thin"><color rgb="FFD6DEF0"/></right><top style="thin"><color rgb="FFD6DEF0"/></top><bottom style="thin"><color rgb="FFD6DEF0"/></bottom><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="4">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
};

const workbook = (name) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const core = (title, sub) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:subject>${esc(sub)}</dc:subject><dc:creator>BAUET ICT Club</dc:creator><cp:lastModifiedBy>BAUET ICT Club</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`;

const cell = (ref, v, style) => {
  if (v === '' || v === null || v === undefined) return `<c r="${ref}" s="${style}"/>`;
  if (numeric(v)) return `<c r="${ref}" s="${style}"><v>${Number(v)}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
};

function sheet(head, rows) {
  const widths = head.map((h, c) => Math.min(52, Math.max(7, widthOf(h) + 3, ...rows.slice(0, 400).map((r) => widthOf(r[c])))));
  const last = `${colName(head.length)}${rows.length + 1}`;
  const line = (values, n, style) => `<row r="${n}"${n === 1 ? ' ht="24" customHeight="1"' : ''}>${values.map((v, c) => cell(`${colName(c + 1)}${n}`, v, style)).join('')}</row>`;
  const body = rows.map((r, i) => line(r, i + 2, i % 2 ? 3 : 2)).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<dimension ref="A1:${last}"/>`
    + '<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="16"/>'
    + `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${line(head, 1, 1)}${body}</sheetData>`
    + `<autoFilter ref="A1:${last}"/>`
    + '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
    + '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
    + '</worksheet>';
}

const zip = (files) => new Promise((resolve, reject) => {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks = [];
  archive.on('data', (c) => chunks.push(c));
  archive.on('warning', reject);
  archive.on('error', reject);
  archive.on('end', () => resolve(Buffer.concat(chunks)));
  files.forEach(([name, body]) => archive.append(body, { name }));
  archive.finalize();
});

/** A real .xlsx workbook: bold frozen header with a filter, sized columns and wrapped text. cols: [[heading, key | (row) => value]] */
async function tableToXlsx(title, sub, cols, rows) {
  const head = cols.map((c) => String(c[0]));
  const body = rows.map((r) => cols.map(([, k]) => plain(typeof k === 'function' ? k(r) : r[k])));
  const name = String(title || 'List').replace(BAD_SHEET, '').trim().slice(0, 31) || 'List';
  return zip([
    ['[Content_Types].xml', FILES.types],
    ['_rels/.rels', FILES.rels],
    ['docProps/core.xml', core(title, sub)],
    ['xl/workbook.xml', workbook(name)],
    ['xl/_rels/workbook.xml.rels', FILES.bookRels],
    ['xl/styles.xml', FILES.styles],
    ['xl/worksheets/sheet1.xml', sheet(head, body)],
  ]);
}

module.exports = { tableToXlsx };
