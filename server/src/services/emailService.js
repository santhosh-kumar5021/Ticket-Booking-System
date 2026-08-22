import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

function getMailTransporter() {
  const user = (process.env.SMTP_USER || 'uppalavenkey01@gmail.com').replace(/"/g, '').trim();
  const pass = (process.env.SMTP_PASS || 'alcslwnktarzutzg').replace(/"/g, '').trim();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465');

  if (host.includes('gmail') || user.includes('@gmail.com')) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000
  });
}

/**
 * Record email in DB for In-App Mailbox viewer & attempt SMTP send
 */
async function dispatchEmail({ to, toName, subject, type, html, qrCodeData, metadata }) {
  const emailId = `em-${uuidv4()}`;

  try {
    // 1. Always record in Supabase emails_log for immediate In-App Mailbox inspection
    try {
      await db.run(
        `INSERT INTO emails_log (id, recipient_email, recipient_name, subject, type, html_body, qr_code_data, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          emailId,
          to,
          toName || to,
          subject,
          type,
          html,
          qrCodeData || null,
          metadata ? JSON.stringify(metadata) : null
        ]
      );
    } catch (dbErr) {
      console.warn('Could not insert to emails_log:', dbErr.message);
    }

    // 2. Send external email via SMTP
    const transporter = getMailTransporter();
    if (transporter) {
      const attachments = [];
      if (qrCodeData && qrCodeData.startsWith('data:image/png;base64,')) {
        attachments.push({
          filename: 'ticket-qr.png',
          content: qrCodeData.split('base64,')[1],
          encoding: 'base64',
          cid: 'ticket_qr_code'
        });
      }

      const fromAddress = process.env.SMTP_FROM
        ? process.env.SMTP_FROM.replace(/"/g, '')
        : `"TicketPass" <${(process.env.SMTP_USER || 'uppalavenkey01@gmail.com').replace(/"/g, '').trim()}>`;

      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        attachments
      });
      console.log(`[EmailService] SMTP email delivered to ${to} (${subject})`);
    }

    return { success: true, emailId };
  } catch (err) {
    console.error(`[EmailService] Dispatch error for [${type}] to ${to}:`, err.message);
    return { success: false, error: err.message, emailId };
  }
}

/**
 * Booking Confirmation with Embedded High-Res QR Ticket
 */
export async function sendBookingConfirmation({ user, booking, show, event, venue, seats, qrCodeData }) {
  const showDate = new Date(show.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const showTime = new Date(show.start_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const seatBadges = seats
    .map(
      s =>
        `<span style="display:inline-block; padding: 4px 10px; margin: 2px 4px; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; border-radius: 6px; color: #a5b4fc; font-weight: bold; font-size: 13px;">
          ${s.row_label}-${s.seat_number} (${s.seat_category || s.default_category})
        </span>`
    )
    .join(' ');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Ticket is Confirmed!</title>
    </head>
    <body style="margin:0; padding:24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
          <div style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
            Booking Confirmed • ${event.category}
          </div>
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.2;">
            ${event.title}
          </h1>
        </div>

        <!-- Content Body -->
        <div style="padding: 32px 24px;">
          <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1; margin-top: 0;">
            Hello <strong>${user.name}</strong>, your tickets are locked and confirmed! Here is your entry pass:
          </p>

          <!-- Ticket Card -->
          <div style="background: #0b1120; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #334155; padding-bottom: 16px; margin-bottom: 16px;">
              <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Booking Reference</div>
                <div style="font-size: 18px; font-weight: 800; color: #38bdf8; letter-spacing: 1px;">${booking.booking_reference}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Total Paid</div>
                <div style="font-size: 18px; font-weight: 800; color: #10b981;">$${Number(booking.total_amount || 0).toFixed(2)}</div>
              </div>
            </div>

            <!-- Details Grid -->
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; width: 30%;">Date & Time:</td>
                <td style="padding: 6px 0; color: #f8fafc; font-weight: 600;">${showDate} at ${showTime}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Venue:</td>
                <td style="padding: 6px 0; color: #f8fafc; font-weight: 600;">${venue.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Location:</td>
                <td style="padding: 6px 0; color: #cbd5e1;">${venue.address}, ${venue.city}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0 6px 0; color: #94a3b8; vertical-align: top;">Reserved Seats:</td>
                <td style="padding: 10px 0 6px 0;">${seatBadges}</td>
              </tr>
            </table>

            <!-- QR Code Section -->
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #334155;">
              <div style="display: inline-block; background: #ffffff; padding: 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
                <img src="${qrCodeData}" alt="Ticket Pass QR Code" style="width: 180px; height: 180px; display: block;" />
              </div>
              <p style="margin: 12px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                ⚡ Present this QR code at the entrance turnstile or usher scanner
              </p>
            </div>
          </div>

          <div style="font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px;">
            Need to manage or cancel your tickets? Log in to your TicketPass dashboard to view your booking history.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return dispatchEmail({
    to: user.email,
    toName: user.name,
    subject: `🎟️ Confirmed: ${event.title} (${booking.booking_reference})`,
    type: 'BOOKING_CONFIRMATION',
    html,
    qrCodeData,
    metadata: { bookingReference: booking.booking_reference, showId: show.id }
  });
}

/**
 * Waitlist Allocation Offer Notification (Time-Limited Claim Window)
 */
export async function sendWaitlistOffer({ user, waitlistEntry, show, event, venue, seat, claimUrl, expiresAt }) {
  const expiryFormatted = new Date(expiresAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Seat Available: Claim Your Waitlist Ticket!</title>
    </head>
    <body style="margin:0; padding:24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090d16; color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #f59e0b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(245, 158, 11, 0.2);">
        
        <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 28px 24px; text-align: center;">
          <div style="display: inline-block; padding: 4px 12px; background: rgba(0,0,0,0.3); border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #fef3c7; text-transform: uppercase;">
            ⏳ Time-Limited Waitlist Allocation
          </div>
          <h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 800; color: #ffffff;">
            A Seat Just Freed Up!
          </h1>
        </div>

        <div style="padding: 28px 24px;">
          <p style="font-size: 16px; color: #cbd5e1; margin-top: 0;">
            Hi <strong>${user.name}</strong>, due to a recent cancellation, a <strong>${waitlistEntry.seat_category}</strong> seat is now reserved exclusively for you:
          </p>

          <div style="background: #0b1120; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">${event.title}</div>
            <div style="font-size: 14px; color: #94a3b8; margin-bottom: 12px;">${venue.name} • ${new Date(show.start_time).toLocaleString()}</div>
            
            <div style="padding: 10px; background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 14px; color: #fde68a;">
              <strong>Offered Seat:</strong> Row ${seat.row_label}, Seat ${seat.seat_number} (${waitlistEntry.seat_category})
            </div>

            <div style="margin-top: 16px; text-align: center;">
              <p style="color: #ef4444; font-weight: 700; font-size: 14px; margin-bottom: 14px;">
                ⚠️ This exclusive offer expires at <strong>${expiryFormatted}</strong> (5-minute window).
              </p>
              <a href="${claimUrl}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 16px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                Claim Seat & Checkout Now →
              </a>
            </div>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
            If you do not claim this seat before it expires, it will automatically cascade to the next person in line.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return dispatchEmail({
    to: user.email,
    toName: user.name,
    subject: `⚡ Seat Available: Claim Your Ticket for ${event.title}!`,
    type: 'WAITLIST_OFFER',
    html,
    metadata: { waitlistId: waitlistEntry.id, showId: show.id, expiresAt }
  });
}

/**
 * Booking Cancellation Confirmation
 */
export async function sendCancellationNotice({ user, booking, show, event, seats }) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
      <h2 style="color: #ef4444;">Booking Cancelled</h2>
      <p>Hello ${user.name}, your booking <strong>${booking.booking_reference}</strong> for <strong>${event.title}</strong> has been cancelled.</p>
      <p>Your seats (${seats.map(s => `${s.row_label}-${s.seat_number}`).join(', ')}) have been released and offered to any waitlisted fans.</p>
    </div>
  `;

  return dispatchEmail({
    to: user.email,
    toName: user.name,
    subject: `Booking Cancelled: ${booking.booking_reference}`,
    type: 'BOOKING_CANCELLATION',
    html,
    metadata: { bookingReference: booking.booking_reference }
  });
}

/**
 * Waitlist Expiry Notice
 */
export async function sendWaitlistExpiredNotice({ user, show, event, category }) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
      <h2 style="color: #94a3b8;">Waitlist Claim Window Expired</h2>
      <p>Hello ${user.name}, the 5-minute claim window for your ${category} seat offer for <strong>${event.title}</strong> has expired and has been offered to the next waitlisted customer.</p>
    </div>
  `;

  return dispatchEmail({
    to: user.email,
    toName: user.name,
    subject: `Waitlist Offer Expired: ${event.title}`,
    type: 'WAITLIST_EXPIRED',
    html
  });
}
