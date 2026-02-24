/**
 * Calculate bulk discount
 * 28.5% off when ordering 5 packets or more
 * 
 * @param {number} quantity - Number of items
 * @param {number} unitPrice - Price per unit
 * @returns {Object} - { originalAmount, discountAmount, finalAmount, discountPercentage }
 */
const calculateBulkDiscount = (quantity, unitPrice) => {
  const originalAmount = unitPrice * quantity;
  const BULK_DISCOUNT_THRESHOLD = 5;
  const BULK_DISCOUNT_PERCENTAGE = 28.5; // 28.5% off

  if (quantity >= BULK_DISCOUNT_THRESHOLD) {
    const discountAmount = originalAmount * (BULK_DISCOUNT_PERCENTAGE / 100);
    const finalAmount = originalAmount - discountAmount;
    
    return {
      originalAmount,
      discountAmount,
      finalAmount,
      discountPercentage: BULK_DISCOUNT_PERCENTAGE,
      hasDiscount: true
    };
  }

  return {
    originalAmount,
    discountAmount: 0,
    finalAmount: originalAmount,
    discountPercentage: 0,
    hasDiscount: false
  };
};

module.exports = {
  calculateBulkDiscount
};

