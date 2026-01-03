const Product = require("../models/product");

/**
 * Get all products (public route)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query = {};
    if (search) {
      query.productName = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get all products error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get single product by ID (public route)
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get featured products (public route)
 */
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } })
      .sort({ rating: -1, totalReviews: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

