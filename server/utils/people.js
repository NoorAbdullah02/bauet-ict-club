const pool = require('../config/db');

/**
 * One person, two rows: the Team page and the member card read `members.image_url`, while the applicant
 * card (`/card/r<id>`) and the approval e-mail read `registrations.photo_url`. A photo (or name) changed in
 * one place used to leave the other one showing the old picture, so every save now copies it across.
 * Never throws: a failed copy must not fail the admin's save.
 */
async function syncPersonPicture(row) {
  if (!row || !row.id) return;
  try {
    if (row.photo_url !== undefined) {
      // a registrations row: update the linked member (by registration_id, else the same approved name)
      await pool.query(
        `UPDATE members SET image_url = $1
          WHERE deleted_at IS NULL
            AND (registration_id = $2 OR (registration_id IS NULL AND LOWER(name) = LOWER($3)))
            AND COALESCE(image_url, '') <> COALESCE($1, '')`,
        [row.photo_url || null, row.id, row.full_name || '']
      );
    }
    if (row.image_url !== undefined) {
      // a members row: update the registration the card and the certificate are built from
      if (row.registration_id) {
        await pool.query(
          `UPDATE registrations SET photo_url = $1
            WHERE id = $2 AND deleted_at IS NULL AND COALESCE(photo_url, '') <> COALESCE($1, '')`,
          [row.image_url || null, row.registration_id]
        );
      } else if (row.name) {
        await pool.query(
          `UPDATE registrations SET photo_url = $1
            WHERE LOWER(full_name) = LOWER($2) AND status = 'approved' AND deleted_at IS NULL
              AND COALESCE(photo_url, '') <> COALESCE($1, '')`,
          [row.image_url || null, row.name]
        );
      }
    }
  } catch (e) {
    console.warn('Photo sync failed:', e.message);
  }
}

module.exports = { syncPersonPicture };
