import path from 'path';
import { getFullImageUrl } from '../middlewares/upload.js';

/**
 * @desc    Upload single image (products, categories, banners, etc.)
 * @route   POST /api/v1/upload
 * @access  Private / Admin
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please select an image (max 2MB).',
        errorCode: 'NO_FILE_UPLOADED',
      });
    }

    const folder = (req.query?.folder || req.body?.folder || 'general').toLowerCase();
    const fullUrl = getFullImageUrl(req, folder, req.file.filename);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to server',
      data: {
        url: fullUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        folder,
      },
    });
  } catch (error) {
    console.error('[Upload Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process image upload',
      error: error.message,
    });
  }
};

/**
 * @desc    Upload prescription document (DOCX, PDF, JPG, PNG)
 * @route   POST /api/v1/upload/prescription
 * @access  Public / Customer
 */
export const uploadPrescriptionDocument = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No prescription document uploaded. Please select a DOCX, PDF, or image file.',
        errorCode: 'NO_FILE_UPLOADED',
      });
    }

    const fullUrl = getFullImageUrl(req, 'prescriptions', file.filename);

    return res.status(200).json({
      success: true,
      message: 'Prescription document uploaded successfully',
      data: {
        fileId: `rx-${Date.now().toString(36)}`,
        fileName: file.originalname,
        storedFilename: file.filename,
        fileType: file.mimetype,
        fileSize: file.size,
        fileUrl: fullUrl,
        url: fullUrl,
        folder: 'prescriptions',
      },
    });
  } catch (error) {
    console.error('[Upload Prescription Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process prescription document upload',
      error: error.message,
    });
  }
};

