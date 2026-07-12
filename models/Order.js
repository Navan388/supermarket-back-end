const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        servings: { type: String, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
      },
    ],
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    phone: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0.0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
    status: {
      type: String,
      enum: ['Placed', 'Preparing', 'Packed', 'Out For Delivery', 'Delivered', 'Cancelled'],
      default: 'Placed',
    },
    branch: {
      type: String,
      required: true,
    },
    branchLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    timeline: [
      {
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
