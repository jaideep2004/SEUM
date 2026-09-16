import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as commService from '../services/communicationService';
import { sendSuccess, sendPaginated } from '../utils/response';

// ── Validation schemas ──

const whatsappTemplateSchema = z.object({
  template_name: z.string().min(1).max(100),
  templateName: z.string().min(1).max(100).optional(),
  language: z.string().min(2).max(10).optional(),
  body_template: z.string().min(1),
  bodyTemplate: z.string().min(1).optional(),
  variables: z.array(z.string().min(1).max(50)).optional(),
});

const whatsappTemplateUpdateSchema = z.object({
  template_name: z.string().min(1).max(100).optional(),
  templateName: z.string().min(1).max(100).optional(),
  language: z.string().min(2).max(10).optional(),
  body_template: z.string().min(1).optional(),
  bodyTemplate: z.string().min(1).optional(),
  variables: z.array(z.string().min(1).max(50)).optional(),
});

const sendWhatsappSchema = z.object({
  recipient: z.string().min(5).max(255),
  templateName: z.string().min(1).max(100).optional(),
  template_name: z.string().min(1).max(100).optional(),
  template: z.string().min(1).max(100).optional(),
  language: z.string().min(2).max(10).optional(),
  variables: z.record(z.string()).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
});

const unifiedSendSchema = z.object({
  recipient: z.string().min(5).max(255),
  channel: z.enum(['whatsapp', 'sms', 'email']),
  template: z.string().min(1).max(500).optional(),
  templateName: z.string().min(1).max(100).optional(),
  template_name: z.string().min(1).max(100).optional(),
  variables: z.record(z.string()).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  language: z.string().min(2).max(10).optional(),
  subject: z.string().max(255).optional(),
});

const logsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  channel: z.enum(['whatsapp', 'sms', 'email']).optional(),
  status: z.enum(['queued', 'sent', 'delivered', 'failed']).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  search: z.string().optional(),
});

const settingsSchema = z.object({
  whatsapp_provider: z.enum(['twilio', 'meta', 'wati', 'direct']).optional(),
  whatsappProvider: z.enum(['twilio', 'meta', 'wati', 'direct']).optional(),
  sms_provider: z.enum(['twilio', 'vonage', 'other']).optional(),
  smsProvider: z.enum(['twilio', 'vonage', 'other']).optional(),
  email_provider: z.enum(['resend', 'sendgrid', 'ses', 'nodemailer']).optional(),
  emailProvider: z.enum(['resend', 'sendgrid', 'ses', 'nodemailer']).optional(),
  whatsapp_enabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  whatsapp_config: z.record(z.any()).optional(),
  whatsappConfig: z.record(z.any()).optional(),
  sms_config: z.record(z.any()).optional(),
  smsConfig: z.record(z.any()).optional(),
  email_config: z.record(z.any()).optional(),
  emailConfig: z.record(z.any()).optional(),
});

const customerPrefSchema = z.object({
  preferred_channel: z.enum(['whatsapp', 'sms', 'email']).optional(),
  preferredChannel: z.enum(['whatsapp', 'sms', 'email']).optional(),
  whatsapp_enabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

function normalizeTemplateInput(raw: any) {
  return {
    template_name: raw.template_name || raw.templateName || raw.template,
    language: raw.language,
    body_template: raw.body_template || raw.bodyTemplate || raw.body,
    variables: raw.variables,
  };
}

// ── Handlers ──

export async function listWhatsappTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await commService.listWhatsappTemplates(req.user!.tenantId);
    sendSuccess(res, data, 'Templates fetched');
  } catch (err) { next(err); }
}

export async function createWhatsappTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = whatsappTemplateSchema.parse(req.body);
    const input = normalizeTemplateInput(raw);
    const result = await commService.createWhatsappTemplate(req.user!.tenantId, input as any);
    sendSuccess(res, result, 'Template created', undefined, 201);
  } catch (err) { next(err); }
}

export async function getWhatsappTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await commService.getWhatsappTemplate(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Template fetched');
  } catch (err) { next(err); }
}

export async function updateWhatsappTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = whatsappTemplateUpdateSchema.parse(req.body);
    const input = normalizeTemplateInput(raw);
    // Clean undefined
    const cleaned: any = {};
    if (input.template_name) cleaned.template_name = input.template_name;
    if (input.language) cleaned.language = input.language;
    if (input.body_template) cleaned.body_template = input.body_template;
    if (input.variables !== undefined) cleaned.variables = input.variables;
    const result = await commService.updateWhatsappTemplate(req.user!.tenantId, req.params.id, cleaned);
    sendSuccess(res, result, 'Template updated');
  } catch (err) { next(err); }
}

