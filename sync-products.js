const https = require('https');
const fs = require('fs');
const path = require('path');

// This should match the structure expected by demo.js
function createProductFromTableRow(category, name, age, stock, price) {
  // Parse age to get quantity (months)
  const ageMatch = age.match(/(\d+)\s*(year|month|week|day)/i);
  let months = 1; // default

  if (ageMatch) {
    const value = parseInt(ageMatch[1]);
    const unit = ageMatch[2].toLowerCase();

    if (unit.includes('year')) {
      months = value * 12;
    } else if (unit.includes('month')) {
      months = value;
    } else if (unit.includes('week')) {
      months = Math.max(1, Math.round(value / 4.33)); // rough approximation
    } else if (unit.includes('day')) {
      months = Math.max(1, Math.round(value / 30));
    }
  }

  return {
    name: name.replace(/(<([^>]+)>)/gi, "").trim(), // Strip HTML tags
    description: `${category} account aged ${age}`,
    price: parseFloat(price.replace('$', '').trim()),
    category: category,
    quantity: parseInt(stock),
    accounts_to_upload: parseInt(stock), // Use stock as quantity
    short_description: `${category} Account`,
    full_description: `Premium ${category} account with ${age} of history.`,
    status: 'active',
    min_stock_alert: 5,
    tags: `${category},${age}`,
    keywords: `${category} account,aged account,verified account`
  };
}

// Fetch HTML from hstockhub.com
function fetchRemoteProducts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'hstockhub.com',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode} for homepage`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Parse HTML to extract products from tables
function parseProducts(html) {
  const products = [];

  // Platform mappings to match the HTML tabs
  const platforms = {
    'gmail': 'Gmail',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'twitter': 'Twitter', // X (Twitter)
    'linkedin': 'LinkedIn',
    'telegram': 'Telegram',
    'threads': 'Threads'
  };

  Object.entries(platforms).forEach(([platformId, categoryName]) => {
    // Find the tab content for this platform
    const tabRegex = new RegExp(`<div class="tab-pane[^"]*" id="${platformId}"[^>]*>(.*?)</div>`, 'si');
    const tabMatch = html.match(tabRegex);

    if (tabMatch) {
      const tabContent = tabMatch[1];

      // Find all table rows with product data
      const rowRegex = /<tr>(.*?)<\/tr>/gis;
      let match;

      while ((match = rowRegex.exec(tabContent)) !== null) {
        const row = match[1];

        // Skip header rows
        if (row.includes('<th')) continue;

        // Extract cells
        const cellRegex = /<td[^>]*>(.*?)<\/td>/gis;
        const cells = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(row)) !== null) {
          cells.push(cellMatch[1].trim());
        }

        // We expect: Account Type, Age, In Stock, Price, Actions
        if (cells.length >= 4) {
          const name = cells[0];
          const age = cells[1];
          const stock = cells[2];
          const price = cells[3];

          // Skip hardcoded "Buy Now" buttons from the template
          if (price && price.includes('$') && !row.includes('Buy Now')) {
            const product = createProductFromTableRow(categoryName, name, age, stock, price);
            products.push(product);
          }
        }
      }
    }
  });

  return products;
}

// Sync function
async function syncProducts() {
  try {
    console.log('Fetching products from hstockhub.com...');
    const html = await fetchRemoteProducts();

    console.log('Parsing products from HTML...');
    const newProducts = parseProducts(html);

    console.log(`Found ${newProducts.length} products`);

    if (newProducts.length === 0) {
      console.log('No products found - check if HTML parsing logic is correct');
      return;
    }

    // Load existing demo products
    let existingProducts = [];
    const demoProductsPath = path.join(__dirname, 'demo-products.json');

    if (fs.existsSync(demoProductsPath)) {
      const demoData = JSON.parse(fs.readFileSync(demoProductsPath, 'utf8'));
      existingProducts = demoData.products || [];
      console.log(`Found ${existingProducts.length} existing demo products`);
    }

    // Merge: Add new products, update existing ones with same name+category
    const mergedProducts = [...existingProducts];

    newProducts.forEach(newProduct => {
      const existingIndex = mergedProducts.findIndex(existing =>
        existing.name === newProduct.name &&
        existing.category === newProduct.category
      );

      if (existingIndex !== -1) {
        // Update existing product
        mergedProducts[existingIndex] = {
          ...mergedProducts[existingIndex],
          ...newProduct,
          product_id: mergedProducts[existingIndex].product_id, // Keep existing ID
          updated_at: new Date().toISOString()
        };
        console.log(`Updated: ${newProduct.name} (${newProduct.category})`);
      } else {
        // Add new product
        newProduct.product_id = Math.max(...mergedProducts.map(p => p.product_id || 0), 0) + 1;
        newProduct.created_at = new Date().toISOString();
        mergedProducts.push(newProduct);
        console.log(`Added: ${newProduct.name} (${newProduct.category})`);
      }
    });

    // Save to demo-products.json
    const demoData = {
      products: mergedProducts,
      counter: mergedProducts.length + 1, // Next available ID
      last_sync: new Date().toISOString()
    };

    fs.writeFileSync(demoProductsPath, JSON.stringify(demoData, null, 2));
    console.log(`Synced ${mergedProducts.length} products to demo-products.json`);

  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}

// Run sync if called directly
if (require.main === module) {
  syncProducts();
}

module.exports = { syncProducts, parseProducts, createProductFromTableRow };
