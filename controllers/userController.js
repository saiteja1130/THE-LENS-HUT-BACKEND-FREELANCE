import User from '../models/User.js';

/**
 * Format user for response
 */
const formatUserResponse = (user) => {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    avatar: user.avatar || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// ==========================================
// USER SCOPED ACTIONS (Only own data access)
// ==========================================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user's own profile
 * @access  Private (User or Admin)
 */
export const getMyProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(req.user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user's own profile
 * @access  Private (User or Admin)
 */
export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, phone, avatar } = req.body;
    const user = req.user;

    if (fullName) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      errorCode: 'SERVER_ERROR',
    });
  }
};

// ==========================================
// ADMIN SCOPED ACTIONS (All Visibility)
// ==========================================

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with search, pagination, and role filters (Admin only)
 * @access  Private / Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const roleFilter = req.query.role;

    const query = {};

    if (roleFilter && ['user', 'admin'].includes(roleFilter)) {
      query.role = roleFilter;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
        users: users.map(formatUserResponse),
      },
    });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users list',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get any single user profile (Admin only)
 * @access  Private / Admin
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   PATCH /api/v1/admin/users/:id/role
 * @desc    Change user role (e.g. promote to admin or demote to user)
 * @access  Private / Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Must be "user" or "admin".',
        errorCode: 'INVALID_ROLE',
        errors: {
          role: 'Role must be either "user" or "admin"',
        },
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      errorCode: 'SERVER_ERROR',
    });
  }
};

/**
 * @route   GET /api/v1/admin/dashboard-stats
 * @desc    Get system overview statistics (Admin only)
 * @access  Private / Admin
 */
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const pendingVerification = await User.countDocuments({ isEmailVerified: false });
    const adminCount = await User.countDocuments({ role: 'admin' });

    const recentSignups = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email role isEmailVerified createdAt');

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        pendingVerification,
        adminCount,
        recentSignups,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin stats',
      errorCode: 'SERVER_ERROR',
    });
  }
};
