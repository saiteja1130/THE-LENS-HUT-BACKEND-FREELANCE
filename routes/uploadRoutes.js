import express from 'express';
import { uploadImage, uploadPrescriptionDocument } from '../controllers/uploadController.js';
import { upload, uploadPrescription, handleUploadErrors } from '../middlewares/upload.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

// Upload prescription document (open to customer during prescription configuration)
// Accepts field names: 'file', 'prescription', or 'document'
router.post(
  '/prescription',
  (req, res, next) => {
    uploadPrescription.fields([
      { name: 'file', maxCount: 1 },
      { name: 'prescription', maxCount: 1 },
      { name: 'document', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      const uploadedFile =
        req.files?.file?.[0] ||
        req.files?.prescription?.[0] ||
        req.files?.document?.[0] ||
        req.files?.image?.[0] ||
        req.file;
      req.file = uploadedFile;
      next();
    });
  },
  uploadPrescriptionDocument
);

// Upload general image file (field name: 'image' or 'file')
router.post(
  '/',
  protect,
  restrictTo('admin'),
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) return handleUploadErrors(err, req, res, next);
      next();
    });
  },
  uploadImage
);

export default router;

