/**
 * notifier.js — pluggable notification dispatch.
 *
 * The challenge asks for "an internal feature to send notifications via any
 * medium". Rather than hardcode one channel, this is a small pub-sub of
 * channels. Every notification is persisted (so the in-app bell works even if
 * an external channel is down) and then fanned out to every enabled channel.
 *
 * Channels are intentionally simple/stubbed so the app runs with zero external
 * credentials, but the WEBHOOK channel makes a real HTTP POST if a URL is set,
 * proving the "any medium" abstraction is real, not decorative.
 */
import { store } from '../store.js';

// --- Channels ---------------------------------------------------------------

const consoleChannel = {
  name: 'console',
  enabled: true,
  async send(n) {
    // Server-side "delivery". Visible in the terminal running the API.
    console.log(`[NOTIFY:${n.type.toUpperCase()}] ${n.title} — ${n.message}`);
    return { ok: true };
  },
};

const webhookChannel = {
  name: 'webhook',
  get enabled() {
    return Boolean(process.env.NOTIFY_WEBHOOK_URL);
  },
  async send(n) {
    const url = process.env.NOTIFY_WEBHOOK_URL;
    if (!url) return { ok: false, skipped: true };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: `*${n.title}*\n${n.message}`, ...n }),
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      // A dead webhook must never break the ledger write that triggered it.
      console.warn(`[notifier] webhook failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  },
};

// Email is stubbed (no SMTP creds in a demo) but shows where a real transport
// (nodemailer/SES) would slot in without touching callers.
const emailChannel = {
  name: 'email',
  get enabled() {
    return Boolean(process.env.NOTIFY_EMAIL_TO);
  },
  async send(n) {
    console.log(`[EMAIL→${process.env.NOTIFY_EMAIL_TO}] ${n.title}: ${n.message}`);
    return { ok: true, simulated: true };
  },
};

const channels = [consoleChannel, webhookChannel, emailChannel];

// --- Public API -------------------------------------------------------------

/**
 * Persist a notification and dispatch to every enabled channel.
 * Returns the stored record (so the API can echo it back).
 */
export async function notify({ type = 'info', title, message, meta = {} }) {
  const record = store.addNotification({ type, title, message, meta });
  const enabled = channels.filter((c) => c.enabled);
  // Fan out concurrently; failures are swallowed per-channel above.
  await Promise.allSettled(enabled.map((c) => c.send(record)));
  return record;
}

export function activeChannels() {
  return channels.filter((c) => c.enabled).map((c) => c.name);
}