export async function deleteWhatsappTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await commService.deleteWhatsappTemplate(req.user!.tenantId, req.params.id);
    sendSuccess(res, result, 'Template deleted');
  } catch (err) { next(err); }
}

export async function sendWhatsapp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = sendWhatsappSchema.parse(req.body);
    const templateName = body.templateName || body.template_name || body.template || '';
    if (!templateName) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'templateName is required' } });
    }
    const result = await commService.sendWhatsappMessage({
      tenantId: req.user!.tenantId,
      recipient: body.recipient,
      templateName,
      language: body.language,
      variables: body.variables || {},
      priority: body.priority as any,
    });
    sendSuccess(res, result, 'WhatsApp message queued', undefined, 201);
  } catch (err) { next(err); }
}

export async function unifiedSend(req: Request, res: Response, next: NextFunction) {
  try {
    const body = unifiedSendSchema.parse(req.body);
    const template = body.template || body.templateName || body.template_name;
    const result = await commService.sendMessage({
      tenantId: req.user!.tenantId,
      recipient: body.recipient,
      channel: body.channel as any,
      template,
      variables: body.variables || {},
      priority: body.priority as any,
      language: body.language,
      subject: body.subject,
    });
    sendSuccess(res, result, `Message sent via ${body.channel}`, undefined, 201);
  } catch (err) { next(err); }
}

export async function listLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const q = logsQuerySchema.parse(req.query);
    const result = await commService.listCommunicationLogs(req.user!.tenantId, q as any);
    sendPaginated(res, result.data, result.meta.total, result.meta.page, result.meta.pageSize, 'Logs fetched');
  } catch (err) { next(err); }
}

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await commService.getCommunicationSettings(req.user!.tenantId);
    sendSuccess(res, result, 'Communication settings');
  } catch (err) { next(err); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = settingsSchema.parse(req.body);
    const input: any = {
      whatsapp_provider: raw.whatsapp_provider || raw.whatsappProvider,
      sms_provider: raw.sms_provider || raw.smsProvider,
      email_provider: raw.email_provider || raw.emailProvider,
      whatsapp_enabled: raw.whatsapp_enabled ?? raw.whatsappEnabled,
      sms_enabled: raw.sms_enabled ?? raw.smsEnabled,
      email_enabled: raw.email_enabled ?? raw.emailEnabled,
      whatsapp_config: raw.whatsapp_config || raw.whatsappConfig,
      sms_config: raw.sms_config || raw.smsConfig,
      email_config: raw.email_config || raw.emailConfig,
    };
    // Remove undefined
    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
    const result = await commService.updateCommunicationSettings(req.user!.tenantId, input);
    sendSuccess(res, result, 'Communication settings updated');
  } catch (err) { next(err); }
}

export async function getCustomerPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await commService.getCustomerCommunicationPreference(req.user!.tenantId, req.params.customerId);
    sendSuccess(res, result, 'Customer communication preference');
  } catch (err) { next(err); }
}

export async function updateCustomerPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = customerPrefSchema.parse(req.body);
    const input: any = {
      preferred_channel: raw.preferred_channel || raw.preferredChannel,
      whatsapp_enabled: raw.whatsapp_enabled ?? raw.whatsappEnabled,
      sms_enabled: raw.sms_enabled ?? raw.smsEnabled,
      email_enabled: raw.email_enabled ?? raw.emailEnabled,
    };
    Object.keys(input).forEach((k) => input[k] === undefined && delete input[k]);
    const result = await commService.setCustomerCommunicationPreference(req.user!.tenantId, req.params.customerId, input);
    sendSuccess(res, result, 'Customer communication preference updated');
  } catch (err) { next(err); }
}

// Preview substitution (utility for frontend)
export async function previewTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      body_template: z.string().optional(),
      bodyTemplate: z.string().optional(),
      variables: z.record(z.string()).optional(),
    });
    const body = schema.parse(req.body);
    const template = body.body_template || body.bodyTemplate || '';
    const vars = body.variables || {};
    const rendered = commService.substituteVariables(template, vars as Record<string, string>);
    const extracted = commService.extractVariables(template);
    sendSuccess(res, { rendered, variables: extracted }, 'Preview generated');
  } catch (err) { next(err); }
}
