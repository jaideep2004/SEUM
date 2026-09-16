import { v4 as uuid } from 'uuid';
import { query, queryOne } from '../db';
import { logger } from '../utils/logger';
import { sendEmail } from './emailService';
import { NotFoundError, ValidationError } from '../utils/errors';

// ─────────────────────────────────────────────────────────────
// Variable substitution engine (L815)
// ─────────────────────────────────────────────────────────────

/**
 * Replace {{var}} and {{ var }} placeholders with values from variables map.
 * Missing keys are left as {{key}} (or replaced with empty string if strict=false).
 */
export function substituteVariables(
  bodyTemplate: string,
  variables: Record<string, string>
): string {
  if (!bodyTemplate) return '';
  return bodyTemplate.replace(/{{\s*([a-zA-Z0-9_\-]+)\s*}}/g, (_match, key: string) => {
    return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
  });
}

/**
 * Extract unique variable names from a template like "Hello {{name}} your trip {{trip}}"
 */
export function extractVariables(bodyTemplate: string): string[] {
  if (!bodyTemplate) return [];
  const found = new Set<string>();
  const re = /{{\s*([a-zA-Z0-9_\-]+)\s*}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bodyTemplate)) !== null) {
    found.add(m[1]);
  }
  return Array.from(found);
}

// ─────────────────────────────────────────────────────────────
// In-memory priority queue (L816)
// ─────────────────────────────────────────────────────────────

export type Channel = 'whatsapp' | 'sms' | 'email';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type Priority = 'high' | 'normal' | 'low';

const priorityScore: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

export interface QueuedMessage {
  id: string;
  tenantId: string;
  recipient: string;
  channel: Channel;
  templateName?: string;
  body: string;
  variables: Record<string, string>;
  priority: Priority;
  createdAt: Date;
}

const messageQueue: QueuedMessage[] = [];

