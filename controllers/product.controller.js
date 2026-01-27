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
    
    // Only show enabled products for non-admin users
    // Admins can see all products via /admin/products endpoint
    if (!req.user || req.user.role !== 'admin') {
      query.enabled = { $ne: false };
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

    // Check if product is enabled (unless user is admin)
    if ((!req.user || req.user.role !== 'admin') && product.enabled === false) {
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
    const query = { 
      stock: { $gt: 0 },
      enabled: { $ne: false } // Only show enabled products
    };
    
    const products = await Product.find(query)
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

/**
 * Add review to product (protected route)
 */
exports.addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, dogBreed, sizePurchased, rating, title, content, images } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (!userName || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "User name and rating (1-5) are required"
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Create review
    const newReview = {
      userName,
      dogBreed: dogBreed || "",
      sizePurchased: sizePurchased || "",
      rating: parseInt(rating),
      title: title || "",
      content: content || "",
      images: images || [],
      helpfulCount: 0,
      date: new Date()
    };

    product.reviews.push(newReview);

    // Recalculate rating and total reviews
    const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.rating = totalRating / product.reviews.length;
    product.totalReviews = product.reviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: newReview
    });

  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

