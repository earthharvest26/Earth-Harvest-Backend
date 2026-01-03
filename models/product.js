const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  dogBreed: { type: String },
  sizePurchased: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String },
  content: { type: String },
  images: [String],
  helpfulCount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

const nutritionSchema = new mongoose.Schema({
  name: String,         
  value: String,         
  bar: Number            
});

const sizeSchema = new mongoose.Schema({
  weight: { type: Number, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  servings: String,
  pricePerGm: Number
});

const featureSchema = new mongoose.Schema({
  icon: String,   
  title: String,
  desc: String
});

const productSchema = new mongoose.Schema({

  productName: { type: String, required: true },
  brand: { type: String },
  smallDescription: { type: String },

  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  soldThisMonth: { type: Number, default: 0 },

  features: [featureSchema],

  sizes: [sizeSchema],

  stock: { type: Number, default: 0 },

  longDescription: { type: String },

  ingredients: [String],

  nutritionFacts: [nutritionSchema],

  images: [String],

  reviews: [reviewSchema],

},{timestamps:true});

productSchema.index({productName:1});

module.exports = mongoose.model("Product", productSchema);
