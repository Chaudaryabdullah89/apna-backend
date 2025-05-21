const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { sendEmail } = require('../utils/sendEmail');

// Get all orders with detailed information
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name price images'
      })
      .sort({ createdAt: -1 });

    // Transform the data to include more detailed information
    const transformedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order._id.toString().slice(-6),
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        userId: order.user?._id || null
      },
      items: order.items.map(item => ({
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.price,
          image: item.product.images[0] || null
        },
        quantity: item.quantity,
        size: item.size,
        total: item.price * item.quantity
      })),
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      statusHistory: order.statusHistory,
      totalAmount: order.totalAmount,
      shippingPrice: order.shippingPrice,
      taxPrice: order.taxPrice,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      isDelivered: order.isDelivered,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.json(transformedOrders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const paymentStatusCounts = await Order.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .populate('items.product', 'name price');

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      paymentStatusCounts: paymentStatusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch order statistics' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status
    order.status = status;
    order.statusHistory.push({
      status,
      note: note || `Status updated to ${status}`,
      updatedAt: new Date()
    });

    await order.save();

    // Send email notification
    try {
      await sendEmail(
        order.customerEmail,
        'Order Status Update',
        'orderStatusUpdate',
        {
          name: order.customerName,
          orderNumber: order._id.toString().slice(-6),
          status: status.charAt(0).toUpperCase() + status.slice(1),
          updatedAt: new Date().toLocaleString(),
          trackingUrl: `${process.env.FRONTEND_URL}/order/${order._id}`,
          items: order.items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: order.totalAmount,
          shippingAddress: order.shippingAddress
        }
      );
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Order status updated successfully',
      order: {
        ...order.toObject(),
        statusHistory: order.statusHistory
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message || 'Failed to update order status' });
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        select: 'name price images description'
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch order details' });
  }
};

// Delete order
const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.remove();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: error.message || 'Failed to delete order' });
  }
};

module.exports = {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  getOrderDetails,
  deleteOrder
}; 