const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  description: { type: String, maxlength: 1000 },
  image: String,
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  }
}, { timestamps: true });

categorySchema.index({ parent: 1, active: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);