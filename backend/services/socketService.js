const userSockets = new Map();
let ioInstance = null;

function initSocket(io) {
  ioInstance = io;

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

function pushAlertToUser(userId, alert) {
  if (!ioInstance) {
    return;
  }

  const socketId = userSockets.get(String(userId));
  if (socketId) {
    ioInstance.to(socketId).emit('new_alert', alert);
  }
}

function pushInsightUpdate(userId, insight) {
  if (!ioInstance) {
    return;
  }

  const socketId = userSockets.get(String(userId));
  if (socketId) {
    ioInstance.to(socketId).emit('insight_update', insight);
  }
}

module.exports = {
  initSocket,
  pushAlertToUser,
  pushInsightUpdate,
};
