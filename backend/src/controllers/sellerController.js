const asyncHandler = require('../utils/asyncHandler');
const { uploadDigitalStock } = require('../services/deliveryService');
const { audit } = require('../services/auditService');

const uploadStock = asyncHandler(async (req, res) => {
  const result = await uploadDigitalStock({ seller: req.user._id, productId: req.body.productId, text: req.body.stockText });
  await audit(req, 'seller.stock_uploaded', { productId: req.body.productId, added: result.added });
  res.redirect('/seller/dashboard');
});

module.exports = { uploadStock };