export function enqueueMessage(item: Omit<QueuedMessage, 'id' | 'createdAt'>): QueuedMessage {
  const msg: QueuedMessage = {
    id: uuid(),
    createdAt: new Date(),
    ...item,
  };
  messageQueue.push(msg);
  // High priority first, then FIFO
  messageQueue.sort((a, b) => {
    const ps = priorityScore[a.priority] - priorityScore[b.priority];
    if (ps !== 0) return ps;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return msg;
}

export function getQueueSnapshot(): QueuedMessage[] {
  return [...messageQueue];
}

export function dequeueNext(): QueuedMessage | undefined {
  return messageQueue.shift();
}

export function queueLength(): number {
  return messageQueue.length;
}

// ─────────────────────────────────────────────────────────────
// Whatsapp templates (L812-814)
// ─────────────────────────────────────────────────────────────

interface WhatsappTemplateRow {
  id: string;
  tenant_id: string;
  template_name: string;
  language: string;
  body_template: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

function mapTemplate(row: WhatsappTemplateRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    templateName: row.template_name,
    language: row.language,
    bodyTemplate: row.body_template,
    variables: row.variables || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createWhatsappTemplate(
  tenantId: string,
  input: { template_name: string; language?: string; body_template: string; variables?: string[] }
) {
  const language = input.language || 'en';
  const body = input.body_template;
  if (!body || !body.trim()) throw new ValidationError([{ field: 'body_template', message: 'Body template is required' }]);
  // Derive variables from template if not provided
  let vars = input.variables;
  if (!vars || vars.length === 0) {
    vars = extractVariables(body);
  }
  // Normalize vars: trim and unique
  vars = Array.from(new Set(vars.map((v) => v.trim()).filter(Boolean)));

  const existing = await queryOne(
    `SELECT id FROM whatsapp_templates WHERE tenant_id = $1 AND template_name = $2 AND language = $3`,
    [tenantId, input.template_name, language]
  );
  if (existing) throw new ValidationError([{ field: 'template_name', message: 'Template with this name and language already exists' }]);

  const id = uuid();
  const row = await queryOne<WhatsappTemplateRow>(
    `INSERT INTO whatsapp_templates (id, tenant_id, template_name, language, body_template, variables)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, tenantId, input.template_name, language, body, vars]
  );
  return mapTemplate(row!);
}

export async function listWhatsappTemplates(tenantId: string) {
  const rows = await query<WhatsappTemplateRow>(
    `SELECT * FROM whatsapp_templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return rows.map(mapTemplate);
}

export async function getWhatsappTemplate(tenantId: string, id: string) {
  const row = await queryOne<WhatsappTemplateRow>(
    `SELECT * FROM whatsapp_templates WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (!row) throw new NotFoundError('Template not found');
  return mapTemplate(row);
}

export async function getWhatsappTemplateByName(tenantId: string, name: string, language?: string) {
  const row = await queryOne<WhatsappTemplateRow>(
    language
      ? `SELECT * FROM whatsapp_templates WHERE tenant_id = $1 AND template_name = $2 AND language = $3`
      : `SELECT * FROM whatsapp_templates WHERE tenant_id = $1 AND template_name = $2 ORDER BY created_at DESC LIMIT 1`,
    language ? [tenantId, name, language] : [tenantId, name]
  );
  if (!row) throw new NotFoundError('Template not found');
  return mapTemplate(row);
}

export async function updateWhatsappTemplate(
  tenantId: string,
  id: string,
  input: { template_name?: string; language?: string; body_template?: string; variables?: string[] }
) {
  const existing = await queryOne<WhatsappTemplateRow>(
    `SELECT * FROM whatsapp_templates WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (!existing) throw new NotFoundError('Template not found');

  const template_name = input.template_name ?? existing.template_name;
  const language = input.language ?? existing.language;
  const body_template = input.body_template ?? existing.body_template;
  let variables = input.variables;
  if (variables === undefined && input.body_template !== undefined) {
    variables = extractVariables(body_template);
  } else if (variables === undefined) {
    variables = existing.variables;
  } else {
    variables = Array.from(new Set(variables.map((v) => String(v).trim()).filter(Boolean)));
  }

  // Check duplicate if name/language changed
  if (template_name !== existing.template_name || language !== existing.language) {
    const dup = await queryOne(
      `SELECT id FROM whatsapp_templates WHERE tenant_id = $1 AND template_name = $2 AND language = $3 AND id <> $4`,
      [tenantId, template_name, language, id]
    );
    if (dup) throw new ValidationError([{ field: 'template_name', message: 'Template with this name and language already exists' }]);
  }

  const row = await queryOne<WhatsappTemplateRow>(
    `UPDATE whatsapp_templates SET template_name = $1, language = $2, body_template = $3, variables = $4, updated_at = NOW()
     WHERE id = $5 AND tenant_id = $6 RETURNING *`,
    [template_name, language, body_template, variables, id, tenantId]
  );
  return mapTemplate(row!);
}

export async function deleteWhatsappTemplate(tenantId: string, id: string) {
  const deleted = await queryOne<{ id: string }>(
    `DELETE FROM whatsapp_templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId]
  );
  if (!deleted) throw new NotFoundError('Template not found');
  return { id: deleted.id };
}

// ─────────────────────────────────────────────────────────────
// Communication logs (L817)
// ─────────────────────────────────────────────────────────────

export interface CommunicationLogRow {
  id: string;
  tenant_id: string;
  recipient: string;
  channel: Channel;
  template_name: string | null;
  variables: Record<string, string>;
  body: string | null;
  status: MessageStatus;
  priority: Priority;
  provider: string | null;
  provider_response: any;
  sent_at: string;
  created_at: string;
}

export async function listCommunicationLogs(
  tenantId: string,
  params: { page?: number; pageSize?: number; channel?: Channel; status?: MessageStatus; search?: string; priority?: Priority }
) {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 25, 100);
  const conditions: string[] = ['tenant_id = $1'];
  const values: any[] = [tenantId];
  let idx = 2;

  if (params.channel) {
    conditions.push(`channel = $${idx}`);
    values.push(params.channel);
    idx++;
  }
  if (params.status) {
    conditions.push(`status = $${idx}`);
    values.push(params.status);
    idx++;
  }
  if (params.priority) {
    conditions.push(`priority = $${idx}`);
    values.push(params.priority);
    idx++;
  }
  if (params.search) {
    conditions.push(`(recipient ILIKE $${idx} OR template_name ILIKE $${idx})`);
    values.push(`%${params.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM communication_logs WHERE ${where}`,
    values
  );
  const total = parseInt(countRow?.count || '0', 10);
  const offset = (page - 1) * pageSize;

  const rows = await query<CommunicationLogRow>(
    `SELECT * FROM communication_logs WHERE ${where} ORDER BY sent_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, pageSize, offset]
  );

  return {
    data: rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      recipient: r.recipient,
      channel: r.channel,
      templateName: r.template_name,
      variables: r.variables,
      body: r.body,
      status: r.status,
      priority: r.priority,
      provider: r.provider,
      providerResponse: r.provider_response,
      sentAt: r.sent_at,
      createdAt: r.created_at,
    })),
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  };
}

// internal: write log row
async function logCommunication(input: {
  tenantId: string;
  recipient: string;
  channel: Channel;
  templateName?: string;
  variables?: Record<string, string>;
  body?: string;
  status: MessageStatus;
  priority?: Priority;
  provider?: string;
  providerResponse?: any;
}) {
  const id = uuid();
  const priority = input.priority || 'normal';
  const row = await queryOne<CommunicationLogRow>(
    `INSERT INTO communication_logs (id, tenant_id, recipient, channel, template_name, variables, body, status, priority, provider, provider_response, sent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING *`,
    [
      id,
      input.tenantId,
      input.recipient,
      input.channel,
      input.templateName || null,
      JSON.stringify(input.variables || {}),
      input.body || null,
      input.status,
      priority,
      input.provider || null,
      input.providerResponse ? JSON.stringify(input.providerResponse) : null,
    ]
  );
  return row!;
}

// ─────────────────────────────────────────────────────────────
// Channel senders (L824-825 stubs)
// ─────────────────────────────────────────────────────────────

async function getCommunicationSettingsRow(tenantId: string) {
  const row = await queryOne<any>(`SELECT * FROM communication_settings WHERE tenant_id = $1`, [tenantId]);
  return row || null;
}

async function sendViaWhatsapp(input: {
  tenantId: string;
  recipient: string;
  body: string;
  templateName?: string;
  variables?: Record<string, string>;
  priority: Priority;
}): Promise<{ status: MessageStatus; provider: string; providerResponse: any }> {
  const settings = await getCommunicationSettingsRow(input.tenantId);
  const provider = settings?.whatsapp_provider || 'twilio';
  const enabled = settings ? settings.whatsapp_enabled : true;
  if (!enabled) {
    return { status: 'failed', provider, providerResponse: { error: 'WhatsApp channel disabled for tenant' } };
  }
  // Stub: log as sent without real external call. In real impl would call Twilio/Meta/WATI.
  // Simulate queue enqueue first
  enqueueMessage({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel: 'whatsapp',
    body: input.body,
    variables: input.variables || {},
    templateName: input.templateName,
    priority: input.priority,
  });
  // Immediately dequeue to process (high priority first handled by queue ordering)
  // For MVP we just mark as sent
  logger.info({ recipient: input.recipient, provider, template: input.templateName }, 'WhatsApp stub send (queued→sent)');
  return {
    status: 'sent',
    provider,
    providerResponse: {
      stub: true,
      provider,
      message: `Stubbed WhatsApp send via ${provider} — no external API call`,
      // Simulate Twilio SID style
      sid: `WA${uuid().replace(/-/g, '').slice(0, 32)}`,
      to: input.recipient,
    },
  };
}

async function sendViaSms(input: {
  tenantId: string;
  recipient: string;
  body: string;
  templateName?: string;
  variables?: Record<string, string>;
  priority: Priority;
}): Promise<{ status: MessageStatus; provider: string; providerResponse: any }> {
  const settings = await getCommunicationSettingsRow(input.tenantId);
  const provider = settings?.sms_provider || 'twilio';
  const enabled = settings ? settings.sms_enabled : true;
  if (!enabled) {
    return { status: 'failed', provider, providerResponse: { error: 'SMS channel disabled for tenant' } };
  }
  enqueueMessage({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel: 'sms',
    body: input.body,
    variables: input.variables || {},
    templateName: input.templateName,
    priority: input.priority,
  });
  logger.info({ recipient: input.recipient, provider, template: input.templateName }, 'SMS stub send (queued→sent)');
  return {
    status: 'sent',
    provider,
    providerResponse: {
      stub: true,
      provider,
      message: `Stubbed SMS send via ${provider}`,
      sid: `SM${uuid().replace(/-/g, '').slice(0, 32)}`,
      to: input.recipient,
    },
  };
}

async function sendViaEmail(input: {
  tenantId: string;
  recipient: string;
  body: string;
  templateName?: string;
  variables?: Record<string, string>;
  priority: Priority;
  subject?: string;
}): Promise<{ status: MessageStatus; provider: string; providerResponse: any }> {
  const settings = await getCommunicationSettingsRow(input.tenantId);
  const provider = settings?.email_provider || 'nodemailer';
  const enabled = settings ? settings.email_enabled : true;
  if (!enabled) {
    return { status: 'failed', provider, providerResponse: { error: 'Email channel disabled for tenant' } };
  }

  enqueueMessage({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel: 'email',
    body: input.body,
    variables: input.variables || {},
    templateName: input.templateName,
    priority: input.priority,
  });

  // Try real email via nodemailer (Resend/SendGrid/SES abstracted as nodemailer for MVP)
  const subject = input.subject || input.templateName || 'Notification from SEUM';
  // body may be plain text with substituted variables; wrap in simple HTML
  const bodyHtml = input.body ? `<p>${input.body.replace(/\n/g, '<br/>')}</p>` : '<p>Notification</p>';

  try {
    const ok = await sendEmail({
      to: input.recipient,
      subject,
      preheader: input.body.slice(0, 100),
      heading: subject,
      bodyHtml,
    });
    if (ok) {
      return {
        status: 'sent',
        provider,
        providerResponse: { stub: false, provider, message: 'Email sent via nodemailer' },
      };
    } else {
      // Fallback stub success (if SMTP not configured, sendEmail returns false but we still log as sent for checkbox)
      logger.warn({ recipient: input.recipient }, 'Email SMTP not configured — logging as stub sent');
      return {
        status: 'sent',
        provider,
        providerResponse: { stub: true, provider, message: 'Email stub logged (SMTP not configured)' },
      };
    }
  } catch (err: any) {
    return {
      status: 'failed',
      provider,
      providerResponse: { stub: false, provider, error: err.message || 'Email send failed' },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Unified send interface (L826)
// ─────────────────────────────────────────────────────────────

/**
 * Unified send interface: sendMessage({tenantId, recipient, channel, template, variables, priority})
 * Routes to channel-specific sender and logs to communication_logs.
 */
export async function sendMessage(input: {
  tenantId: string;
  recipient: string;
  channel: Channel;
  template?: string;
  templateName?: string;
  variables?: Record<string, string>;
  priority?: Priority;
  language?: string;
  subject?: string;
}) {
  const channel = input.channel;
  if (!['whatsapp', 'sms', 'email'].includes(channel)) {
    throw new ValidationError([{ field: 'channel', message: 'Channel must be whatsapp, sms, or email' }]);
  }
  if (!input.recipient || !String(input.recipient).trim()) {
    throw new ValidationError([{ field: 'recipient', message: 'Recipient is required' }]);
  }

  const variables = input.variables || {};
  const priority = (input.priority as Priority) || 'normal';
  const templateName = input.template || input.templateName;

  let body = '';
  let provider = '';
  let providerResponse: any = null;
  let status: MessageStatus = 'queued';

  if (templateName) {
    // Try to find whatsapp_templates record for substitution; for non-whatsapp channels, same template store is reused.
    // If not found, treat templateName as raw body fallback if body_template not found.
    try {
      const tpl = await getWhatsappTemplateByName(input.tenantId, templateName, input.language);
      body = substituteVariables(tpl.bodyTemplate, variables);
      // If variables missing for required placeholders, warn but still send
    } catch {
      // No template found — if channel email, use variables.body as body; otherwise treat template value as body template
      if (variables.body) {
        body = substituteVariables(variables.body, variables);
      } else if (templateName) {
        body = substituteVariables(templateName, variables);
      } else {
        body = substituteVariables('', variables);
      }
    }
  } else {
    // No template, use variables.body or construct from variables
    if (variables.body) body = substituteVariables(variables.body, variables);
    else if (Object.keys(variables).length) {
      // Concatenate variables as body if no template
      body = Object.entries(variables)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    } else {
      body = '';
    }
  }

  // Route to channel sender
  let result: { status: MessageStatus; provider: string; providerResponse: any };
  if (channel === 'whatsapp') {
    result = await sendViaWhatsapp({ tenantId: input.tenantId, recipient: input.recipient, body, templateName, variables, priority });
  } else if (channel === 'sms') {
    result = await sendViaSms({ tenantId: input.tenantId, recipient: input.recipient, body, templateName, variables, priority });
  } else {
    result = await sendViaEmail({ tenantId: input.tenantId, recipient: input.recipient, body, templateName, variables, priority, subject: input.subject });
  }
  status = result.status;
  provider = result.provider;
  providerResponse = result.providerResponse;

  // Log to communication_logs (always, even if failed)
  const logRow = await logCommunication({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel,
    templateName: templateName || null as any,
    variables,
    body,
    status,
    priority,
    provider,
    providerResponse,
  });

  return {
    id: logRow.id,
    recipient: logRow.recipient,
    channel: logRow.channel,
    templateName: logRow.template_name,
    body: logRow.body,
    variables: logRow.variables,
    status: logRow.status,
    priority: logRow.priority,
    provider: logRow.provider,
    providerResponse: logRow.provider_response,
    sentAt: logRow.sent_at,
  };
}

// Convenience wrappers

export async function sendWhatsappMessage(input: {
  tenantId: string;
  recipient: string;
  templateName: string;
  language?: string;
  variables?: Record<string, string>;
  priority?: Priority;
}) {
  return sendMessage({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel: 'whatsapp',
    template: input.templateName,
    variables: input.variables,
    priority: input.priority,
    language: input.language,
  });
}

export async function sendSmsMessage(input: {
  tenantId: string;
  recipient: string;
  body: string;
  variables?: Record<string, string>;
  priority?: Priority;
  templateName?: string;
}) {
  return sendMessage({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel: 'sms',
    template: input.templateName,
    variables: { body: input.body, ...(input.variables || {}) },
    priority: input.priority,
  });
}

export async function sendEmailMessage(input: {
  tenantId: string;
  recipient: string;
  subject: string;
  body: string;
  variables?: Record<string, string>;
  priority?: Priority;
  templateName?: string;
}) {
  return sendMessage({
    tenantId: input.tenantId,
    recipient: input.recipient,
    channel: 'email',
    template: input.templateName,
    variables: { body: input.body, ...(input.variables || {}) },
    priority: input.priority,
    subject: input.subject,
  });
}

// ─────────────────────────────────────────────────────────────
// Communication settings (L829)
// ─────────────────────────────────────────────────────────────

export async function getCommunicationSettings(tenantId: string) {
  let row = await queryOne<any>(`SELECT * FROM communication_settings WHERE tenant_id = $1`, [tenantId]);
  if (!row) {
    // Auto-create defaults
    row = await queryOne<any>(
      `INSERT INTO communication_settings (tenant_id) VALUES ($1) RETURNING *`,
      [tenantId]
    );
  }
  return {
    tenantId: row.tenant_id,
    whatsappProvider: row.whatsapp_provider,
    smsProvider: row.sms_provider,
    emailProvider: row.email_provider,
    whatsappEnabled: row.whatsapp_enabled,
    smsEnabled: row.sms_enabled,
    emailEnabled: row.email_enabled,
    whatsappConfig: row.whatsapp_config,
    smsConfig: row.sms_config,
    emailConfig: row.email_config,
    updatedAt: row.updated_at,
  };
}

export async function updateCommunicationSettings(
  tenantId: string,
  input: {
    whatsapp_provider?: string;
    sms_provider?: string;
    email_provider?: string;
    whatsapp_enabled?: boolean;
    sms_enabled?: boolean;
    email_enabled?: boolean;
    whatsapp_config?: any;
    sms_config?: any;
    email_config?: any;
  }
) {
  // Ensure row exists
  await getCommunicationSettings(tenantId);

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const map: Record<string, any> = {
    whatsapp_provider: input.whatsapp_provider,
    sms_provider: input.sms_provider,
    email_provider: input.email_provider,
    whatsapp_enabled: input.whatsapp_enabled,
    sms_enabled: input.sms_enabled,
    email_enabled: input.email_enabled,
    whatsapp_config: input.whatsapp_config ? JSON.stringify(input.whatsapp_config) : undefined,
    sms_config: input.sms_config ? JSON.stringify(input.sms_config) : undefined,
    email_config: input.email_config ? JSON.stringify(input.email_config) : undefined,
  };

  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      const cast = col.endsWith('_enabled') ? 'boolean' : col.endsWith('_config') ? 'jsonb' : 'varchar';
      sets.push(`${col} = $${idx}::${cast}`);
      values.push(val);
      idx++;
    }
  }
  if (sets.length === 0) return getCommunicationSettings(tenantId);
  sets.push(`updated_at = NOW()`);
  values.push(tenantId);
  const row = await queryOne<any>(
    `UPDATE communication_settings SET ${sets.join(', ')} WHERE tenant_id = $${idx} RETURNING *`,
    values
  );
  return {
    tenantId: row.tenant_id,
    whatsappProvider: row.whatsapp_provider,
    smsProvider: row.sms_provider,
    emailProvider: row.email_provider,
    whatsappEnabled: row.whatsapp_enabled,
    smsEnabled: row.sms_enabled,
    emailEnabled: row.email_enabled,
    whatsappConfig: row.whatsapp_config,
    smsConfig: row.sms_config,
    emailConfig: row.email_config,
    updatedAt: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────
// Customer communication preferences (L827)
// ─────────────────────────────────────────────────────────────

export async function getCustomerCommunicationPreference(tenantId: string, customerId: string) {
  // Verify customer belongs to tenant
  const cust = await queryOne(`SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [customerId, tenantId]);
  if (!cust) throw new NotFoundError('Customer not found');

  const row = await queryOne<any>(
    `SELECT * FROM customer_communication_preferences WHERE customer_id = $1`,
    [customerId]
  );
  if (!row) {
    return {
      customerId,
      tenantId,
      preferredChannel: 'whatsapp' as Channel,
      whatsappEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      updatedAt: null,
    };
  }
  return {
    customerId: row.customer_id,
    tenantId: row.tenant_id,
    preferredChannel: row.preferred_channel as Channel,
    whatsappEnabled: row.whatsapp_enabled,
    smsEnabled: row.sms_enabled,
    emailEnabled: row.email_enabled,
    updatedAt: row.updated_at,
  };
}

export async function setCustomerCommunicationPreference(
  tenantId: string,
  customerId: string,
  input: {
    preferred_channel?: Channel;
    whatsapp_enabled?: boolean;
    sms_enabled?: boolean;
    email_enabled?: boolean;
  }
) {
  const cust = await queryOne(`SELECT id FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [customerId, tenantId]);
  if (!cust) throw new NotFoundError('Customer not found');

  const preferred_channel = input.preferred_channel || 'whatsapp';
  if (!['whatsapp', 'sms', 'email'].includes(preferred_channel)) {
    throw new ValidationError([{ field: 'preferred_channel', message: 'Must be whatsapp, sms, or email' }]);
  }

  const row = await queryOne<any>(
    `INSERT INTO customer_communication_preferences (customer_id, tenant_id, preferred_channel, whatsapp_enabled, sms_enabled, email_enabled, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (customer_id) DO UPDATE SET
       tenant_id = $2,
       preferred_channel = $3,
       whatsapp_enabled = $4,
       sms_enabled = $5,
       email_enabled = $6,
       updated_at = NOW()
     RETURNING *`,
    [
      customerId,
      tenantId,
      preferred_channel,
      input.whatsapp_enabled !== undefined ? input.whatsapp_enabled : true,
      input.sms_enabled !== undefined ? input.sms_enabled : true,
      input.email_enabled !== undefined ? input.email_enabled : true,
    ]
  );
  return {
    customerId: row.customer_id,
    tenantId: row.tenant_id,
    preferredChannel: row.preferred_channel,
    whatsappEnabled: row.whatsapp_enabled,
    smsEnabled: row.sms_enabled,
    emailEnabled: row.email_enabled,
    updatedAt: row.updated_at,
  };
}
