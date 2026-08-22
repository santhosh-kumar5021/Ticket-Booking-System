import db from '../db/connection.js';
import { sendDirectTestEmail } from '../services/emailService.js';

export async function listEmails(req, res) {
  const { limit = 50 } = req.query;
  const emails = await db.all(`
    SELECT id, recipient_email, recipient_name, subject, type, qr_code_data, metadata, sent_at
    FROM emails_log
    ORDER BY sent_at DESC
    LIMIT ?
  `, [parseInt(limit, 10)]);

  res.json({ emails });
}

export async function getEmail(req, res) {
  const { id } = req.params;
  const email = await db.get('SELECT * FROM emails_log WHERE id = ?', [id]);

  if (!email) {
    return res.status(404).json({ error: 'Email not found.' });
  }

  res.json({ email });
}

export async function clearEmails(req, res) {
  await db.query('DELETE FROM emails_log');
  res.json({ success: true, message: 'Mailbox cleared.' });
}

export async function sendTestEmail(req, res) {
  try {
    const { to, subject, message } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient "to" email address is required.' });
    }

    const result = await sendDirectTestEmail({ to, subject, message });

    res.json({
      success: true,
      message: `Email sent successfully to ${to}`,
      messageId: result.messageId,
      response: result.response
    });
  } catch (error) {
    console.error('[SendEmail Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Email failed',
      error: error.message
    });
  }
}
