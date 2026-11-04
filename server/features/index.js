// Drop-in features: every other .js file in this folder (not starting with "_") is loaded automatically.
// See docs/ADD_A_FEATURE.md and server/features/_example.js.
const fs = require('fs');
const path = require('path');

const IDENT = /^[a-z_][a-z0-9_]*$/;

function loadFeatures() {
  return fs.readdirSync(__dirname)
    .filter((f) => f.endsWith('.js') && f !== 'index.js' && !f.startsWith('_'))
    .sort()
    .map((f) => {
      const feat = require(path.join(__dirname, f));
      if (!IDENT.test(feat.table || '') || !Array.isArray(feat.columns) || !feat.sql) {
        throw new Error(`server/features/${f}: needs "table", "columns" and "sql"`);
      }
      return { label: feat.table, title: (r) => r.title || r.name || `#${r.id}`, ...feat };
    });
}

module.exports = loadFeatures();
