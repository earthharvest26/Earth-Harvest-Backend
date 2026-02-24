const express = require("express");
const router = express.Router();
const { getLandingPageMedia } = require("../controllers/landingPageMedia.controller");

// Public route to get landing page media
router.get("/", getLandingPageMedia);

module.exports = router;

