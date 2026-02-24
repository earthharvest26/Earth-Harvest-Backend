const mongoose = require('mongoose');

const landingPageMediaSchema = new mongoose.Schema({
  // Hero images (array of image URLs)
  heroImages: [{
    url: { type: String, required: true },
    alt: { type: String, default: '' }
  }],

  // Video testimonials (array of video objects)
  videoTestimonials: [{
    id: { type: Number },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    videoUrl: { type: String, required: true },
    thumbnail: { type: String, default: '' }
  }],

  // Ingredient video URL
  ingredientVideoUrl: { type: String, default: '' },

  // Logo URL (for navbar, footer, preloader)
  logoUrl: { type: String, default: '' },

  // Preloader icons (array of icon URLs)
  preloaderIcons: [{
    name: { type: String, required: true },
    iconUrl: { type: String, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('LandingPageMedia', landingPageMediaSchema);

