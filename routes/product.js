const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product by category
router.get('/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product by id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add review
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment, userId, name } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === userId.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'Product already reviewed' });
      }

      const review = {
        name,
        rating: Number(rating),
        comment,
        user: userId,
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();

      // Update User reviews count
      const user = await User.findById(userId);
      if (user) {
        user.reviewsCount = (user.reviewsCount || 0) + 1;
        await user.save();
      }

      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update review
router.put('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment, userId } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const reviewIndex = product.reviews.findIndex(
        (r) => r.user.toString() === userId.toString()
      );

      if (reviewIndex !== -1) {
        product.reviews[reviewIndex].rating = Number(rating);
        product.reviews[reviewIndex].comment = comment;

        product.rating =
          product.reviews.reduce((acc, item) => item.rating + acc, 0) /
          product.reviews.length;

        await product.save();
        res.status(200).json({ message: 'Review updated' });
      } else {
        res.status(404).json({ message: 'Review not found' });
      }
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete review
router.delete('/:id/reviews/:userId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      const initialReviewsLength = product.reviews.length;
      product.reviews = product.reviews.filter(
        (r) => r.user.toString() !== req.params.userId.toString()
      );

      if (product.reviews.length < initialReviewsLength) {
        product.numReviews = product.reviews.length;
        product.rating = product.reviews.length > 0 ?
          product.reviews.reduce((acc, item) => item.rating + acc, 0) /
          product.reviews.length : 0;

        await product.save();

        // Update User reviews count
        const user = await User.findById(req.params.userId);
        if (user) {
          user.reviewsCount = Math.max(0, (user.reviewsCount || 0) - 1);
          await user.save();
        }

        res.status(200).json({ message: 'Review deleted' });
      } else {
        res.status(404).json({ message: 'Review not found' });
      }
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
