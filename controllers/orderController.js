const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product'); // Assuming you have a Product model
const Stripe = require('stripe');
const { sendEmail } = require('../utils/sendEmail');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a new order and process payment
const createOrder = async (req, res) => {
  try {
    const { 
      items, 
      shippingAddress, 
      totalAmount,
      customerName,
      customerEmail,
      paymentMethod,
      shippingCost,
      taxPrice,
      discountAmount
    } = req.body;

    // Basic validation
    if (!items || items.length === 0 || !shippingAddress || !totalAmount || !customerName || !customerEmail) {
      return res.status(400).json({ message: 'Missing required order details.' });
    }

    // Validate products and calculate total
    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      total += product.price * item.quantity;
    }

    // Add shipping and tax
    total += shippingCost || 0;
    total += taxPrice || 0;
    total -= discountAmount || 0;

    // Create a new order
    const order = new Order({
      items,
      shippingAddress,
      totalAmount: total,
      shippingCost,
      taxPrice,
      discountAmount,
      paymentMethod,
      customerName,
      customerEmail,
      paymentStatus: 'pending',
      orderStatus: 'processing'
    });

    // Save the order to the database
    await order.save();

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Handle payment based on method
    if (paymentMethod === 'card') {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100), // Convert to cents
          currency: 'usd',
          metadata: { orderId: order._id.toString() },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Update order with payment intent ID
        order.paymentIntentId = paymentIntent.id;
        await order.save();

        // Send order confirmation email
        await sendEmail(
          customerEmail,
          'Order Confirmation',
          'orderConfirmation',
          {
            name: customerName,
            orderNumber: order._id.toString().slice(-6),
            orderDate: new Date().toLocaleDateString(),
            totalAmount: total.toFixed(2),
            paymentMethod: 'Credit Card',
            shippingMethod: 'Standard Shipping',
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            subtotal: (total - shippingCost - taxPrice).toFixed(2),
            shippingCost: shippingCost.toFixed(2),
            tax: taxPrice.toFixed(2),
            totalAmount: total.toFixed(2),
            shippingAddress,
            trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
          }
        );

        res.status(201).json({ 
          clientSecret: paymentIntent.client_secret, 
          orderId: order._id 
        });
      } catch (error) {
        // If payment intent creation fails, delete the order
        await Order.findByIdAndDelete(order._id);
        throw error;
      }
    } else {
      // For cash on delivery
      await sendEmail(
        customerEmail,
        'Order Confirmation',
        'orderConfirmation',
        {
          name: customerName,
          orderNumber: order._id.toString().slice(-6),
          orderDate: new Date().toLocaleDateString(),
          totalAmount: total.toFixed(2),
          paymentMethod: 'Cash on Delivery',
          shippingMethod: 'Standard Shipping',
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          subtotal: (total - shippingCost - taxPrice).toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          tax: taxPrice.toFixed(2),
          totalAmount: total.toFixed(2),
          shippingAddress,
          trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
        }
      );

      res.status(201).json({ 
        message: 'Order created successfully',
        orderId: order._id 
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to create order.',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update order payment status after successful payment (webhook or callback)
const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId, paymentIntentId, status } = req.body;

    const order = await Order.findById(orderId).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      await order.save();

      // Send order status update email
      await sendEmail(
        order.user.email,
        'Order Status Update',
        'orderStatusUpdate',
        {
          name: order.user.name,
          orderNumber: order._id.toString().slice(-6),
          status: 'Processing',
          updatedAt: new Date().toLocaleString(),
          trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
        }
      );

      res.json({ message: 'Payment status updated to paid.' });
    } else if (paymentIntent.status === 'payment_failed') {
      order.paymentStatus = 'failed';
      await order.save();
      res.status(400).json({ message: 'Payment failed.' });
    } else {
      res.status(400).json({ message: 'Payment intent status is not succeeded.' });
    }

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: error.message || 'Failed to update payment status.' });
  }
};

// Get orders for a specific user
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user ID is available from authentication middleware
    const orders = await Order.find({ user: userId }).populate('items.product');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user orders.' });
  }
};

// Get all orders (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').populate('items.product');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch all orders.' });
  }
};

const getPaymentIntent = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this order' });
    }

    // Check if payment is already completed
    if (order.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already completed for this order' });
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: req.user._id.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
};

module.exports = {
  createOrder,
  updatePaymentStatus,
  getUserOrders,
  getAllOrders,
  getPaymentIntent
}; 