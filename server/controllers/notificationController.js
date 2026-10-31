const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * @route   GET /api/notifications
 * @desc    Fetch authenticated user's notifications & unread count
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching notifications.'
    });
  }
};

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for navbar badge
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Get Unread Count Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching unread count.'
    });
  }
};

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      recipientId: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    notification.isRead = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating notification status.'
    });
  }
};

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      unreadCount: 0
    });
  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating notifications.'
    });
  }
};

/**
 * Helper: Create notification for a specific user
 */
const sendNotification = async ({ recipientId, role, title, message, type, bookingId = null }) => {
  try {
    const notification = await Notification.create({
      recipientId,
      role,
      title,
      message,
      type,
      bookingId,
      isRead: false,
      createdAt: new Date()
    });
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
};

/**
 * Helper: Notify all admin users
 */
const notifyAdmins = async ({ title, message, type, bookingId = null }) => {
  try {
    const admins = await User.find({ role: 'admin' });
    const notifications = [];
    for (const admin of admins) {
      const notif = await Notification.create({
        recipientId: admin._id,
        role: 'admin',
        title,
        message,
        type,
        bookingId,
        isRead: false,
        createdAt: new Date()
      });
      notifications.push(notif);
    }
    return notifications;
  } catch (err) {
    console.error('Failed to notify admins:', err);
    return [];
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  sendNotification,
  notifyAdmins
};
