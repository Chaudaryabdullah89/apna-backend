const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    maxlength: [200, 'Excerpt cannot be more than 200 characters']
  },
  featuredImage: {
    type: String,
    default: '/uploads/blog/default.jpg'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Technology', 'Fashion', 'Lifestyle', 'Travel', 'Food', 'Other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'pending'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Create slug from title before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true
    });
  }
  next();
});

// Add method to increment views
blogSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

// Add method to toggle like
blogSchema.methods.toggleLike = async function(userId) {
  const index = this.likes.indexOf(userId);
  if (index === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(index, 1);
  }
  return this.save();
};

// Add method to add comment
blogSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content
  });
  return this.save();
};

// Add method to remove comment
blogSchema.methods.removeComment = async function(commentId) {
  this.comments = this.comments.filter(
    comment => comment._id.toString() !== commentId
  );
  return this.save();
};

// Index for faster queries
blogSchema.index({ title: 'text', content: 'text' });
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ status: 1 });

module.exports = mongoose.model('Blog', blogSchema); 