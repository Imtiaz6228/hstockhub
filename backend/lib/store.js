const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function defaultDb() {
  return {
    users: [
      { id: 'usr_buyer', role: 'buyer', name: 'Demo Buyer', email: 'buyer@example.com', passwordHash: hashPassword('buyer123'), createdAt: new Date().toISOString() },
      { id: 'usr_seller', role: 'seller', name: 'Demo Seller', email: 'seller@example.com', passwordHash: hashPassword('seller123'), createdAt: new Date().toISOString() },
      { id: 'usr_admin', role: 'admin', name: 'Demo Admin', email: 'admin@example.com', passwordHash: hashPassword('admin123'), createdAt: new Date().toISOString() }
    ],
    products: [
      { id: 'gmail', sellerId: 'usr_seller', name: 'Gmail Accounts', unitPrice: 18, lowStockThreshold: 3, active: true },
      { id: 'telegram', sellerId: 'usr_seller', name: 'Telegram Accounts', unitPrice: 25, lowStockThreshold: 3, active: true },
      { id: 'custom', sellerId: 'usr_seller', name: 'Custom Text Delivery', unitPrice: 10, lowStockThreshold: 5, active: true }
    ],
    inventory: [],
    orders: [],
    notifications: [],
    sessions: []
  };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) writeDb(defaultDb());
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

let lock = Promise.resolve();

function transaction(mutator) {
  const run = lock.then(() => {
    const db = readDb();
    const result = mutator(db);
    writeDb(db);
    return result;
  });
  lock = run.catch(() => {});
  return run;
}

module.exports = {
  DB_PATH,
  hashPassword,
  verifyPassword,
  defaultDb,
  ensureDb,
  readDb,
  writeDb,
  transaction
};