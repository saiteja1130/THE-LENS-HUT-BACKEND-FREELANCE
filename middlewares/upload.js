import multer from 'multer';
import path from 'path';
import os from 'os';

// Determine safe upload directory:
// In Vercel / serverless environments, the filesystem is read-only except /tmp
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT
);

export const uploadDir = isServerless
  ? path.join(os.tmpdir(), 'uploads', 'products')
  : path.join(process.cwd(), 'uploads', 'products');

// Ensure upload directory exists safely without crashing if read-only
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn(`[Upload Warning]: Could not create upload directory ${uploadDir}:`, err.message);
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Middleware for product images (front, side, angle)
export const uploadProductImages = upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'side', maxCount: 1 },
  { name: 'angle', maxCount: 1 },
]);

export default uploadProductImages;
