const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Create new order
router.post('/', protect, async (req, res) => {
  try {
    const {
      orderItems,
      deliveryAddress,
      deliveryLocation,
      branchLocation,
      paymentMethod,
      itemsPrice,
      deliveryFee,
      grandTotal,
      phone,
      customerId,
      branch,
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    if (req.user._id.toString() !== customerId && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to create order for this customer' });
    }

    const order = new Order({
      orderItems,
      customer: customerId,
      deliveryAddress,
      deliveryLocation,
      paymentMethod,
      itemsPrice,
      deliveryFee,
      grandTotal,
      phone,
      branch,
      branchLocation,
      timeline: [{ status: 'Placed' }],
    });

    const createdOrder = await order.save();

    // Decrement stock for each product
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.countInStock -= item.qty;
        await product.save();
      }
    }

    // Create Notification for Customer
    const customerNotification = new Notification({
      user: customerId,
      message: `Your order ${createdOrder._id.toString().slice(-6).toUpperCase()} has been placed successfully!`,
    });
    await customerNotification.save();

    if (req.io) {
      req.io.emit(`notification_${customerId}`, customerNotification);
    }

    // Create Notification for all Delivery Boys
    const deliveryBoys = await User.find({ role: 'Delivery Boy' });
    for (const dboy of deliveryBoys) {
      const dbNotification = new Notification({
        user: dboy._id,
        message: `New order assigned! Order ${createdOrder._id.toString().slice(-6).toUpperCase()} — Tap to view.`,
      });
      await dbNotification.save();
      if (req.io) {
        req.io.emit(`notification_${dboy._id}`, dbNotification);
      }
    }

    // Emit event for real-time update
    if (req.io) {
      req.io.emit('new_order', createdOrder);
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'fullName email')
      .populate('deliveryBoy', 'fullName phone');

    if (order) {
      const isCustomer = order.customer._id.toString() === req.user._id.toString();
      const isDeliveryBoy = order.deliveryBoy && order.deliveryBoy._id.toString() === req.user._id.toString();
      if (!isCustomer && !isDeliveryBoy && req.user.role !== 'Admin' && req.user.role !== 'Delivery Boy') {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get logged in customer orders
router.get('/customer/:id', protect, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to view these orders' });
    }
    const orders = await Order.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all remaining orders for Delivery Boy
router.get('/delivery/available', protect, async (req, res) => {
  try {
    if (req.user.role !== 'Delivery Boy' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const orders = await Order.find({ status: 'Placed' })
      .populate('customer', 'fullName phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get logged in delivery boy active/completed orders
router.get('/delivery/:id', protect, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to view these orders' });
    }
    const orders = await Order.find({ deliveryBoy: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, deliveryBoyId } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      if (req.user.role !== 'Delivery Boy' && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not authorized to update status' });
      }
      order.status = status;
      order.timeline.push({ status });

      if (deliveryBoyId && status === 'Preparing') {
        order.deliveryBoy = deliveryBoyId;
      }

      const updatedOrder = await order.save();

      // Create Customer Notification
      let notificationMsg = '';
      if (status === 'Preparing') {
        notificationMsg = 'Good news! Your order is being prepared and will be delivered soon.';
      } else if (status === 'Packed') {
        notificationMsg = 'Your order is being packed and will be on its way shortly!';
      } else if (status === 'Out For Delivery') {
        notificationMsg = 'Your order is out for delivery! Our delivery partner is on the way.';
      } else if (status === 'Delivered') {
        notificationMsg = 'Your order has been delivered! Enjoy!';
      }

      if (notificationMsg) {
        const customerNotification = new Notification({
          user: order.customer,
          message: notificationMsg,
        });
        await customerNotification.save();
        if (req.io) {
          req.io.emit(`notification_${order.customer}`, customerNotification);
        }
      }

      if (req.io) {
        req.io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel order
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not authorized to cancel this order' });
      }
      if (order.status !== 'Placed') {
        return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
      }

      order.status = 'Cancelled';
      order.timeline.push({ status: 'Cancelled' });
      const updatedOrder = await order.save();

      // Restore stock for each product
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          product.countInStock += item.qty;
          await product.save();
        }
      }

      // Create Customer Notification
      const customerNotification = new Notification({
        user: order.customer,
        message: `Your order ${order._id.toString().slice(-6).toUpperCase()} has been successfully cancelled.`,
      });
      await customerNotification.save();

      if (req.io) {
        req.io.emit(`notification_${order.customer}`, customerNotification);
        req.io.to(updatedOrder._id.toString()).emit('order_status_update', updatedOrder);
      }

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
