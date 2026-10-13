/**
 * Push Notification Service (Bonus Task)
 * Dispatches and stores push notifications when critical alerts (e.g. over-temperature > 40°C) occur.
 */

// In-memory push notifications ring buffer
const notificationsLog = [];
const MAX_NOTIFICATIONS = 50;

/**
 * Dispatch a push notification event
 * @param {Object} notification
 * @param {string} notification.type
 * @param {number} notification.deviceId
 * @param {string} notification.title
 * @param {string} notification.body
 * @param {string} notification.priority
 */
function sendPushNotification({ type, deviceId, title, body, priority = 'high' }) {
  const item = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    deviceId,
    title,
    body,
    priority,
    timestamp: new Date().toISOString(),
    read: false
  };

  notificationsLog.unshift(item);
  if (notificationsLog.length > MAX_NOTIFICATIONS) {
    notificationsLog.pop();
  }

  console.log(`[PUSH NOTIFICATION] 📱 ${priority.toUpperCase()} -> ${title}: ${body}`);
  return item;
}

/**
 * Get recent push notifications
 * @param {number} [limit=20]
 */
function getRecentNotifications(limit = 20) {
  return notificationsLog.slice(0, limit);
}

module.exports = {
  sendPushNotification,
  getRecentNotifications
};
