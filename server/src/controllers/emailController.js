import db from '../db/connection.js';

export function listEmails(req, res) {
  const { limit = 50 } = req.query;
  const emails = db.prepare(`
    SELECT id, recipient_email, recipient_name, subject, type, qr_code_data, metadata, sent_at
    FROM emails_log
    ORDER BY sent_at DESC
    LIMIT ?
  `).all(parseInt(limit, 10));

  res.json({ emails });
}

export function getEmail(req, res) {
  const { id } = req.params;
  const email = db.prepare('SELECT * FROM emails_log WHERE id = ?').get(id);

  if (!email) {
    return res.status(404).json({ error: 'Email not found.' });
  }

  res.json({ email });
}

export function clearEmails(req, res) {
  db.prepare('DELETE FROM emails_log').run();
  res.json({ success: true, message: 'Mailbox cleared.' });
}
