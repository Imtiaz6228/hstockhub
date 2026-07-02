module.exports = {
  User: require('./User'),
  Category: require('./Category'),
  Product: require('./Product'),
  Inventory: require('./Inventory'),
  DigitalStock: require('./DigitalStock'),
  Order: require('./Order'),
  Transaction: require('./Transaction'),
  ...require('./CommerceAuxiliary')
};