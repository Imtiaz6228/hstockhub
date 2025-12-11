const fs = require('fs');
const path = require('path');

// Current known products from hstockhub.com (based on the HTML structure we saw)
const hstockhubProducts = [
  // Gmail products
  { name: 'Gmail Basic Account', category: 'Gmail', age: '1 month', stock: 35, price: 4.99 },
  { name: 'Gmail Verified Account', category: 'Gmail', age: '3 months', stock: 28, price: 7.99 },
  { name: 'Gmail Aged Account', category: 'Gmail', age: '6 months', stock: 22, price: 11.99 },
  { name: 'Gmail Premium Account', category: 'Gmail', age: '1 year', stock: 18, price: 18.99 },
  { name: 'Gmail Business Account', category: 'Gmail', age: '2 years', stock: 12, price: 29.99 },
  { name: 'Gmail Enterprise Account', category: 'Gmail', age: '3 years', stock: 8, price: 49.99 },
  { name: 'Gmail Premium Enterprise', category: 'Gmail', age: '4 years', stock: 6, price: 79.99 },
  { name: 'Gmail Ultimate Account', category: 'Gmail', age: '5 years', stock: 4, price: 129.99 },
  { name: 'Gmail Legendary Account', category: 'Gmail', age: '6+ years', stock: 2, price: 199.99 },
  { name: 'Gmail Legendary Account', category: 'Gmail', age: '7+ years', stock: 1, price: 349.99 },

  // Facebook products
  { name: 'Facebook Basic Account', category: 'Facebook', age: '2 months', stock: 45, price: 5.99 },
  { name: 'Facebook Verified Account', category: 'Facebook', age: '6 months', stock: 32, price: 9.99 },
  { name: 'Facebook Aged Account', category: 'Facebook', age: '1 year', stock: 28, price: 14.99 },
  { name: 'Facebook Premium Account', category: 'Facebook', age: '2 years', stock: 22, price: 24.99 },
  { name: 'Facebook Business Account', category: 'Facebook', age: '3 years', stock: 16, price: 39.99 },
  { name: 'Facebook Enterprise Account', category: 'Facebook', age: '4 years', stock: 12, price: 69.99 },
  { name: 'Facebook Premium Enterprise', category: 'Facebook', age: '5 years', stock: 8, price: 109.99 },
  { name: 'Facebook Ultimate Account', category: 'Facebook', age: '6+ years', stock: 5, price: 169.99 },
  { name: 'Facebook Legendary Account', category: 'Facebook', age: '7+ years', stock: 3, price: 249.99 },
  { name: 'Facebook Mythic Account', category: 'Facebook', age: '8+ years', stock: 1, price: 399.99 },

  // Instagram products
  { name: 'Instagram Basic Account', category: 'Instagram', age: '1 month', stock: 40, price: 6.99 },
  { name: 'Instagram Verified Account', category: 'Instagram', age: '3 months', stock: 35, price: 11.99 },
  { name: 'Instagram Aged Account', category: 'Instagram', age: '6 months', stock: 30, price: 17.99 },
  { name: 'Instagram Premium Account', category: 'Instagram', age: '1 year', stock: 25, price: 27.99 },
  { name: 'Instagram Business Account', category: 'Instagram', age: '2 years', stock: 20, price: 47.99 },
  { name: 'Instagram Enterprise Account', category: 'Instagram', age: '3 years', stock: 15, price: 79.99 },
  { name: 'Instagram Premium Enterprise', category: 'Instagram', age: '4 years', stock: 10, price: 129.99 },
  { name: 'Instagram Ultimate Account', category: 'Instagram', age: '5 years', stock: 7, price: 189.99 },
  { name: 'Instagram Legendary Account', category: 'Instagram', age: '6+ years', stock: 4, price: 279.99 },
  { name: 'Instagram Mythic Account', category: 'Instagram', age: '7+ years', stock: 1, price: 499.99 },

  // TikTok products
  { name: 'TikTok Basic Account', category: 'TikTok', age: '1 month', stock: 42, price: 5.99 },
  { name: 'TikTok Verified Account', category: 'TikTok', age: '3 months', stock: 38, price: 9.99 },
  { name: 'TikTok Aged Account', category: 'TikTok', age: '6 months', stock: 32, price: 15.99 },
  { name: 'TikTok Premium Account', category: 'TikTok', age: '1 year', stock: 28, price: 25.99 },
  { name: 'TikTok Business Account', category: 'TikTok', age: '2 years', stock: 22, price: 45.99 },
  { name: 'TikTok Enterprise Account', category: 'TikTok', age: '3 years', stock: 18, price: 75.99 },
  { name: 'TikTok Premium Enterprise', category: 'TikTok', age: '4 years', stock: 12, price: 125.99 },
  { name: 'TikTok Ultimate Account', category: 'TikTok', age: '5 years', stock: 8, price: 185.99 },
  { name: 'TikTok Legendary Account', category: 'TikTok', age: '6+ years', stock: 5, price: 275.99 },
  { name: 'TikTok Mythic Account', category: 'TikTok', age: '7+ years', stock: 2, price: 495.99 },

  // YouTube products
  { name: 'YouTube Basic Account', category: 'YouTube', age: '1 month', stock: 38, price: 8.99 },
  { name: 'YouTube Verified Account', category: 'YouTube', age: '3 months', stock: 32, price: 14.99 },
  { name: 'YouTube Aged Account', category: 'YouTube', age: '6 months', stock: 28, price: 22.99 },
  { name: 'YouTube Premium Account', category: 'YouTube', age: '1 year', stock: 24, price: 35.99 },
  { name: 'YouTube Business Account', category: 'YouTube', age: '2 years', stock: 18, price: 65.99 },
  { name: 'YouTube Enterprise Account', category: 'YouTube', age: '3 years', stock: 14, price: 105.99 },
  { name: 'YouTube Premium Enterprise', category: 'YouTube', age: '4 years', stock: 10, price: 175.99 },
  { name: 'YouTube Ultimate Account', category: 'YouTube', age: '5 years', stock: 6, price: 275.99 },
  { name: 'YouTube Legendary Account', category: 'YouTube', age: '6+ years', stock: 3, price: 425.99 },
  { name: 'YouTube Mythic Account', category: 'YouTube', age: '7+ years', stock: 1, price: 699.99 },

  // X (Twitter) products
  { name: 'X Basic Account', category: 'Twitter', age: '1 month', stock: 40, price: 4.99 },
  { name: 'X Verified Account', category: 'Twitter', age: '3 months', stock: 35, price: 8.99 },
  { name: 'X Aged Account', category: 'Twitter', age: '6 months', stock: 30, price: 12.99 },
  { name: 'X Premium Account', category: 'Twitter', age: '1 year', stock: 25, price: 19.99 },
  { name: 'X Business Account', category: 'Twitter', age: '2 years', stock: 20, price: 34.99 },
  { name: 'X Enterprise Account', category: 'Twitter', age: '3 years', stock: 15, price: 59.99 },
  { name: 'X Premium Enterprise', category: 'Twitter', age: '4 years', stock: 10, price: 99.99 },
  { name: 'X Ultimate Account', category: 'Twitter', age: '5 years', stock: 7, price: 149.99 },
  { name: 'X Legendary Account', category: 'Twitter', age: '6+ years', stock: 4, price: 229.99 },
  { name: 'X Mythic Account', category: 'Twitter', age: '7+ years', stock: 2, price: 399.99 },

  // LinkedIn products
  { name: 'LinkedIn Basic Account', category: 'LinkedIn', age: '2 months', stock: 36, price: 7.99 },
  { name: 'LinkedIn Verified Account', category: 'LinkedIn', age: '4 months', stock: 30, price: 12.99 },
  { name: 'LinkedIn Aged Account', category: 'LinkedIn', age: '8 months', stock: 26, price: 19.99 },
  { name: 'LinkedIn Premium Account', category: 'LinkedIn', age: '1 year', stock: 22, price: 29.99 },
  { name: 'LinkedIn Business Account', category: 'LinkedIn', age: '2 years', stock: 18, price: 54.99 },
  { name: 'LinkedIn Enterprise Account', category: 'LinkedIn', age: '3 years', stock: 14, price: 89.99 },
  { name: 'LinkedIn Premium Enterprise', category: 'LinkedIn', age: '4 years', stock: 10, price: 149.99 },
  { name: 'LinkedIn Ultimate Account', category: 'LinkedIn', age: '5 years', stock: 6, price: 229.99 },
  { name: 'LinkedIn Legendary Account', category: 'LinkedIn', age: '6+ years', stock: 3, price: 349.99 },
  { name: 'LinkedIn Mythic Account', category: 'LinkedIn', age: '7+ years', stock: 1, price: 599.99 },

  // Telegram products
  { name: 'Telegram Basic Account', category: 'Telegram', age: '1 month', stock: 50, price: 3.99 },
  { name: 'Telegram Verified Account', category: 'Telegram', age: '3 months', stock: 45, price: 6.99 },
  { name: 'Telegram Aged Account', category: 'Telegram', age: '6 months', stock: 40, price: 9.99 },
  { name: 'Telegram Premium Account', category: 'Telegram', age: '1 year', stock: 35, price: 15.99 },
  { name: 'Telegram Business Account', category: 'Telegram', age: '2 years', stock: 25, price: 29.99 },
  { name: 'Telegram Enterprise Account', category: 'Telegram', age: '3 years', stock: 20, price: 49.99 },
  { name: 'Telegram Premium Enterprise', category: 'Telegram', age: '4 years', stock: 15, price: 79.99 },
  { name: 'Telegram Ultimate Account', category: 'Telegram', age: '5 years', stock: 10, price: 129.99 },
  { name: 'Telegram Legendary Account', category: 'Telegram', age: '6+ years', stock: 5, price: 199.99 },
  { name: 'Telegram Mythic Account', category: 'Telegram', age: '7+ years', stock: 2, price: 349.99 },

  // Threads products
  { name: 'Threads Basic Account', category: 'Threads', age: '2 weeks', stock: 55, price: 4.99 },
  { name: 'Threads Verified Account', category: 'Threads', age: '1 month', stock: 48, price: 8.99 },
  { name: 'Threads Aged Account', category: 'Threads', age: '2 months', stock: 42, price: 12.99 },
  { name: 'Threads Premium Account', category: 'Threads', age: '3 months', stock: 38, price: 18.99 },
  { name: 'Threads Business Account', category: 'Threads', age: '6 months', stock: 32, price: 32.99 },
  { name: 'Threads Enterprise Account', category: 'Threads', age: '1 year', stock: 26, price: 54.99 },
  { name: 'Threads Premium Enterprise', category: 'Threads', age: '18 months', stock: 20, price: 89.99 },
  { name: 'Threads Ultimate Account', category: 'Threads', age: '2+ years', stock: 14, price: 139.99 },
  { name: 'Threads Legendary Account', category: 'Threads', age: '3+ years', stock: 8, price: 219.99 },
  { name: 'Threads Mythic Account', category: 'Threads', age: '4+ years', stock: 3, price: 399.99 }
];

