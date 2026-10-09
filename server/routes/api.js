const express = require('express');
const router = express.Router();
const { UserSession } = require('../models');
const { dashboardAuth } = require('../middleware/auth');

router.get('/stats', dashboardAuth, async (req, res) => {
  try {
    const activeUsers = await UserSession.countDocuments({ isConnected: true });
    res.json({
      activeUsers,
      paymentsToday: 120, // Dummy data as original
      totalRevenue: 5400, // Dummy data as original
      successRate: 98 // Dummy data as original
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', dashboardAuth, async (req, res) => {
  try {
    const users = await UserSession.find().sort({ lastActive: -1 }).limit(100);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:sessionId', dashboardAuth, async (req, res) => {
  try {
    const user = await UserSession.findOne({ sessionId: req.params.sessionId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/config', (req, res) => {
  res.json({
    projectName: process.env.PROJECT_NAME || 'ماراثون الدوحة 2027'
  });
});

router.post('/track', async (req, res) => {
  const { sessionId, type, page, data } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  try {
    if (type === 'page-view') {
      await UserSession.findOneAndUpdate(
        { sessionId },
        { 
          $set: { 
            isConnected: true, 
            currentPage: page,
            lastActive: new Date()
          } 
        },
        { upsert: true }
      );
      if (req.io) req.io.emit('user:page-change', { sessionId, page });
    } else if (type === 'form-submit') {
      await UserSession.findOneAndUpdate(
        { sessionId },
        { 
          $set: { 
            [`formData.${page}`]: data,
            lastActive: new Date()
          } 
        },
        { upsert: true }
      );
      if (req.io) req.io.emit('user:form-submit', { sessionId, page, formData: data });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
