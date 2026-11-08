import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine safe base upload directory:
// In Vercel / serverless environments, the filesystem is read-only except /tmp
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT
);

export const baseUploadDir = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');

// Ensure base and standard subdirectories exist
const subdirs = ['products', 'categories', 'banners', 'general', 'prescriptions'];
subdirs.forEach((dir) => {
  const fullPath = path.join(baseUploadDir, dir);
  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  } catch (err) {
    console.warn(`[Upload Warning]: Could not create upload directory ${fullPath}:`, err.message);
  }
});

/**
 * Returns the full base URL for the backend API
 */
export const getBaseBackendUrl = (req) => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/+$/, '');
  }
  if (req) {
    return `${req.protocol}://${req.get('host')}`;
  }
  return 'http://localhost:5000';
};

/**
 * Constructs the complete full URL for an uploaded file
 */
export const getFullImageUrl = (req, subfolder, filename) => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  const baseUrl = getBaseBackendUrl(req);
  const cleanSub = subfolder ? `/${subfolder.replace(/^\/+|\/+$/g, '')}` : '';
  const cleanFile = filename.replace(/^\/+/, '');
  return `${baseUrl}/uploads${cleanSub}/${cleanFile}`;
};

// Storage configuration with dynamic folder resolution
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const folder = (req.query?.folder || req.body?.folder || file.fieldname || 'general').toLowerCase();
      const targetSub = subdirs.includes(folder) ? folder : (folder.includes('product') ? 'products' : folder.includes('cat') ? 'categories' : folder.includes('banner') ? 'banners' : 'general');
      const destDir = path.join(baseUploadDir, targetSub);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      cb(null, destDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WEBP, and AVIF are permitted.`
      ),
      false
    );
  }
};

// Multer instance strictly capped at 2MB per image
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
  },
});

// Storage for prescriptions and documents
const prescriptionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const destDir = path.join(baseUploadDir, 'prescriptions');
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      cb(null, destDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanOriginalName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '-');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `rx-${cleanOriginalName}-${uniqueSuffix}${ext}`);
  },
});

// File filter for prescription documents (.docx, .doc, .pdf, images)
const prescriptionFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Word documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/x-zip-compressed',
    'application/zip',
    'application/octet-stream',
    // PDF
    'application/pdf',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.docx', '.doc', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.avif'];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported document type (${file.originalname}). Please upload a valid Word document (.docx, .doc), PDF, or image file (JPG, PNG).`
      ),
      false
    );
  }
};

export const uploadPrescription = multer({
  storage: prescriptionStorage,
  fileFilter: prescriptionFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size for documents
  },
});

// Dedicated product images fields
export const uploadProductImages = upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'side', maxCount: 1 },
  { name: 'angle', maxCount: 1 },
]);

// Single file upload creator
export const createSingleUpload = (fieldName = 'image', defaultFolder = 'general') => {
  const customStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const folder = (req.query?.folder || req.body?.folder || defaultFolder).toLowerCase();
        const targetSub = subdirs.includes(folder) ? folder : defaultFolder;
        const destDir = path.join(baseUploadDir, targetSub);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        cb(null, destDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${fieldName}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage: customStorage,
    fileFilter,
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB max file size
    },
  }).single(fieldName);
};

// Error handling middleware for Multer file size and type errors
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 2MB limit. Please upload an image smaller than 2MB.',
        errorCode: 'LIMIT_FILE_SIZE',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      errorCode: 'UPLOAD_ERROR',
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid upload file',
      errorCode: 'INVALID_FILE',
    });
  }
  next();
};

export default upload;
