const { connectDatabase } = require('./config/database');
const { User, Category, Product, Wallet } = require('./models');
const logger = require('./utils/logger');

async function upsertUser(role, email, password, name, extra = {}) {
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    user = await User.create({ role, email, password, name, ...extra });
    await Wallet.create({ user: user._id }).catch(() => {});
  }
  return user;
}

async function seed() {
  await connectDatabase();
  const buyer = await upsertUser('buyer', 'buyer@example.com', 'buyer12345', 'Demo Buyer');
  const seller = await upsertUser('seller', 'seller@example.com', 'seller12345', 'Demo Seller', { status: 'active', sellerProfile: { storeName: 'Demo Store', slug: 'demo-store', approvedAt: new Date() } });
  const admin = await upsertUser('admin', 'admin@example.com', 'admin12345', 'Demo Admin');
  const category = await Category.findOneAndUpdate({ slug: 'accounts' }, { name: 'Accounts', slug: 'accounts', active: true }, { upsert: true, new: true });
  await Product.findOneAndUpdate({ seller: seller._id, slug: 'gmail-accounts' }, { seller: seller._id, category: category._id, name: 'Gmail Accounts', slug: 'gmail-accounts', price: 18, status: 'active', deliveryType: 'digital_stock' }, { upsert: true, new: true });
  logger.info('Seed completed', { buyer: buyer.email, seller: seller.email, admin: admin.email });
  process.exit(0);
}

seed().catch((error) => {
  logger.error('Seed failed', { error: error.message, stack: error.stack });
  process.exit(1);
});