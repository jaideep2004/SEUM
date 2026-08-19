import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface EmailAction {
  label: string;
  url: string;
}

export interface SeumEmailOptions {
  to: string;
  subject: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
  action?: EmailAction;
  note?: string;
}

const PRIMARY = '#1d4ed8';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders a responsive, SEUM-branded HTML email matching the app theme
 * (blue #1d4ed8 primary, soft #dbeafe accents, clean white card on light grey).
 * Styles are inline so they render correctly in email clients.
 */
export function renderSeumEmail(opts: SeumEmailOptions): string {
  const actionHtml = opts.action
    ? `<tr><td style="padding:6px 48px 30px 48px;"><a href="${escapeHtml(opts.action.url)}" target="_blank" style="display:inline-block;background-color:${PRIMARY};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.01em;padding:12px 26px;border-radius:8px;">${escapeHtml(opts.action.label)}</a></td></tr>`
    : '';

  const noteHtml = opts.note
    ? `<tr><td style="padding:0 48px 30px 48px;font-size:12px;line-height:1.6;color:#6b7280;">${opts.note}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>
  <div style="background-color:#111827;padding:22px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="padding:0 24px;color:#f9fafb;font-size:18px;font-weight:700;letter-spacing:0.06em;">
          SEUM <span style="color:#93c5fd;font-weight:600;">·</span>
          <span style="color:#9ca3af;font-size:12px;font-weight:500;letter-spacing:0.04em;">Transportation OS</span>
        </td>
      </tr>
    </table>
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:0 16px;">
    <tr><td height="24">&nbsp;</td></tr>
    <tr>
      <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 4px 16px rgba(15,23,42,0.06);padding:34px 48px 40px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-top:3px solid ${PRIMARY};padding-top:26px;">
              <h1 style="margin:0 0 6px 0;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a;">${escapeHtml(opts.heading)}</h1>
              <div style="width:44px;height:3px;background-color:#93c5fd;border-radius:2px;margin:0 0 18px 0;"></div>
              <div style="font-size:14px;line-height:1.7;color:#334155;">${opts.bodyHtml}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${actionHtml}
    ${noteHtml}
    <tr>
      <td style="padding:6px 0 8px 0;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
          This is an automated message from SEUM · <a href="https://seum.app" style="color:#1d4ed8;text-decoration:none;">seum.app</a>
        </p>
        <p style="margin:4px 0 0 0;font-size:11px;line-height:1.5;color:#cbd5e1;">
          If you believe this was sent in error, please ignore it or contact your operations administrator.
        </p>
      </td>
    </tr>
    <tr><td height="28">&nbsp;</td></tr>
  </table>
</body>
</html>`;
}

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!config.smtp.user || !config.smtp.pass) {
    logger.warn('SMTP credentials not configured — skipping email send');
    return null;
  }
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transport;
}

/**
 * Send a SEUM-themed email. Failures are logged and swallowed so notification
 * sends never break the underlying operation.
 */
export async function sendEmail(opts: SeumEmailOptions): Promise<boolean> {
  const t = getTransport();
  if (!t) return false;
  try {
    await t.sendMail({
      from: config.smtp.from,
      to: opts.to,
      subject: opts.subject,
      html: renderSeumEmail(opts),
    });
    logger.info({ to: opts.to, subject: opts.subject }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, 'Failed to send email');
    return false;
  }
}

/** Convenience wrapper for fire-and-forget sends that never throw. */
export function sendEmailAsync(opts: SeumEmailOptions): void {
  sendEmail(opts).catch(() => {});
}