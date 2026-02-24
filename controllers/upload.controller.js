const path = require('path');

/**
 * Handle file upload
 * Returns the public URL for the uploaded file
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Generate public URL
    const filename = req.file.filename;
    const publicUrl = `https://earthandharvest.food/media/${filename}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: filename,
        url: publicUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
};

