const https = require('https');

// Function to check an endpoint
function checkEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'hstockhub.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`\n=== ${description} ===`);
      console.log(`Path: ${path}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.headers['content-type']?.includes('application/json')) {
          try {
            const json = JSON.parse(data);
            console.log('JSON Response (first 500 chars):', JSON.stringify(json).substring(0, 500));
          } catch (e) {
            console.log('Response data (first 500 chars):', data.substring(0, 500));
          }
        } else {
          console.log('Response data (first 500 chars):', data.substring(0, 500));
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`Error for ${path}:`, err.message);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log(`Timeout for ${path}`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

// Check multiple endpoints
async function checkAllEndpoints() {
  const endpoints = [
    { path: '/', description: 'Home Page' },
    { path: '/products', description: 'Products Page' },
    { path: '/api/products', description: 'Products API' },
    { path: '/api/v1/products', description: 'Products API v1' },
    { path: '/catalog', description: 'Catalog Page' },
    { path: '/api/catalog', description: 'Catalog API' }
  ];

  for (const endpoint of endpoints) {
    await checkEndpoint(endpoint.path, endpoint.description);
  }
}

checkAllEndpoints();
