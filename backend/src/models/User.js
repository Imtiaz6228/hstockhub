const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const roles = ['buyer', 'seller', 'admin'];

const loginHistorySchema = new mongoose.Schema({
  ip: String,
  userAgent: String,
  success: { type: Boolean, default: true },
  reason: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  role: { type: String, enum: roles, required: true, index: true },
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  status: { type: String, enum: ['pending', 'active', 'suspended', 'rejected'], default: 'active', index: true },
  emailVerifiedAt: Date,
  phone: String,
  avatar: String,
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null, index: true },
  passwordChangedAt: Date,
  rememberTokenHash: { type: String, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpires: Date,
  emailVerificationTokenHash: { type: String, select: false },
  twoFactor: {
    enabled: { type: Boolean, default: false },
    secretHash: { type: String, select: false },
    recoveryCodes: [{ type: String, select: false }]
  },
  sellerProfile: {
    storeName: { type: String, trim: true, maxlength: 140 },
    slug: { type: String, sparse: true },
    description: { type: String, maxlength: 2000 },
    approvedAt: Date,
    rejectedAt: Date,
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
  },
  buyerProfile: {
    defaultCurrency: { type: String, default: 'CNY' },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
  },
  permissions: [{ type: String, trim: true }],
  lastLoginAt: Date,
  lastLoginIp: String,
  loginHistory: [loginHistorySchema]
}, { timestamps: true });

userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'sellerProfile.slug': 1 }, { sparse: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(String(candidate || ''), this.password || '');
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil > new Date());
};

userSchema.methods.recordLogin = function recordLogin({ success, ip, userAgent, reason }) {
  this.loginHistory.unshift({ success, ip, userAgent, reason });
  this.loginHistory = this.loginHistory.slice(0, 25);
  if (success) {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.lastLoginAt = new Date();
    this.lastLoginIp = ip;
  } else {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
};

module.exports = mongoose.model('User', userSchema);
module.exports.roles = roles;