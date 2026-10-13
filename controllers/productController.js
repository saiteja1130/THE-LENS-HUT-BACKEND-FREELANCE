import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Wishlist from '../models/Wishlist.js';

/**
 * Attach isInWishlist boolean to product object(s) based on user's active wishlist
 */
const attachWishlistFlag = async (products, userId) => {
  if (!products) return products;

  let wishlistProductIds = new Set();
  if (userId) {
    const wishlist = await Wishlist.findOne({ user: userId }).select('products.product').lean();
    if (wishlist?.products) {
      wishlistProductIds = new Set(
        wishlist.products.map((item) => item.product.toString())
      );
    }
  }

  const formatOne = (product) => {
    if (!product) return null;
    const pObj = product.toObject ? product.toObject() : { ...product };
    const pId = (pObj._id || pObj.id || '').toString();
    return {
      ...pObj,
      id: pObj._id || pObj.id,
      isInWishlist: wishlistProductIds.has(pId),
    };
  };

  if (Array.isArray(products)) {
    return products.map(formatOne);
  }
  return formatOne(products);
};

/**
 * Generate a URL-friendly slug from string
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * Construct full public URL for an uploaded file
 */
const buildFileUrl = (req, filename) => {
  if (!filename) return '';
  const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/products/${filename}`;
};

/**
 * Safely parse JSON or return fallback
 */
const parseJsonField = (val, defaultValue) => {
  if (val === undefined || val === null) return defaultValue;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

/**
 * @desc    Get all active products with comprehensive filtering, sorting, pagination
 * @route   GET /api/v1/products
 * @access  Public
 */
export const getProducts = async (req, res) => {
  try {
    const {
      category,
      categorySlug,
      productType,
      gender,
      shape,
      frameShape,
      frameType,
      material,
      minPrice,
      maxPrice,
      search,
      featured,
      bestseller,
      sort = 'popularity',
      page = 1,
      limit = 20,
    } = req.query;

    const query = { status: 'active' };

    // Category / CategorySlug filter
    if (category && category !== 'all' && category !== 'All') {
      const catRegex = new RegExp(`^${category}$`, 'i');
      query.$or = [{ category: catRegex }, { categorySlug: category.toLowerCase() }];
    } else if (categorySlug && categorySlug !== 'all') {
      query.categorySlug = categorySlug.toLowerCase();
    }

    // Product Type filter
    if (productType) {
      query.productType = productType.toLowerCase();
    }

    // Gender filter
    if (gender && gender !== 'All' && gender !== 'all') {
      query.gender = new RegExp(`^${gender}$`, 'i');
    }

    // Frame Shape filter
    const activeShape = shape || frameShape;
    if (activeShape && activeShape !== 'All' && activeShape !== 'all') {
      query['frameSpecifications.shape'] = new RegExp(`^${activeShape}$`, 'i');
    }

    // Frame Type filter
    if (frameType && frameType !== 'All' && frameType !== 'all') {
      query['frameSpecifications.frameType'] = new RegExp(`^${frameType}$`, 'i');
    }

    // Material filter
    if (material && material !== 'All' && material !== 'all') {
      query['frameSpecifications.material'] = new RegExp(`^${material}$`, 'i');
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Featured / Bestseller flags
    if (featured === 'true') {
      query.isFeatured = true;
    }
    if (bestseller === 'true') {
      query.isBestSeller = true;
    }

    // Text search on name, brand, description, sku
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
        { description: searchRegex },
      ];
    }

    // Sorting
    let sortOptions = { isFeatured: -1, rating: -1, createdAt: -1 };
    switch (sort) {
      case 'price_asc':
        sortOptions = { price: 1 };
        break;
      case 'price_desc':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1, reviewsCount: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popularity':
      default:
        sortOptions = { isBestSeller: -1, isFeatured: -1, rating: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Product.countDocuments(query),
    ]);

    const enrichedProducts = await attachWishlistFlag(products, req.user?._id);

    res.status(200).json({
      success: true,
      data: enrichedProducts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Product Controller - getProducts]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single product by MongoDB ID or SEO slug
 * @route   GET /api/v1/products/:idOrSlug
 * @access  Public
 */
export const getProductByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let product = null;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(idOrSlug);
    }
    if (!product) {
      product = await Product.findOne({ slug: idOrSlug.toLowerCase() });
    }
    if (!product) {
      product = await Product.findOne({ sku: idOrSlug.toUpperCase() });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const enrichedProduct = await attachWishlistFlag(product, req.user?._id);

    res.status(200).json({
      success: true,
      data: enrichedProduct,
    });
  } catch (error) {
    console.error('[Product Controller - getProductByIdOrSlug]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product details',
      error: error.message,
    });
  }
};

/**
 * @desc    Get featured products for homepage / mobile top list
 * @route   GET /api/v1/products/featured
 * @access  Public
 */
export const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const products = await Product.find({
      status: 'active',
      $or: [{ isFeatured: true }, { isBestSeller: true }],
    })
      .sort({ rating: -1, isBestSeller: -1 })
      .limit(limit);

    const enrichedProducts = await attachWishlistFlag(products, req.user?._id);

    res.status(200).json({
      success: true,
      data: enrichedProducts,
    });
  } catch (error) {
    console.error('[Product Controller - getFeaturedProducts]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve featured products',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all products for Admin (including drafts and archived)
 * @route   GET /api/v1/products/admin/all
 * @access  Admin
 */
export const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('[Product Controller - getAllProductsAdmin]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products for admin',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/v1/products
 * @access  Admin
 */
export const createProduct = async (req, res) => {
  try {
    const body = req.body;

    if (!body.name || !body.price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required',
      });
    }

    // Auto-generate or sanitize slug
    let baseSlug = body.slug ? generateSlug(body.slug) : generateSlug(body.name);
    let finalSlug = baseSlug;
    let counter = 1;
    while (await Product.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    // Auto-generate SKU if missing
    let finalSku = body.sku
      ? body.sku.toUpperCase().trim()
      : `TLH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Normalize category slug
    const categoryName = body.category || 'Eyeglasses';
    const catSlug = body.categorySlug || generateSlug(categoryName);

    // Format images from uploaded files or fallback to URLs
    let imagesObj = { front: '', side: '', angle: '' };

    // 1. Check req.files from multer
    if (req.files) {
      if (req.files.front && req.files.front[0]) {
        imagesObj.front = buildFileUrl(req, req.files.front[0].filename);
      }
      if (req.files.side && req.files.side[0]) {
        imagesObj.side = buildFileUrl(req, req.files.side[0].filename);
      }
      if (req.files.angle && req.files.angle[0]) {
        imagesObj.angle = buildFileUrl(req, req.files.angle[0].filename);
      }
    }

    // 2. Fallback to body images if file was not uploaded
    const parsedBodyImages = parseJsonField(body.images, null);
    if (!imagesObj.front) {
      imagesObj.front = parsedBodyImages?.front || body.image || '';
    }
    if (!imagesObj.side) {
      imagesObj.side = parsedBodyImages?.side || body['images[side]'] || '';
    }
    if (!imagesObj.angle) {
      imagesObj.angle = parsedBodyImages?.angle || body['images[angle]'] || '';
    }

    // Parse complex JSON fields from FormData
    const colors = parseJsonField(body.colors, []);
    const frameSpecifications = parseJsonField(body.frameSpecifications, {});
    const lensCompatibility = parseJsonField(body.lensCompatibility, {});
    const eyeglassesConfig = parseJsonField(body.eyeglassesConfig, null);
    const contactLensConfig = parseJsonField(body.contactLensConfig, null);
    const sunglassesConfig = parseJsonField(body.sunglassesConfig, null);

    const productData = {
      ...body,
      slug: finalSlug,
      sku: finalSku,
      category: categoryName,
      categorySlug: catSlug,
      images: imagesObj,
      colors,
      frameSpecifications,
      lensCompatibility,
      eyeglassesConfig,
      contactLensConfig,
      sunglassesConfig,
      stock: body.stock !== undefined ? Number(body.stock) : 20,
      price: Number(body.price),
      mrp: body.mrp ? Number(body.mrp) : Number(body.offerPrice || body.price),
      isBestSeller: body.isBestSeller === 'true' || body.isBestSeller === true,
      isNewArrival: body.isNewArrival === 'true' || body.isNewArrival === true,
      isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
    };

    const newProduct = await Product.create(productData);

    // Increment category itemCount if applicable
    await Category.updateOne({ slug: catSlug }, { $inc: { itemCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    console.error('[Product Controller - createProduct]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message,
    });
  }
};

/**
 * @desc    Update an existing product
 * @route   PUT /api/v1/products/:id
 * @access  Admin
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ slug: id.toLowerCase() });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const updates = { ...req.body };

    // If name is updated and slug provided, check collision
    if (updates.slug && updates.slug !== product.slug) {
      const existing = await Product.findOne({
        slug: updates.slug.toLowerCase(),
        _id: { $ne: product._id },
      });
      if (existing) {
        updates.slug = `${updates.slug}-${Date.now().toString(36)}`;
      }
    }

    // Merge uploaded files into images
    let imagesObj = {
      front: product.images?.front || '',
      side: product.images?.side || '',
      angle: product.images?.angle || '',
    };

    if (req.files) {
      if (req.files.front && req.files.front[0]) {
        imagesObj.front = buildFileUrl(req, req.files.front[0].filename);
      }
      if (req.files.side && req.files.side[0]) {
        imagesObj.side = buildFileUrl(req, req.files.side[0].filename);
      }
      if (req.files.angle && req.files.angle[0]) {
        imagesObj.angle = buildFileUrl(req, req.files.angle[0].filename);
      }
    }

    // If images passed in body as URLs or JSON
    if (updates.images) {
      const parsedImages = parseJsonField(updates.images, updates.images);
      if (typeof parsedImages === 'object' && !Array.isArray(parsedImages)) {
        if (!req.files?.front && parsedImages.front) imagesObj.front = parsedImages.front;
        if (!req.files?.side && parsedImages.side) imagesObj.side = parsedImages.side;
        if (!req.files?.angle && parsedImages.angle) imagesObj.angle = parsedImages.angle;
      }
    }
    updates.images = imagesObj;

    // Parse complex JSON fields
    if (updates.colors !== undefined) updates.colors = parseJsonField(updates.colors, updates.colors);
    if (updates.frameSpecifications !== undefined) updates.frameSpecifications = parseJsonField(updates.frameSpecifications, updates.frameSpecifications);
    if (updates.lensCompatibility !== undefined) updates.lensCompatibility = parseJsonField(updates.lensCompatibility, updates.lensCompatibility);
    if (updates.eyeglassesConfig !== undefined) updates.eyeglassesConfig = parseJsonField(updates.eyeglassesConfig, updates.eyeglassesConfig);
    if (updates.contactLensConfig !== undefined) updates.contactLensConfig = parseJsonField(updates.contactLensConfig, updates.contactLensConfig);
    if (updates.sunglassesConfig !== undefined) updates.sunglassesConfig = parseJsonField(updates.sunglassesConfig, updates.sunglassesConfig);

    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.mrp !== undefined) updates.mrp = Number(updates.mrp);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.isBestSeller !== undefined) updates.isBestSeller = updates.isBestSeller === 'true' || updates.isBestSeller === true;
    if (updates.isNewArrival !== undefined) updates.isNewArrival = updates.isNewArrival === 'true' || updates.isNewArrival === true;
    if (updates.isFeatured !== undefined) updates.isFeatured = updates.isFeatured === 'true' || updates.isFeatured === true;

    const updated = await Product.findByIdAndUpdate(product._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('[Product Controller - updateProduct]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};


/**
 * @desc    Delete a product
 * @route   DELETE /api/v1/products/:id
 * @access  Admin
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ slug: id.toLowerCase() });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await Product.findByIdAndDelete(product._id);

    // Decrement category itemCount
    if (product.categorySlug) {
      await Category.updateOne(
        { slug: product.categorySlug, itemCount: { $gt: 0 } },
        { $inc: { itemCount: -1 } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { id: product._id },
    });
  } catch (error) {
    console.error('[Product Controller - deleteProduct]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};

/**
 * @desc    Update stock inventory level
 * @route   PATCH /api/v1/products/:id/stock
 * @access  Admin
 */
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || Number(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid non-negative stock count is required',
      });
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { stock: Number(stock) },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: { id: updated._id, stock: updated.stock },
    });
  } catch (error) {
    console.error('[Product Controller - updateProductStock]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message,
    });
  }
};
