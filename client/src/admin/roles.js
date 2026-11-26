// The same rules the server applies (see server/middleware/auth.js): an "editor" login may add and
// change content, but never delete anything, and never open the trash, activity log, downloads,
// committees, team logins, backups or the club e-mail tools.
export const isEditor = (user) => user?.role === 'editor';

/** Only the main admin (superadmin) may open the activity log, team logins and backups. */
export const isMainAdmin = (user) => user?.role === 'superadmin';

/** Editors get no delete button at all, instead of a button that ends in a 403. */
export const canDelete = (user) => !isEditor(user);
