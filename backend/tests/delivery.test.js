const assert = require('assert');
const { defaultDb } = require('../lib/store');
const { uploadStock, deliverPaidOrder, inventoryCounters, parseBulkStock } = require('../lib/deliveryCore');

const db = defaultDb();

const parsed = parseBulkStock('email1@gmail.com:password\nemail2@gmail.com:password\nemail1@gmail.com:password\nemail3@gmail.com:password:recovery@mail.com', 'auto');
assert.strictEqual(parsed.length, 4, 'should parse all stock lines');

const upload = uploadStock(db, {
  sellerId: 'usr_seller',
  productId: 'gmail',
  text: 'email1@gmail.com:password\nemail2@gmail.com:password\nemail1@gmail.com:password\nemail3@gmail.com:password:recovery@mail.com',
  format: 'auto'
});

assert.strictEqual(upload.added, 3, 'should add 3 unique valid rows');
assert.strictEqual(upload.duplicates, 1, 'should reject duplicate row');
assert.deepStrictEqual(inventoryCounters(db, 'gmail'), { total: 3, available: 3, sold: 0, reserved: 0 });

const first = deliverPaidOrder(db, { buyerId: 'usr_buyer', productId: 'gmail', quantity: 1, paymentReference: 'PAY-1' });
assert.strictEqual(first.deliveredCredentials[0].raw, 'email1@gmail.com:password', 'must deliver first available row');
assert.deepStrictEqual(inventoryCounters(db, 'gmail'), { total: 3, available: 2, sold: 1, reserved: 0 });

const second = deliverPaidOrder(db, { buyerId: 'usr_buyer', productId: 'gmail', quantity: 2, paymentReference: 'PAY-2' });
assert.strictEqual(second.deliveredCredentials.length, 2, 'should deliver requested quantity');
assert.deepStrictEqual(inventoryCounters(db, 'gmail'), { total: 3, available: 0, sold: 3, reserved: 0 });

assert.throws(() => deliverPaidOrder(db, { buyerId: 'usr_buyer', productId: 'gmail', quantity: 1, paymentReference: 'PAY-3' }), /Out of stock/);

const customUpload = uploadStock(db, {
  sellerId: 'usr_seller',
  productId: 'custom',
  text: 'Token:ABC:123',
  format: 'custom'
});
assert.strictEqual(customUpload.added, 1, 'custom text with colons should be accepted');

const customOrder = deliverPaidOrder(db, { buyerId: 'usr_buyer', productId: 'custom', quantity: 1, paymentReference: 'PAY-4' });
assert.strictEqual(customOrder.deliveredCredentials[0].format, 'Custom Text Delivery');

console.log('Automatic delivery backend tests passed.');