const Product = require('../models/Product');

const sampleProducts = [
  {
    name: "Classic White T-Shirt",
    description: "A comfortable, high-quality white t-shirt made from 100% cotton.",
    price: 29.99,
    category: "shirts",
    stock: 100,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    brand: "BasicWear",
    featured: true,
    sizes: ["S", "M", "L", "XL"]
  },
  {
    name: "Slim Fit Jeans",
    description: "Modern slim fit jeans with a comfortable stretch.",
    price: 59.99,
    category: "pants",
    stock: 75,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    brand: "DenimCo",
    featured: true,
    sizes: ["28", "30", "32", "34", "36"]
  },
  {
    name: "Leather Jacket",
    description: "Classic black leather jacket with modern styling.",
    price: 199.99,
    category: "jackets",
    stock: 50,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    brand: "LeatherCraft",
    featured: true,
    sizes: ["S", "M", "L", "XL"]
  },
  {
    name: "Running Shoes",
    description: "Lightweight running shoes with superior comfort.",
    price: 89.99,
    category: "sneakers",
    stock: 120,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
    brand: "RunFast",
    featured: true,
    sizes: ["7", "8", "9", "10", "11", "12"]
  }
];

const seedProducts = async () => {
  try {
    // Clear existing products
    await Product.deleteMany({});
    
    // Insert new products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log('Products seeded successfully:', createdProducts.length);
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

module.exports = seedProducts; 