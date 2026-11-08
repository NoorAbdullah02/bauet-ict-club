// Weekly automatic backup (run by GitHub Actions): writes one JSON file per table into the folder given as argument.
const fs = require('fs');
const path = require('path');
const { dump } = require('../utils/backupData');
(async () => {
  const dir = process.argv[2] || 'backup';
  fs.mkdirSync(dir, { recursive: true });
  const entries = await dump();
  for (const e of entries) fs.writeFileSync(path.join(dir, e.name), e.data);
  console.log(`Backed up ${entries.length - 1} tables: ${entries.filter((e) => e.count != null).map((e) => `${e.name.replace('.json', '')}(${e.count})`).join(', ')}`);
  process.exit(0);
})().catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
