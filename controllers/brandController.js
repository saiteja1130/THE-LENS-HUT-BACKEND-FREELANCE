import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import { getFullImageUrl } from '../middlewares/upload.js';

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * @route   GET /api/v1/brands
 * @desc    Get active brands for public display (Web & Mobile)
 * @access  Public
 */
export const getActiveBrands = async (req, res) => {
  try {
    const query = { isActive: true };

    if (req.query.featured === 'true') {
      query.isFeatured = true;
    }

    const brands = await Brand.find(query).sort({ order: 1, createdAt: -1 });

    // Ensure item counts are updated from products collection
    const brandsWithCounts = await Promise.all(
      brands.map(async (b) => {
        const count = await Product.countDocuments({
          status: 'active',
          brand: new RegExp(`^${b.name}$`, 'i'),
        });
        const brandObj = b.toJSON();
        brandObj.itemCount = count;
        return brandObj;
      })
    );

    return res.status(200).json({
      success: true,
      data: brandsWithCounts,
    });
  } catch (error) {
    console.error('[Get Active Brands Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active brands',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/brands/admin/all
 * @desc    Get all brands including inactive for Admin portal
 * @access  Private / Admin
 */
export const getAllBrandsAdmin = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ order: 1, createdAt: -1 });

    const brandsWithCounts = await Promise.all(
      brands.map(async (b) => {
        const count = await Product.countDocuments({
          brand: new RegExp(`^${b.name}$`, 'i'),
        });
        const brandObj = b.toJSON();
        brandObj.itemCount = count;
        return brandObj;
      })
    );

    return res.status(200).json({
      success: true,
      data: brandsWithCounts,
    });
  } catch (error) {
    console.error('[Admin Get All Brands Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve brands for admin',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/brands/:idOrSlug
 * @desc    Get single brand by ID or slug
 * @access  Public
 */
export const getBrandByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let brand = null;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      brand = await Brand.findById(idOrSlug);
    }
    if (!brand) {
      brand = await Brand.findOne({ slug: idOrSlug.toLowerCase() });
    }

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
        errorCode: 'BRAND_NOT_FOUND',
      });
    }

    const count = await Product.countDocuments({
      status: 'active',
      brand: new RegExp(`^${brand.name}$`, 'i'),
    });

    const brandData = brand.toJSON();
    brandData.itemCount = count;

    return res.status(200).json({
      success: true,
      data: brandData,
    });
  } catch (error) {
    console.error('[Get Brand By Id/Slug Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve brand',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/brands
 * @desc    Create new brand
 * @access  Private / Admin
 */
export const createBrand = async (req, res) => {
  try {
    const { name, description, website, isActive, isFeatured, order, logoUrl: providedLogo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required',
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const slug = slugify(name);
    const existing = await Brand.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A brand with the name "${name.trim()}" or slug "${slug}" already exists`,
        errorCode: 'DUPLICATE_BRAND',
      });
    }

    let logoUrl = providedLogo || '';
    if (req.file) {
      logoUrl = getFullImageUrl(req, 'brands', req.file.filename);
    }

    if (!logoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Brand logo image is required',
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const newBrand = await Brand.create({
      name: name.trim(),
      slug,
      description: description || '',
      logoUrl,
      website: website || '',
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' || isFeatured === true : true,
      order: order ? Number(order) : 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: newBrand,
    });
  } catch (error) {
    console.error('[Create Brand Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create brand',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/brands/:id
 * @desc    Update existing brand
 * @access  Private / Admin
 */
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, website, isActive, isFeatured, order, logoUrl: providedLogo } = req.body;

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
        errorCode: 'BRAND_NOT_FOUND',
      });
    }

    if (name && name.trim() !== brand.name) {
      const slug = slugify(name);
      const duplicate = await Brand.findOne({
        _id: { $ne: id },
        $or: [{ name: name.trim() }, { slug }],
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another brand with name "${name.trim()}" already exists`,
          errorCode: 'DUPLICATE_BRAND',
        });
      }
      brand.name = name.trim();
      brand.slug = slug;
    }

    if (req.file) {
      brand.logoUrl = getFullImageUrl(req, 'brands', req.file.filename);
    } else if (providedLogo) {
      brand.logoUrl = providedLogo;
    }

    if (description !== undefined) brand.description = description;
    if (website !== undefined) brand.website = website;
    if (isActive !== undefined) brand.isActive = isActive === 'true' || isActive === true;
    if (isFeatured !== undefined) brand.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (order !== undefined) brand.order = Number(order);

    await brand.save();

    return res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      data: brand,
    });
  } catch (error) {
    console.error('[Update Brand Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update brand',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PATCH /api/v1/brands/:id/toggle
 * @desc    Toggle brand active status
 * @access  Private / Admin
 */
export const toggleBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
        errorCode: 'BRAND_NOT_FOUND',
      });
    }

    brand.isActive = !brand.isActive;
    await brand.save();

    return res.status(200).json({
      success: true,
      message: `Brand "${brand.name}" is now ${brand.isActive ? 'Active' : 'Inactive'}`,
      data: brand,
    });
  } catch (error) {
    console.error('[Toggle Brand Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle brand status',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   DELETE /api/v1/brands/:id
 * @desc    Delete brand
 * @access  Private / Admin
 */
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
        errorCode: 'BRAND_NOT_FOUND',
      });
    }

    // Check if products exist for this brand
    const assignedCount = await Product.countDocuments({
      brand: new RegExp(`^${brand.name}$`, 'i'),
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand "${brand.name}" because ${assignedCount} products are assigned to it. Reassign or delete those products first.`,
        errorCode: 'BRAND_IN_USE',
      });
    }

    await Brand.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `Brand "${brand.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('[Delete Brand Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete brand',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/brands/admin/reorder
 * @desc    Reorder brands display sequence
 * @access  Private / Admin
 */
export const reorderBrands = async (req, res) => {
  try {
    const { brandIds } = req.body;
    if (!Array.isArray(brandIds)) {
      return res.status(400).json({
        success: false,
        message: 'brandIds must be an array',
        errorCode: 'VALIDATION_ERROR',
      });
    }

    await Promise.all(
      brandIds.map((id, index) =>
        Brand.findByIdAndUpdate(id, { order: index }, { new: true })
      )
    );

    return res.status(200).json({
      success: true,
      message: 'Brands reordered successfully',
    });
  } catch (error) {
    console.error('[Reorder Brands Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder brands',
      errorCode: 'SERVER_ERROR',
    });
  }
};
