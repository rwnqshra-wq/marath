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
    'http://localhost:3000'
  ].filter(Boolean);

  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
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
    const expectedKey = process.env.INSTANCE_KEY || 'default_key';
    if (socket.handshake.query.instanceKey === expectedKey || expectedKey === 'default_key') {
      return next();
    }
    return next(new Error('Invalid instance key'));
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('user:join', async (data) => {
      const { sessionId, page } = data;
      socket.join(sessionId);
      
      connectedUsers.set(socket.id, { sessionId, page, joinedAt: new Date() });
      
      const { UserSession } = require('./models');
      await UserSession.findOneAndUpdate(
        { sessionId },
        { 
          $set: { 
            isConnected: true, 
            currentPage: page || 'index',
            lastActive: new Date()
          } 
        },
        { upsert: true }
      );
      
      io.emit('user:connected', { sessionId, page });
    });
    
    socket.on('user:page-change', async (data) => {
      const { sessionId, page } = data;
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        userInfo.page = page;
        connectedUsers.set(socket.id, userInfo);
      }
      
      const { UserSession } = require('./models');
      await UserSession.findOneAndUpdate(
        { sessionId },
        { $set: { currentPage: page, lastActive: new Date() } }
      );
      
      socket.to(sessionId).emit('user:page-change', { sessionId, page });
      io.emit('user:page-change', { sessionId, page });
    });
    
    socket.on('user:form-submit', async (data) => {
      const { sessionId, page, formData } = data;
      const { UserSession } = require('./models');
      await UserSession.findOneAndUpdate(
        { sessionId },
        { $set: { [`formData.${page}`]: formData, lastActive: new Date() } }
      );
      
      io.emit('user:form-submit', { sessionId, page, formData });
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
