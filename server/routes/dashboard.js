const express = require('express');
const router = express.Router();
const path = require('path');
const { dashboardAuth } = require('../middleware/auth');

router.get('/dashboard/login', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '../../dashboard/login.html'));
});

router.post('/dashboard/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'password';
  
  if (username === adminUser && password === adminPass) {
    req.session.isAuthenticated = true;
    return res.json({ success: true, redirectUrl: '/dashboard' });
  }
  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

router.get('/dashboard', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/index.html'));
});

router.get('/dashboard/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/dashboard/login');
});

module.exports = router;
