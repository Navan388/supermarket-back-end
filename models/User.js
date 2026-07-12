const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Customer', 'Delivery Boy'],
      required: true,
    },
    profilePic: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
    // Customer specific
    reviewsCount: {
      type: Number,
      default: 0,
    },
    // Delivery Boy specific
    ordersCompleted: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    workSetup: {
      type: String,
      enum: ['Petrol Vehicle', 'Electric Vehicle'],
      default: 'Petrol Vehicle',
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
