const express = require('express');
const router = express.Router();
const path = require('path');
const { dashboardAuth, createDashboardToken } = require('../middleware/auth');

router.get('/dashboard/login', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '../../dashboard/login.html'));
});

router.post('/dashboard/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'password123';
  
  if (username === adminUser && password === adminPass) {
    req.session.isAuthenticated = true;
    const token = createDashboardToken({ username: adminUser });
    return res.json({ success: true, token, redirectUrl: '/dashboard' });
  }
  return res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
});

router.get('/dashboard', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/index.html'));
});

router.get('/dashboard/logout', (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect('/dashboard/login');
});

router.post('/dashboard/logout', (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  return res.json({ success: true });
});

module.exports = router;

