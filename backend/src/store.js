/**
 * store.js — tiny persistence layer.
 *
 * A deliberately small "repository" over an atomic JSON file. This keeps the
 * app dependency-free (no native builds, no DB server) while isolating every
 * read/write behind one interface. Swapping to SQLite/Postgres later means
 * reimplementing ONLY this file — routes and services never touch disk.
 *
 * Writes are atomic (write-temp-then-rename) so a crash mid-write can never
 * corrupt the ledger — an easy edge case to get wrong.
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'ledger.json');

const EMPTY = { transactions: [], notifications: [], meta: { seq: 0 } };

function ensureFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
}

function load() {
  ensureFile();
  try {
    const raw = readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(raw);
    // Defensive: tolerate partially-shaped files.
    return {
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      meta: data.meta && typeof data.meta.seq === 'number' ? data.meta : { seq: 0 },
    };
  } catch {
    // Corrupt file — start clean rather than crash the whole API.
    return structuredClone(EMPTY);
  }
}

function persist(data) {
  ensureFile();
  const tmp = DB_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, DB_FILE); // atomic on same filesystem
}

// In-memory cache kept in sync with disk; every mutation persists immediately.
let db = load();

function nextId(prefix) {
  db.meta.seq += 1;
  return `${prefix}_${db.meta.seq}`;
}

export const store = {
  // ---- transactions ----
  listTransactions() {
    return [...db.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  },
  getTransaction(id) {
    return db.transactions.find((t) => t.id === id) || null;
  },
  addTransaction(tx) {
    const record = { id: nextId('txn'), createdAt: new Date().toISOString(), ...tx };
    db.transactions.push(record);
    persist(db);
    return record;
  },
  deleteTransaction(id) {
    const before = db.transactions.length;
    db.transactions = db.transactions.filter((t) => t.id !== id);
    const removed = db.transactions.length < before;
    if (removed) persist(db);
    return removed;
  },

  // ---- notifications ----
  listNotifications() {
    return [...db.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  addNotification(n) {
    const record = { id: nextId('ntf'), createdAt: new Date().toISOString(), read: false, ...n };
    db.notifications.unshift(record);
    persist(db);
    return record;
  },
  markNotificationRead(id) {
    const n = db.notifications.find((x) => x.id === id);
    if (!n) return null;
    n.read = true;
    persist(db);
    return n;
  },
  markAllNotificationsRead() {
    db.notifications.forEach((n) => (n.read = true));
    persist(db);
    return db.notifications.length;
  },

  // ---- test / util ----
  _reset() {
    db = structuredClone(EMPTY);
    persist(db);
  },
};
