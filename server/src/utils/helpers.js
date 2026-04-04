/**
 * Utility functions
 * Add reusable helper functions here
 */

/**
 * Format error response
 */
const formatError = (message, code = null) => {
  return {
    success: false,
    message,
    ...(code && { code }),
  };
};

/**
 * Format success response
 */
const formatSuccess = (data, message = null) => {
  return {
    success: true,
    ...(message && { message }),
    ...data,
  };
};

/**
 * Calculate distance between two GPS coordinates (approximate)
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, long1, lat2, long2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((long2 - long1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

module.exports = {
  formatError,
  formatSuccess,
  calculateDistance,
};
