const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Pass io to request object if needed in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const orderRoutes = require('./routes/order');
const notificationRoutes = require('./routes/notification');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('A-Z Supermarket API is running...');
});

// Create HTTP server
const server = http.createServer(app);

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Order = require('./models/Order');

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id} (${socket.user.role})`);
  
  if (socket.user.role === 'Delivery Boy') {
    socket.join('delivery_boys');
  }

  socket.on('join_order_room', async (orderId) => {
    try {
      const order = await Order.findById(orderId);
      if (!order) return;
      
      const isCustomer = order.customer.toString() === socket.user._id.toString();
      const isAssignedDeliveryBoy = order.deliveryBoy && order.deliveryBoy.toString() === socket.user._id.toString();
      
      if (isCustomer || isAssignedDeliveryBoy || socket.user.role === 'Admin') {
        socket.join(orderId);
        console.log(`User joined order room: ${orderId}`);
      }
    } catch (error) {
      console.log('Error joining order room', error);
    }
  });

  socket.on('update_location', async (data) => {
    // data = { orderId, latitude, longitude }
    if (socket.user.role === 'Delivery Boy') {
      try {
        const order = await Order.findById(data.orderId);
        if (order && order.deliveryBoy && order.deliveryBoy.toString() === socket.user._id.toString()) {
          io.to(data.orderId).emit('location_update', data);
        }
      } catch (error) {
        console.log('Error updating location', error);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
