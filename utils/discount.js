/**
 * Calculate bulk discount
 * 10 dirhams off per packet when ordering 5 packets or more
 * 
 * @param {number} quantity - Number of items
 * @param {number} unitPrice - Price per unit
 * @returns {Object} - { originalAmount, discountAmount, finalAmount, discountPerItem }
 */
const calculateBulkDiscount = (quantity, unitPrice) => {
  const originalAmount = unitPrice * quantity;
  const BULK_DISCOUNT_THRESHOLD = 5;
  const DISCOUNT_PER_PACKET = 10; // 10 dirhams off per packet

  if (quantity >= BULK_DISCOUNT_THRESHOLD) {
    const discountAmount = DISCOUNT_PER_PACKET * quantity; // 10 dirhams off on each packet
    const finalAmount = Math.max(0, originalAmount - discountAmount); // Ensure non-negative
    
    return {
      originalAmount,
      discountAmount,
      finalAmount,
      discountPerItem: DISCOUNT_PER_PACKET,
      hasDiscount: true
    };
  }

  return {
    originalAmount,
    discountAmount: 0,
    finalAmount: originalAmount,
    discountPerItem: 0,
    hasDiscount: false
  };
};

module.exports = {
  calculateBulkDiscount
};

