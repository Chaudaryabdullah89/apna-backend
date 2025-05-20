const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');
const stripe = require('../config/stripe');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

router.use(express.json());

// Get orders for the authenticated user - This route must come before /:id
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all orders (Admin only) - This route must come before /:id
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new order (removed protect middleware to allow guest orders)
router.post('/', async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      customerName,
      customerEmail,
      userId // Optional, will be null for guest orders
    } = req.body;

    // Validate required fields
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    if (!customerName || !customerEmail) {
      return res.status(400).json({ error: 'Customer name and email are required' });
    }

    // Validate shipping address fields
    const requiredAddressFields = ['street', 'city', 'state', 'postalCode', 'country'];
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        return res.status(400).json({ error: `Shipping address ${field} is required` });
      }
    }

    // Create order
    const order = new Order({
      user: userId || null, // Will be null for guest orders
      customerName,
      customerEmail,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      totalAmount: totalPrice,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Save order
    const savedOrder = await order.save();
    console.log('Order created successfully:', savedOrder._id);

    // Send order confirmation email
    try {
      await sendEmail(
        customerEmail,
        'Order Confirmation',
        'orderConfirmation',
        {
          name: customerName,
          orderNumber: savedOrder._id.toString().slice(-6),
          orderDate: new Date().toLocaleDateString(),
          paymentMethod: savedOrder.paymentMethod || 'Credit Card',
          shippingMethod: 'Standard Shipping',
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          subtotal: savedOrder.totalAmount,
          shippingCost: savedOrder.shippingPrice,
          tax: savedOrder.taxPrice,
          totalAmount: savedOrder.totalAmount,
          shippingAddress: savedOrder.shippingAddress,
          trackingUrl: `${process.env.FRONTEND_URL}/order/${savedOrder._id}`
        }
      );
      console.log('Order confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
      // Don't fail order creation if email fails
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to process order',
      details: error.message 
    });
  }
});

// Update order payment status
router.put('/status', protect, async (req, res) => {
  try {
    const { orderId, paymentIntentId, status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      await order.save();
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
});

// Get single order details
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the user or if the user is an admin
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status, statusNote } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('user')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Add to status history
    order.statusHistory.push({
      status: status,
      note: statusNote || `Status updated to ${status}`,
      updatedAt: new Date()
    });

    // Update current status
    order.status = status;
    
    // Update delivery status if needed
    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    await order.save();

    // Send appropriate email based on status
    try {
      let emailType = 'orderStatusUpdate';
      let emailSubject = 'Order Status Update';
      let emailData = {
        name: order.user.name,
        orderNumber: order._id.toString().slice(-6),
        status: status.charAt(0).toUpperCase() + status.slice(1),
        updatedAt: new Date().toLocaleString(),
        trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`
      };

      // Send different email for shipping notification
      if (status === 'shipped') {
        emailType = 'shippingNotification';
        emailSubject = 'Your Order Has Shipped!';
        emailData = {
          ...emailData,
          carrier: 'Standard Shipping',
          trackingNumber: order._id.toString().slice(-8),
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        };
      }

      // Send different email for delivery confirmation
      if (status === 'delivered') {
        emailType = 'deliveryConfirmation';
        emailSubject = 'Order Delivered!';
        emailData = {
          ...emailData,
          deliveredAt: new Date().toLocaleString(),
          deliveryLocation: `${order.shippingAddress.street}, ${order.shippingAddress.city}`,
          feedbackUrl: `${process.env.FRONTEND_URL}/order/${order._id}/feedback`
        };
      }

      await sendEmail(
        order.user.email,
        emailSubject,
        emailType,
        emailData
      );
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
      // Don't fail status update if email fails
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update order to paid
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Dismiss order
router.put('/:id/dismiss', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Add to status history
    order.statusHistory.push({
      status: 'dismissed',
      note: 'Order dismissed by admin',
      updatedAt: new Date()
    });

    // Update current status
    order.status = 'dismissed';

    await order.save();

    // Send dismissal notification email
    try {
      await sendEmail(
        order.user.email,
        'Order Dismissed',
        'orderDismissed',
        {
          name: order.user.name,
          orderNumber: order._id.toString().slice(-6),
          dismissedAt: new Date().toLocaleString(),
          orderDetails: {
            totalAmount: order.totalAmount,
            items: order.items.map(item => ({
              name: item.product?.name || item.name,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      );
    } catch (emailError) {
      console.error('Error sending dismissal email:', emailError);
      // Don't fail dismissal if email fails
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update order to delivered (admin only)
router.put('/:id/deliver', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete order (admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    await order.remove();
    res.json({ message: 'Order removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 