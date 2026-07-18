const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, city, country, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      city,
      country,
      role,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        city: user.city,
        country: user.country,
        role: user.role,
        workSetup: user.workSetup,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        city: user.city,
        country: user.country,
        role: user.role,
        workSetup: user.workSetup,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Profile
router.get('/profile', async (req, res) => {
  try {
    // We would normally use auth middleware here.
    // Simplifying for now: expecting user ID in query or headers.
    const userId = req.headers.authorization?.split(' ')[1];
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(userId, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1];
    if (!userId) return res.status(401).json({ message: 'Not authorized' });
    
    const decoded = jwt.verify(userId, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.city = req.body.city || user.city;
      user.country = req.body.country || user.country;
      
      if (req.body.workSetup) {
        user.workSetup = req.body.workSetup;
      }
      
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        city: updatedUser.city,
        country: updatedUser.country,
        role: updatedUser.role,
        workSetup: updatedUser.workSetup,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Profile
router.delete('/profile', async (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1];
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(userId, process.env.JWT_SECRET);
    await User.findByIdAndDelete(decoded.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Push Token
router.put('/push-token', async (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1];
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(userId, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      user.expoPushToken = req.body.token;
      await user.save();
      res.json({ message: 'Push token updated' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = router;
