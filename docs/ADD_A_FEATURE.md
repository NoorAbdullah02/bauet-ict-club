# Adding a feature

Two kinds of work, from easiest to most involved.

## 1. A new managed list (sponsors, projects, FAQs, resources...) — 2 files, no wiring

You get the database table, the REST API, an admin page (search, add, edit, delete), Trash with Undo/restore, and cached public reads.

1. **Server:** copy `server/features/_example.js` to `server/features/<name>.js` (drop the `_`). Edit the table, columns and SQL.
2. **Admin:** copy `client/src/features/_example.js` to `client/src/features/<name>.js`. Edit the fields (`text`, `textarea`, `date`, `select`, `image`, ...) and which columns the list shows.
3. Restart `npm run dev`. The table is created on boot, and the page shows in the admin sidebar.

Files starting with `_` are ignored, so the examples never run by accident.

Rules the server enforces for you: only the listed `columns` can be written, writes need an admin login, deletes go to the Trash, and images in `imageCols` are removed from Cloudinary/disk when replaced or purged.

### Showing it on the public site

```jsx
import { useEffect } from 'react';
import useStore from '../context/store';

export default function Sponsors() {
  const items = useStore((s) => s.sponsors) || [];
  useEffect(() => { useStore.getState().fetchList('sponsors'); }, []);
  return items.map((s) => <div key={s.id}>{s.name}</div>);
}
```

Add a route in `client/src/App.jsx` and a link in `client/src/components/Navbar.jsx`. Set `public: true` on the server feature so the list is readable without login.

## 2. Custom behaviour

| You want | Where |
| --- | --- |
| A special API (not plain CRUD) | new file in `server/routes/`, mount it in `server/index.js` |
| Validation (e.g. "only one per session") | `validate: async (data, oldRow) => 'error message' \| null` in the server feature |
| A new admin screen (not a list) | component in `client/src/admin/`, add a `<Route>` and a `NAV` entry in `AdminApp.jsx` |
| A new public page | component in `client/src/pages/`, add a `lazy` route in `App.jsx` |
| Site text / contact info | admin → Settings (stored in the `settings` table) |
| A new setting or secret | add it to `.env.example` and read it from `process.env` |

## Checklist before pushing

```bash
npm run build        # client must compile
node --check server/index.js
```

Then open the admin page, add one row, delete it, restore it from Trash.
