require('dotenv').config();
const User = require('./models/user');
const Product = require('./models/product');
const Coupon = require('./models/coupon');

async function seed() {
  try {
    console.log('Seeding database...');

    // Create default admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@zombakk.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findByEmail(adminEmail);
    if (!existingAdmin) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
        is_admin: true
      });
      console.log('Default admin created');
    } else {
      console.log('Admin already exists');
    }

    // Create demo products
    const products = [
      {
        name: 'Zombakk Pro Subscription',
        description: 'Full access to all Zombakk features including premium tools and priority support.',
        price: 19.99,
        category: 'Subscription',
        quantity: 9999,
        image_url: 'https://via.placeholder.com/300x200?text=Zombakk+Pro'
      },
      {
        name: 'Zombakk Premium Tools',
        description: 'Advanced productivity tools for developers and businesses.',
        price: 49.99,
        category: 'Tools',
        quantity: 500,
        image_url: 'https://via.placeholder.com/300x200?text=Premium+Tools'
      },
      {
        name: 'Zombakk Enterprise Solution',
        description: 'Complete enterprise-grade solution with custom integrations.',
        price: 99.99,
        category: 'Enterprise',
        quantity: 100,
        image_url: 'https://via.placeholder.com/300x200?text=Enterprise+Solution'
      },
      {
        name: 'Developer Starter Kit',
        description: 'Everything you need to get started with Zombakk development.',
        price: 9.99,
        category: 'Starter',
        quantity: 2000,
        image_url: 'https://via.placeholder.com/300x200?text=Starter+Kit'
      },
      {
        name: 'API Access Token',
        description: 'Unlock unlimited API access for your applications.',
        price: 14.99,
        category: 'API',
        quantity: 1000,
        image_url: 'https://via.placeholder.com/300x200?text=API+Token'
      }
    ];

    for (const productData of products) {
      await Product.create(productData);
    }
    console.log('Demo products created');

    // Create demo coupons
    const coupons = [
      {
        code: 'WELCOME10',
        discount_type: 'fixed',
        discount_value: 10,
        max_uses: 100
      },
      {
        code: 'SAVE20',
        discount_type: 'percent',
        discount_value: 20,
        max_uses: 50
      },
      {
        code: 'BLACKFRIDAY',
        discount_type: 'percent',
        discount_value: 50,
        max_uses: 10,
        expires_at: new Date('2026-12-31')
      }
    ];

    for (const couponData of coupons) {
      await Coupon.create(couponData);
    }
    console.log('Demo coupons created');

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seed();
