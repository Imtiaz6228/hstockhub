const path = require('path');
const fs = require('fs');
const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname).toLowerCase()}`)
});

const allowed = new Set(['.csv', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.pdf']);

const upload = multer({
  storage,
  limits: { fileSize: env.uploadMaxBytes, files: 5 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.has(ext)) return cb(new AppError('File type is not allowed', 400, 'INVALID_FILE_TYPE'));
    return cb(null, true);
  }
});

module.exports = upload;