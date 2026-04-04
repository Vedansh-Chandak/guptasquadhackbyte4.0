/**
 * Extract GPS coordinates from image EXIF metadata
 * Requires: exif-parser package
 */
const extractGPSFromImage = async (imageBuffer) => {
  try {
    const ExifParser = require("exif-parser");
    const buffer = imageBuffer;

    try {
      const parser = ExifParser.create(buffer);
      const result = parser.parse();

      if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
        return {
          lat: result.tags.GPSLatitude,
          long: result.tags.GPSLongitude,
          hasGPS: true,
        };
      }
    } catch (parseError) {
      console.warn("⚠️  Could not parse EXIF data:", parseError.message);
    }

    return {
      lat: null,
      long: null,
      hasGPS: false,
    };
  } catch (error) {
    console.warn(
      "⚠️  EXIF extraction failed (package may not be installed):",
      error.message
    );
    return {
      lat: null,
      long: null,
      hasGPS: false,
    };
  }
};

module.exports = { extractGPSFromImage };
