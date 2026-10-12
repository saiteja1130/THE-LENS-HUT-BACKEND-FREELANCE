import Category from '../models/Category.js';

/**
 * Generate slug from name
 */
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
 * @route   GET /api/v1/categories
 * @desc    Get active categories for public display (Frontend & Mobile)
 * @access  Public
 */
export const getActiveCategories = async (req, res) => {
  try {
    const query = { isActive: true };

    if (req.query.featured === 'true') {
      query.isFeatured = true;
    }

    const categories = await Category.find(query).sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('[Get Categories Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/categories/admin/all
 * @desc    Get all categories including inactive ones for Admin management
 * @access  Private / Admin
 */
export const getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('[Admin Get All Categories Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin categories',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/categories/:idOrSlug
 * @desc    Get single category by ID or Slug
 * @access  Public
 */
export const getCategoryByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let category;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(idOrSlug);
    } else {
      category = await Category.findOne({ slug: idOrSlug.toLowerCase() });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        errorCode: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category details',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category
 * @access  Private / Admin
 */
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      subtitle,
      description,
      imageUrl,
      link,
      order,
      isActive,
      isFeatured,
      itemCount,
    } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name and image URL are required fields',
        errorCode: 'VALIDATION_ERROR',
        errors: {
          name: !name ? 'Category name is required' : undefined,
          imageUrl: !imageUrl ? 'Image URL is required' : undefined,
        },
      });
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);

    // Check slug uniqueness
    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name or slug already exists',
        errorCode: 'SLUG_ALREADY_EXISTS',
        errors: {
          slug: 'Slug or name already exists in categories',
        },
      });
    }

    const count = await Category.countDocuments();

    const category = new Category({
      name: name.trim(),
      slug: finalSlug,
      subtitle: subtitle ? subtitle.trim() : '',
      description: description ? description.trim() : '',
      imageUrl: imageUrl.trim(),
      link: link || `/${finalSlug}`,
      order: order !== undefined ? order : count + 1,
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured !== undefined ? isFeatured : true,
      itemCount: itemCount || 0,
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('[Create Category Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category
 * @access  Private / Admin
 */
export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        errorCode: 'NOT_FOUND',
      });
    }

    const fields = [
      'name',
      'slug',
      'subtitle',
      'description',
      'imageUrl',
      'link',
      'order',
      'isActive',
      'isFeatured',
      'itemCount',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'slug') {
          category.slug = slugify(req.body.slug);
        } else {
          category[field] = req.body[field];
        }
      }
    });

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    console.error('[Update Category Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PATCH /api/v1/categories/:id/toggle
 * @desc    Toggle category active/inactive status
 * @access  Private / Admin
 */
export const toggleCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        errorCode: 'NOT_FOUND',
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle category status',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category
 * @access  Private / Admin
 */
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        errorCode: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/categories/admin/reorder
 * @desc    Batch update category ordering
 * @access  Private / Admin
 */
export const reorderCategories = async (req, res) => {
  try {
    const { orderList } = req.body;

    if (!Array.isArray(orderList)) {
      return res.status(400).json({
        success: false,
        message: 'orderList must be an array of { id, order } objects',
      });
    }

    const updates = orderList.map((item) =>
      Category.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updates);

    const categories = await Category.find().sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: 'Categories reordered successfully',
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder categories',
      errorCode: 'SERVER_ERROR',
    });
  }
};
