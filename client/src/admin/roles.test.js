import test from 'node:test';
import assert from 'node:assert/strict';

import { canDelete, isEditor, isMainAdmin } from './roles.js';

// These mirror server/middleware/auth.js: editor => no deletes and no main-admin areas,
// a plain admin => deletes but no activity log/team logins/backups, superadmin => everything.

test('an editor can edit but never delete', () => {
  const editor = { role: 'editor', username: 'editor.qa' };
  assert.equal(isEditor(editor), true);
  assert.equal(isMainAdmin(editor), false);
  assert.equal(canDelete(editor), false);
});

test('a plain admin keeps deletes but not the main-admin areas', () => {
  const admin = { role: 'admin' };
  assert.equal(isEditor(admin), false);
  assert.equal(isMainAdmin(admin), false);
  assert.equal(canDelete(admin), true);
});

test('the main admin keeps deletes and the main-admin areas', () => {
  const main = { role: 'superadmin' };
  assert.equal(isEditor(main), false);
  assert.equal(isMainAdmin(main), true);
  assert.equal(canDelete(main), true);
});

test('a missing user is not treated as an editor', () => {
  for (const user of [null, undefined, {}]) {
    assert.equal(isEditor(user), false);
    assert.equal(isMainAdmin(user), false);
    assert.equal(canDelete(user), true);
  }
});
