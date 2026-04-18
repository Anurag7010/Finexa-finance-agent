const userSockets = new Map();
let ioInstance = null;
let isRedisSubscriberInitialized = false;

const logger = require('../lib/logger');
const { redisPublisher, redisSubscriber } = require('../lib/redis');

const ALERT_CHANNEL_PREFIX = 'alerts';
const INSIGHT_CHANNEL_PREFIX = 'insights';

/**
 * Emits a realtime event directly when a socket is available.
 */
function emitDirect(userId, eventName, payload) {
  if (!ioInstance) {
    return;
  }

  const socketId = userSockets.get(String(userId));
  if (socketId) {
    ioInstance.to(socketId).emit(eventName, payload);
  }
}

/**
 * Subscribes to Redis pub/sub channels and forwards messages to local sockets.
 */
async function setupRedisSubscriber() {
  if (isRedisSubscriberInitialized) {
    return;
  }

  await redisSubscriber.psubscribe(`${ALERT_CHANNEL_PREFIX}:*`, `${INSIGHT_CHANNEL_PREFIX}:*`);

  redisSubscriber.on('pmessage', (_pattern, channel, message) => {
    try {
      const [eventPrefix, userId] = channel.split(':');
      const payload = JSON.parse(message);

      if (eventPrefix === ALERT_CHANNEL_PREFIX) {
        emitDirect(userId, 'new_alert', payload);
      }

      if (eventPrefix === INSIGHT_CHANNEL_PREFIX) {
        emitDirect(userId, 'insight_update', payload);
      }
    } catch (error) {
      logger.error({ error, channel }, 'Failed to process Redis realtime message');
    }
  });

  isRedisSubscriberInitialized = true;
}

/**
 * Publishes an event to Redis so any API instance can fan it out via Socket.IO.
 */
async function publish(channel, payload) {
  await redisPublisher.publish(channel, JSON.stringify(payload));
}

function initSocket(io) {
  ioInstance = io;

  setupRedisSubscriber().catch((error) => {
    logger.error({ error }, 'Failed to initialize Redis subscriber for socket events');
  });

  io.on('connection', (socket) => {
    socket.on('register', (userId) => {
      if (!userId) {
        return;
      }
      userSockets.set(String(userId), socket.id);
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
    });
  });
}

async function pushAlertToUser(userId, alert) {
  try {
    await publish(`${ALERT_CHANNEL_PREFIX}:${String(userId)}`, alert);
  } catch (error) {
    logger.error({ error, userId }, 'Redis publish failed for alert event');
    emitDirect(userId, 'new_alert', alert);
  }
}

async function pushInsightUpdate(userId, insight) {
  try {
    await publish(`${INSIGHT_CHANNEL_PREFIX}:${String(userId)}`, insight);
  } catch (error) {
    logger.error({ error, userId }, 'Redis publish failed for insight event');
    emitDirect(userId, 'insight_update', insight);
  }
}

module.exports = {
  initSocket,
  pushAlertToUser,
  pushInsightUpdate,
};
