const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect, admin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads/blog';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for blog image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all blogs with pagination and filters
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching blogs with params:', req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user is admin
    const isAdmin = req.user && req.user.role === 'admin';
    console.log('Is admin:', isAdmin);
    
    // Base query
    let query = {};
    
    // If not admin, only show published blogs
    if (!isAdmin) {
      query.status = 'published';
    } else if (req.query.status) {
      // For admin, apply status filter if provided
      query.status = req.query.status;
    }

    // Add search filter
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { content: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Add category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Add tag filter
    if (req.query.tag) {
      query.tags = req.query.tag;
    }

    console.log('MongoDB query:', query);

    const blogs = await Blog.find(query)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Found blogs:', blogs.length);
    console.log('Blogs statuses:', blogs.map(blog => blog.status));

    const total = await Blog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      blogs,
      currentPage: page,
      totalPages,
      total,
      isAdmin
    });
  } catch (error) {
    console.error('Detailed error in GET /blogs:', error);
    res.status(500).json({ 
      message: 'Error fetching blogs',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get blogs by user ID
router.get('/user', protect, async (req, res) => {
  try {
    console.log('=== Fetching User Blogs ===');
    console.log('User ID:', req.user._id);
    console.log('User Role:', req.user.role);
    
    const blogs = await Blog.find({ author: req.user._id })
      .populate('author', 'name')
      .sort({ createdAt: -1 });

    console.log('Found blogs:', blogs.length);
    console.log('Blog details:', blogs.map(blog => ({
      id: blog._id,
      title: blog.title,
      status: blog.status,
      createdAt: blog.createdAt
    })));

    res.json(blogs);
  } catch (error) {
    console.error('Error fetching user blogs:', error);
    res.status(500).json({
      message: 'Error fetching user blogs',
      error: error.message
    });
  }
});

// Get a single blog by ID or slug
router.get('/:identifier', async (req, res) => {
  try {
    console.log('Fetching blog with identifier:', req.params.identifier);
    
    // Check if the identifier is a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.identifier);
    
    let blog;
    if (isObjectId) {
      blog = await Blog.findById(req.params.identifier)
        .populate('author', 'name')
        .populate('comments.user', 'name');
    } else {
      blog = await Blog.findOne({ slug: req.params.identifier })
        .populate('author', 'name')
        .populate('comments.user', 'name');
    }

    if (!blog) {
      console.log('Blog not found with identifier:', req.params.identifier);
      return res.status(404).json({ message: 'Blog not found' });
    }

    console.log('Found blog:', blog._id);

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json(blog);
  } catch (error) {
    console.error('Detailed error in GET /blogs/:identifier:', error);
    res.status(500).json({ 
      message: 'Error fetching blog',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create a new blog (authenticated users)
router.post('/', protect, upload.single('featuredImage'), async (req, res) => {
  try {
    console.log('=== Creating New Blog ===');
    console.log('User ID:', req.user._id);
    console.log('User Role:', req.user.role);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { title, content, excerpt, category, tags, status } = req.body;

    // Validate required fields
    if (!title || !content || !excerpt || !category) {
      console.log('Missing required fields:', { title, content, excerpt, category });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Set status based on user role
    let blogStatus;
    if (req.user.role === 'admin') {
      blogStatus = status || 'draft';
    } else {
      blogStatus = 'pending'; // Always set to pending for non-admin users
    }
    console.log('Blog status set to:', blogStatus);

    const blog = new Blog({
      title,
      content,
      excerpt,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: blogStatus,
      author: req.user._id,
      featuredImage: req.file ? `/uploads/blog/${req.file.filename}` : null
    });

    console.log('Blog object before save:', blog);

    const savedBlog = await blog.save();
    console.log('Blog saved successfully:', {
      id: savedBlog._id,
      title: savedBlog.title,
      status: savedBlog.status,
      author: savedBlog.author
    });
    
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error('Error creating blog:', error);
    
    // If there was a file upload error, remove the uploaded file
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing uploaded file:', unlinkError);
      }
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A blog with this title already exists'
      });
    }

    res.status(500).json({
      message: 'Error creating blog post',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update a blog (admin only)
router.put('/:id', protect, admin, upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, status } = req.body;

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Update fields
    if (title) blog.title = title;
    if (content) blog.content = content;
    if (excerpt) blog.excerpt = excerpt;
    if (category) blog.category = category;
    if (tags) blog.tags = tags.split(',').map(tag => tag.trim());
    if (status) blog.status = status;
    if (req.file) {
      blog.featuredImage = `/uploads/blog/${req.file.filename}`;
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Error updating blog' });
  }
});

// Delete a blog (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: 'Error deleting blog' });
  }
});

// Like/Unlike a blog
router.post('/:id/like', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const likeIndex = blog.likes.indexOf(req.user._id);
    if (likeIndex === -1) {
      blog.likes.push(req.user._id);
    } else {
      blog.likes.splice(likeIndex, 1);
    }

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error('Error liking/unliking blog:', error);
    res.status(500).json({ message: 'Error liking/unliking blog' });
  }
});

// Add a comment to a blog
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.comments.push({
      user: req.user._id,
      content
    });

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

module.exports = router; 