import { pool } from './db';

const migration = `
-- Phase 8: Notification Engine additions
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_seen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS notification_preferences (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- ============================================================
-- Phase 8.2 & 8.3: WhatsApp / SMS / Email unified communications
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WhatsApp templates (L812)
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  body_template TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, template_name, language)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates(template_name);

-- Unified sent message log / communication logs (L817) — also covers L816 queue status
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  template_name VARCHAR(100),
  variables JSONB NOT NULL DEFAULT '{}',
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('high','normal','low')),
  provider VARCHAR(50),
  provider_response JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comm_logs_tenant ON communication_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_channel ON communication_logs(channel);
CREATE INDEX IF NOT EXISTS idx_comm_logs_status ON communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_comm_logs_sent_at ON communication_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_comm_logs_priority ON communication_logs(priority);

-- Alias: sent_messages view for backward compat (if code references it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sent_messages') THEN
    CREATE VIEW sent_messages AS SELECT * FROM communication_logs;
  END IF;
END $$;

-- Customer communication preferences (L827)
CREATE TABLE IF NOT EXISTS customer_communication_preferences (
  customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  preferred_channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp','sms','email')),
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cust_comm_prefs_tenant ON customer_communication_preferences(tenant_id);

-- Tenant-level communication settings (L829)
CREATE TABLE IF NOT EXISTS communication_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_provider VARCHAR(50) NOT NULL DEFAULT 'twilio' CHECK (whatsapp_provider IN ('twilio','meta','wati','direct')),
  sms_provider VARCHAR(50) NOT NULL DEFAULT 'twilio' CHECK (sms_provider IN ('twilio','vonage','other')),
  email_provider VARCHAR(50) NOT NULL DEFAULT 'nodemailer' CHECK (email_provider IN ('resend','sendgrid','ses','nodemailer')),
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_config JSONB NOT NULL DEFAULT '{}',
  sms_config JSONB NOT NULL DEFAULT '{}',
  email_config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
`;

async function run() {
  console.log('Running Phase 8 migration...');
  await pool.query(migration);
  console.log('Phase 8 migration completed successfully');
  await pool.end();
}

run().catch((err) => {
  console.error('Phase 8 migration failed:', err);
  process.exit(1);
});
