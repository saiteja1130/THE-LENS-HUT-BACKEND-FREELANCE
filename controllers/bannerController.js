import Banner from '../models/Banner.js';

/**
 * @route   GET /api/v1/banners
 * @desc    Get active banners for public display (Frontend & Mobile)
 * @access  Public
 */
export const getActiveBanners = async (req, res) => {
  try {
    const query = { isActive: true };

    if (req.query.position) {
      query.position = req.query.position;
    }

    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error('[Get Banners Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active banners',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/banners/admin/all
 * @desc    Get all banners including inactive ones for Admin management
 * @access  Private / Admin
 */
export const getAllBannersAdmin = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error('[Admin Get All Banners Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin banners list',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/banners/:id
 * @desc    Get single banner details
 * @access  Public
 */
export const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
        errorCode: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve banner',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   POST /api/v1/banners
 * @desc    Create a new banner
 * @access  Private / Admin
 */
export const createBanner = async (req, res) => {
  try {
    const {
      title,
      headline,
      kicker,
      subtitle,
      imageUrl,
      link,
      buttonText,
      secondaryBtnText,
      secondaryBtnLink,
      bgColor,
      position,
      order,
      isActive,
      targetCategory,
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title and image URL are required fields',
        errorCode: 'VALIDATION_ERROR',
        errors: {
          title: !title ? 'Title is required' : undefined,
          imageUrl: !imageUrl ? 'Image URL is required' : undefined,
        },
      });
    }

    const count = await Banner.countDocuments();

    const banner = new Banner({
      title: title.trim(),
      headline: headline ? headline.trim() : '',
      kicker: kicker ? kicker.trim() : (headline ? headline.trim() : ''),
      subtitle: subtitle ? subtitle.trim() : '',
      imageUrl: imageUrl.trim(),
      link: link || '/shop',
      buttonText: buttonText || 'Shop Now',
      secondaryBtnText: secondaryBtnText || '',
      secondaryBtnLink: secondaryBtnLink || '',
      bgColor: bgColor || '#FAF8F5',
      position: position || 'hero',
      order: order !== undefined ? order : count + 1,
      isActive: isActive !== undefined ? isActive : true,
      targetCategory: targetCategory || 'Eyeglasses',
    });

    await banner.save();

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner,
    });
  } catch (error) {
    console.error('[Create Banner Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/banners/:id
 * @desc    Update an existing banner
 * @access  Private / Admin
 */
export const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
        errorCode: 'NOT_FOUND',
      });
    }

    const fields = [
      'title',
      'headline',
      'kicker',
      'subtitle',
      'imageUrl',
      'link',
      'buttonText',
      'secondaryBtnText',
      'secondaryBtnLink',
      'bgColor',
      'position',
      'order',
      'isActive',
      'targetCategory',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        banner[field] = req.body[field];
      }
    });

    await banner.save();

    return res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: banner,
    });
  } catch (error) {
    console.error('[Update Banner Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PATCH /api/v1/banners/:id/toggle
 * @desc    Toggle banner isActive status
 * @access  Private / Admin
 */
export const toggleBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
        errorCode: 'NOT_FOUND',
      });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    return res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: banner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle banner status',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   DELETE /api/v1/banners/:id
 * @desc    Delete a banner
 * @access  Private / Admin
 */
export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found',
        errorCode: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/banners/reorder
 * @desc    Batch update banner ordering
 * @access  Private / Admin
 */
export const reorderBanners = async (req, res) => {
  try {
    const { orderList } = req.body; // Array of { id, order }

    if (!Array.isArray(orderList)) {
      return res.status(400).json({
        success: false,
        message: 'orderList must be an array of { id, order } objects',
      });
    }

    const updates = orderList.map((item) =>
      Banner.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updates);

    const banners = await Banner.find().sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
      data: banners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder banners',
      errorCode: 'SERVER_ERROR',
    });
  }
};
