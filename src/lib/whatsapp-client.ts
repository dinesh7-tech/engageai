import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { sendWhatsAppMessage, type SendWhatsAppResult } from "./whatsapp.functions";
import {
  getTemplate,
  isValidPhone,
  renderTemplate,
  type WhatsAppModule,
  type WhatsAppTemplateId,
} from "./whatsapp-templates";

export interface OutboxEntry {
  id: string;
  to: string;
  recipient: string;
  module: WhatsAppModule;
  templateId: WhatsAppTemplateId;
  templateName: string;
  body: string;
  outcome: "sent" | "simulated" | "failed";
  providerId?: string;
  error?: string;
  sentAt: string;
}

const STORAGE_KEY = "engageai.whatsapp.outbox";

let outbox: OutboxEntry[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(outbox.slice(0, 100)));
  } catch {
    /* storage unavailable — keep the in-memory log */
  }
}

function hydrate() {
  if (typeof window === "undefined" || outbox.length > 0) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) outbox = JSON.parse(raw) as OutboxEntry[];
  } catch {
    outbox = [];
  }
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWhatsAppOutbox(): OutboxEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => outbox,
    () => outbox,
  );
}

export function clearOutbox() {
  outbox = [];
  persist();
  emit();
}

export interface DispatchOptions {
  to: string;
  recipient: string;
  templateId: WhatsAppTemplateId;
  variables?: Record<string, string | number>;
  body?: string;
  /** Show a toast for the result. Defaults to true. */
  notify?: boolean;
  workspaceId?: string | undefined;
}

/**
 * Sends a WhatsApp message through the server provider and records it in the
 * workspace outbox so every module shares one delivery log.
 */
export async function dispatchWhatsApp(options: DispatchOptions): Promise<SendWhatsAppResult | null> {
  const template = getTemplate(options.templateId);

  if (!isValidPhone(options.to)) {
    toast.error(`No valid WhatsApp number for ${options.recipient}`);
    return null;
  }

  const preview = options.body ?? renderTemplate(options.templateId, options.variables ?? {});

  try {
    const result = await sendWhatsAppMessage({
      data: {
        to: options.to,
        templateId: options.templateId,
        variables: options.variables ?? {},
        ...(options.body ? { body: options.body } : {}),
        ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
      },
    });

    record({
      to: result.to,
      recipient: options.recipient,
      module: template.module,
      templateId: template.id,
      templateName: template.name,
      body: result.body,
      outcome: result.outcome,
      ...(result.providerId ? { providerId: result.providerId } : {}),
      ...(result.error ? { error: result.error } : {}),
      sentAt: result.sentAt,
    });

    if (options.notify !== false) {
      if (result.outcome === "sent") {
        toast.success(`WhatsApp "${template.name}" delivered to ${options.recipient}`);
      } else if (result.outcome === "simulated") {
        toast.info(`Simulated "${template.name}" to ${options.recipient}`, {
          description: "Connect the WhatsApp provider to deliver for real.",
        });
      } else {
        toast.error(`WhatsApp send failed for ${options.recipient}`, {
          description: result.error ?? "The provider rejected the message.",
        });
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    record({
      to: options.to,
      recipient: options.recipient,
      module: template.module,
      templateId: template.id,
      templateName: template.name,
      body: preview,
      outcome: "failed",
      error: message,
      sentAt: new Date().toISOString(),
    });
    if (options.notify !== false) toast.error(`WhatsApp send failed: ${message}`);
    return null;
  }
}

function record(entry: Omit<OutboxEntry, "id">) {
  outbox = [{ id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, ...entry }, ...outbox].slice(0, 100);
  persist();
  emit();
}
