const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  active: { type: Boolean, default: true, index: true },
  startsAt: Date,
  expiresAt: Date,
  maxUses: Number,
  usedCount: { type: Number, default: 0 }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'published', 'hidden'], default: 'published', index: true }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  body: { type: String, required: true, maxlength: 5000 },
  attachments: [String],
  readAt: Date
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info', index: true },
  link: String,
  readAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  subject: { type: String, required: true, maxlength: 200 },
  status: { type: String, enum: ['open', 'answered', 'pending_user', 'closed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  messages: [{ sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, body: String, attachments: [String], createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

const disputeSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  reason: String,
  status: { type: String, enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open', index: true },
  resolution: String
}, { timestamps: true });

const withdrawalSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'CNY' },
  method: String,
  accountEncrypted: { type: String, select: false },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'CNY' },
  lockedBalance: { type: Number, default: 0 }
}, { timestamps: true });

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true },
  entityType: String,
  entityId: String,
  ip: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  group: { type: String, default: 'system', index: true },
  public: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = {
  Coupon: mongoose.model('Coupon', couponSchema),
  Review: mongoose.model('Review', reviewSchema),
  Message: mongoose.model('Message', messageSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  SupportTicket: mongoose.model('SupportTicket', ticketSchema),
  Dispute: mongoose.model('Dispute', disputeSchema),
  Withdrawal: mongoose.model('Withdrawal', withdrawalSchema),
  Wallet: mongoose.model('Wallet', walletSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Setting: mongoose.model('Setting', settingSchema)
};