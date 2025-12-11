const multer = require('multer');
const path = require('path');

// Storage config for product images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage config for product files
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/files/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for documents
const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
  }
};

// Upload middleware for multiple images
const uploadMultipleImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // max 10 files per upload
  }
}).array('images', 10);

// Upload middleware for single main image
const uploadMainImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('main_image');

// Upload middleware for product files
const uploadProductFiles = multer({
  storage: fileStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // max 5 files per upload
  }
}).array('files', 5);

// Upload middleware for accounts file (for bulk account upload)
const uploadAccountsFile = multer({
  storage: fileStorage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/plain',
      'text/csv',
      'application/json'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only TXT, CSV, and JSON files are allowed for accounts'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
}).single('accounts_file');

module.exports = {
  uploadMultipleImages,
  uploadMainImage,
  uploadProductFiles,
  uploadAccountsFile
};
