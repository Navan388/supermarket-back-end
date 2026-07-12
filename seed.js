const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');
const Notification = require('./models/Notification');
const products = require('./data/products');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();
    await Notification.deleteMany();

    console.log('Data Destroyed...');

    const createdProducts = await Product.insertMany(products);
    console.log(`Imported ${createdProducts.length} products`);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  // destroy data
} else {
  importData();
}
