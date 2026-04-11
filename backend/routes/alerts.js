const express = require('express');
const Alert = require('../models/Alert');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [alerts, unreadCount] = await Promise.all([
      Alert.find({ user_id: req.user.id })
        .sort({ triggered_at: -1 })
        .limit(50),
      Alert.countDocuments({ user_id: req.user.id, read: false }),
    ]);

    return res.json({ alerts, unreadCount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    const result = await Alert.updateMany(
      { user_id: req.user.id, read: false },
      { $set: { read: true } }
    );

    return res.json({ updated: result.modifiedCount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark all alerts as read' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: { read: true } },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    return res.json({ alert });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

module.exports = router;
