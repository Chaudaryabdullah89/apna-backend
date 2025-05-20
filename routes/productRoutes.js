const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Product = require('../models/Product');

router.use(express.json());

// Public routes
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.query.featured === 'true') {
      query.featured = true;
    }
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Protected routes (admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, price, category, stock, image, brand, features, specifications } = req.body;

    // Basic backend validation
    if (!name || !description || !price || !category || !stock || !image || !brand) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Validate and convert price and stock to numbers
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Invalid price.' });
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: 'Invalid stock.' });
    }

    const product = new Product({
      name,
      description,
      price: parsedPrice,
      category,
      stock: parsedStock,
      image,
      brand,
      features,
      specifications
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: error.message || 'Failed to create product.' });
  }
});

router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, description, price, category, stock, image, brand, features, specifications } = req.body;

    // Basic validation
    if (!name || !description || !price || !category || !stock || !image || !brand) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Invalid price.' });
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: 'Invalid stock.' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price: parsedPrice,
        category,
        stock: parsedStock,
        image,
        brand,
        features,
        specifications,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get products by collection
router.get('/collection/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let query = {};

    // Define collection-specific queries
    switch (type) {
      case 'mens':
        query = { category: { $in: ['shirts', 'pants', 'jackets'] }, gender: 'men' };
        break;
      case 'womens':
        query = { category: { $in: ['dresses', 'tops', 'skirts'] }, gender: 'women' };
        break;
      case 'footwear':
        query = { category: { $in: ['sneakers', 'formal', 'casual', 'sports'] } };
        break;
      case 'accessories':
        query = { category: { $in: ['bags', 'watches', 'jewelry', 'belts'] } };
        break;
      default:
        return res.status(400).json({ message: 'Invalid collection type' });
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching collection products:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
