/**
 * WhatsApp message templates shared by the client (preview) and the server
 * (actual send). Keep this file free of server-only imports.
 */

export type WhatsAppTemplateId =
  | "queue_joined"
  | "queue_you_are_next"
  | "queue_exit_recovery"
  | "event_registration"
  | "event_reminder"
  | "event_checkin"
  | "event_certificate"
  | "feedback_request"
  | "feedback_followup";

export type WhatsAppModule = "QueueAI" | "EventAI" | "FeedbackAI" | "Platform";

export interface WhatsAppTemplate {
  id: WhatsAppTemplateId;
  name: string;
  module: WhatsAppModule;
  description: string;
  /** Variables the body expects, e.g. {{name}} */
  variables: string[];
  body: string;
}

export const whatsappTemplates: WhatsAppTemplate[] = [
  {
    id: "queue_joined",
    name: "Queue confirmation",
    module: "QueueAI",
    description: "Sent the moment a customer scans the QR and joins the queue.",
    variables: ["name", "position", "eta"],
    body: "Hi {{name}}\n\nYou have joined the queue.\n\nCurrent Position:\n{{position}}\n\nEstimated Wait:\n{{eta}} minutes.",
  },
  {
    id: "queue_you_are_next",
    name: "You're next",
    module: "QueueAI",
    description: "Triggered when a customer is two positions away from being served.",
    variables: ["name", "token", "business"],
    body:
      "{{name}}, you're next! 🎉\n\nPlease head to the counter at {{business}} — token *{{token}}* will be called in a moment.",
  },
  {
    id: "queue_exit_recovery",
    name: "Exit recovery",
    module: "QueueAI",
    description: "Win-back message sent a few hours after a customer leaves the queue.",
    variables: ["name", "business", "link"],
    body:
      "Sorry we kept you waiting, {{name}}. 🙏\n\nBook a guaranteed slot at {{business}} with no wait: {{link}}",
  },
  {
    id: "event_registration",
    name: "Registration confirmed",
    module: "EventAI",
    description: "Confirmation with the attendee's QR check-in pass.",
    variables: ["name", "event", "date", "venue", "link"],
    body:
      "You're registered, {{name}} ✅\n\n*{{event}}*\n📅 {{date}}\n📍 {{venue}}\n\nYour QR check-in pass: {{link}}\n\nSave this message — you'll need the pass at the entrance.",
  },
  {
    id: "event_reminder",
    name: "Event reminder",
    module: "EventAI",
    description: "Sent 24 hours before the event starts.",
    variables: ["name", "event", "date", "venue"],
    body:
      "Reminder: *{{event}}* starts tomorrow.\n\n📅 {{date}}\n📍 {{venue}}\n\nSee you there, {{name}}! Bring your QR pass for instant check-in.",
  },
  {
    id: "event_checkin",
    name: "Check-in confirmed",
    module: "EventAI",
    description: "Sent when an attendee's QR code is scanned at the venue.",
    variables: ["name", "event"],
    body: "Checked in ✅\n\nWelcome to *{{event}}*, {{name}}. Enjoy the sessions!",
  },
  {
    id: "event_certificate",
    name: "Certificate delivery",
    module: "EventAI",
    description: "Delivers the participation certificate after the event ends.",
    variables: ["name", "event", "link"],
    body:
      "Thanks for attending *{{event}}*, {{name}}.\n\nYour participation certificate is ready: {{link}}",
  },
  {
    id: "feedback_request",
    name: "Feedback request",
    module: "FeedbackAI",
    description: "Asks for a rating right after a visit, event or service.",
    variables: ["name", "business", "link"],
    body:
      "Hi {{name}}, how was your experience at {{business}}?\n\nRate us in 10 seconds: {{link}}\n\nYour answer goes straight to the team — thank you! 🙏",
  },
  {
    id: "feedback_followup",
    name: "Negative feedback follow-up",
    module: "FeedbackAI",
    description: "Personal apology and recovery offer after negative sentiment is detected.",
    variables: ["name", "business", "issue"],
    body:
      "{{name}}, we're sorry your visit to {{business}} fell short — you mentioned *{{issue}}*.\n\nA manager will reach out shortly to make it right. Thank you for telling us.",
  },
];

export function getTemplate(id: WhatsAppTemplateId): WhatsAppTemplate {
  const template = whatsappTemplates.find((t) => t.id === id);
  if (!template) throw new Error(`Unknown WhatsApp template: ${id}`);
  return template;
}

/** Replaces {{var}} tokens. Missing values fall back to the token name. */
export function renderTemplate(
  id: WhatsAppTemplateId,
  variables: Record<string, string | number> = {},
): string {
  return getTemplate(id).body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === "" ? `{{${key}}}` : String(value);
  });
}

/** Loose E.164 check: + followed by 8-15 digits. */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ""));
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

export function maskPhone(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.length < 6) return clean;
  return `${clean.slice(0, 3)}•••••${clean.slice(-3)}`;
}