// Convert to demo product format
function convertToDemoFormat(product) {
  const ageMatch = product.age.match(/(\d+)\s*\+?\s*(year|month|week|day)/i);
  let months = 1;

  if (ageMatch) {
    const value = parseInt(ageMatch[1]);
    const unit = ageMatch[2].toLowerCase();

    if (unit.includes('year')) {
      months = value * 12;
    } else if (unit.includes('month')) {
      months = value;
    } else if (unit.includes('week')) {
      months = Math.max(1, Math.round(value / 4.33));
    } else if (unit.includes('day')) {
      months = Math.max(1, Math.round(value / 30));
    }
  }

  return {
    name: product.name,
    description: `${product.category} account aged ${product.age}`,
    price: product.price,
    category: product.category,
    quantity: product.stock,
    accounts_to_upload: product.stock,
    short_description: `${product.category} Account`,
    full_description: `Premium ${product.category} account with ${product.age} of history.`,
    sku: `HSTOCK-${product.category.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    status: 'active',
    min_stock_alert: 5,
    tags: `${product.category},${product.age}`,
    keywords: `${product.category} account,aged account,verified account`,
    created_at: new Date().toISOString()
  };
}

// Sync the products
function syncProducts() {
  console.log('Syncing products from hstockhub.com...');

  // Convert all products
  const demoProducts = hstockhubProducts.map(convertToDemoFormat);

  // Add product_ids
  demoProducts.forEach((product, index) => {
    product.product_id = index + 1;
  });

  // Save to file
  const demoData = {
    products: demoProducts,
    counter: demoProducts.length + 1,
    last_sync: new Date().toISOString(),
    source: 'hstockhub.com'
  };

  const demoProductsPath = path.join(__dirname, 'demo-products.json');
  fs.writeFileSync(demoProductsPath, JSON.stringify(demoData, null, 2));

  console.log(`Synced ${demoProducts.length} products to demo-products.json`);
  console.log('Products by category:');
  const byCategory = demoProducts.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`- ${cat}: ${count} products`);
  });
}

if (require.main === module) {
  syncProducts();
}

module.exports = { syncProducts };
