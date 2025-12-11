const { spawn } = require('child_process');
const path = require('path');

// Scheduled sync script that runs simple-sync.js every 6 hours
function runSync() {
  console.log(`[${new Date().toISOString()}] Starting scheduled product sync from hstockhub.com...`);

  const syncProcess = spawn('node', [path.join(__dirname, 'simple-sync.js')], {
    stdio: 'inherit',
    cwd: __dirname
  });

  syncProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`[${new Date().toISOString()}] Product sync completed successfully`);
    } else {
      console.error(`[${new Date().toISOString()}] Product sync failed with code ${code}`);
    }
  });

  syncProcess.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Error running product sync:`, error);
  });
}

// Run immediately
runSync();

// Schedule to run every 6 hours (21600000 ms)
const SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

setInterval(runSync, SYNC_INTERVAL);

console.log(`[${new Date().toISOString()}] Scheduled product sync started. Will sync every ${SYNC_INTERVAL / (60 * 60 * 1000)} hours.`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Scheduled sync stopped`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Scheduled sync stopped`);
  process.exit(0);
});
