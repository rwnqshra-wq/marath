const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionMiddleware = (app) => {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'doha-marathon-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 24 hours
    }),
    cookie: {
      secure: true, // Required for sameSite: 'none'
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
};

const dashboardAuth = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.redirect('/dashboard/login');
};

const apiAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  // Simple token validation - in production use JWT
  if (token === process.env.API_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: 'Invalid token' });
};

module.exports = { sessionMiddleware, dashboardAuth, apiAuth };
