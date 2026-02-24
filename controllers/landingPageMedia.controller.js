const LandingPageMedia = require('../models/landingPageMedia');

/**
 * Get landing page media
 */
exports.getLandingPageMedia = async (req, res) => {
  try {
    let media = await LandingPageMedia.findOne();

    // If no media exists, create default structure
    if (!media) {
      media = await LandingPageMedia.create({
        heroImages: [],
        videoTestimonials: [],
        ingredientVideoUrl: '',
        logoUrl: '',
        preloaderIcons: []
      });
    }

    res.status(200).json({
      success: true,
      data: media
    });

  } catch (error) {
    console.error('Get landing page media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch landing page media'
    });
  }
};

/**
 * Update landing page media
 */
exports.updateLandingPageMedia = async (req, res) => {
  try {
    const updateData = req.body;

    let media = await LandingPageMedia.findOne();

    if (!media) {
      // Create new if doesn't exist
      media = await LandingPageMedia.create(updateData);
    } else {
      // Update existing
      media = await LandingPageMedia.findOneAndUpdate(
        {},
        { $set: updateData },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Landing page media updated successfully',
      data: media
    });

  } catch (error) {
    console.error('Update landing page media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update landing page media',
      error: error.message
    });
  }
};

