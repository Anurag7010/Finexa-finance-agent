const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const config = require('./config/env');
const logger = require('./lib/logger');
const requestLogger = require('./middleware/requestLogger');
const {
  generalApiRateLimiter,
} = require('./middleware/rateLimiter');
const { isRedisHealthy } = require('./lib/redis');
const { initTracing, shutdownTracing } = require('./lib/tracing');
const { checkAiHealth } = require('./services/aiService');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const insightRoutes = require('./routes/insights');
const alertRoutes = require('./routes/alerts');
const chatRoutes = require('./routes/chat');
const goalRoutes = require('./routes/goals');
const subscriptionRoutes = require('./routes/subscriptions');
const dataSourceRoutes = require('./routes/dataSources');
const syncRoutes = require('./routes/sync');
const { initSocket } = require('./services/socketService');

initTracing();

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

initSocket(io);

app.use(requestLogger);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', async (req, res) => {
  const mongodbConnected = mongoose.connection.readyState === 1;

  const [redisConnected, aiServiceReachable] = await Promise.all([
    isRedisHealthy(),
    checkAiHealth(),
  ]);

  const allHealthy = mongodbConnected && redisConnected && aiServiceReachable;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: mongodbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
      aiService: aiServiceReachable ? 'reachable' : 'unreachable',
    },
    version: config.appVersion,
    uptime: Number(process.uptime().toFixed(0)),
  });
});

app.use('/api', generalApiRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/datasources', dataSourceRoutes);
app.use('/api/sync', syncRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  logger.error({ error, path: req.path }, 'Unhandled route error');
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

const port = config.port;

mongoose
  .connect(config.mongodbUri)
  .then(() => {
    httpServer.listen(port, () => {
      logger.info({ port }, 'Backend server is running');
    });
  })
  .catch((error) => {
    logger.error({ error }, 'Failed to connect to MongoDB');
    process.exit(1);
  });

/**
 * Gracefully shuts down server resources.
 */
async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');

  httpServer.close(async () => {
    await mongoose.connection.close();
    await shutdownTracing();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});
