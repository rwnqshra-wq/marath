const crypto = require('crypto');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const TOKEN_SECRET = process.env.SESSION_SECRET || 'doha-marathon-secret';

function createDashboardToken(payload = {}) {
  const data = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyDashboardToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) return null;
      return payload;
    }
  } catch (e) {
    return null;
  }
  return null;
}

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
      secure: process.env.NODE_ENV !== 'development', // Must be true for sameSite: 'none' unless local dev
      sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
};

const dashboardAuth = (req, res, next) => {
  // 1. Check Session
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  
  // 2. Check Token (Bearer token, x-auth-token, or query token)
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    const verified = verifyDashboardToken(token);
    if (verified) {
      req.dashboardUser = verified;
      return next();
    }
  }
  
  // 3. API endpoints must NEVER return HTML redirects
  const isApi = (req.originalUrl && req.originalUrl.startsWith('/api')) || 
                (req.baseUrl && req.baseUrl.startsWith('/api')) || 
                (req.path && req.path.startsWith('/api')) ||
                req.xhr ||
                (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  return res.redirect('/dashboard/login');
};

const apiAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  if (token === process.env.API_TOKEN) {
    return next();
  }
  return res.status(401).json({ error: 'Invalid token' });
};

module.exports = { sessionMiddleware, dashboardAuth, apiAuth, createDashboardToken, verifyDashboardToken };

