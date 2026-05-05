const { Expo } = require('expo-server-sdk');
const expo = new Expo();

// Initialize Expo SDK
const initExpo = () => {
  try {
    // Use your access token from Expo dashboard
    // For development, you can use the project ID directly
    // For production, you'll need to configure properly
    if (process.env.NODE_ENV === 'development') {
      expo.usePushNotifications({
        experienceId: '@miguisha/bikore',
        accessToken: process.env.EXPO_ACCESS_TOKEN,
        webApiKey: process.env.EXPO_WEB_API_KEY,
      });
    } else {
      expo.usePushNotifications({
        experienceId: '@miguisha/bikore',
        accessToken: process.env.EXPO_ACCESS_TOKEN,
        webApiKey: process.env.EXPO_WEB_API_KEY,
      });
    }
    
    console.log('Expo push notifications initialized');
  } catch (error) {
    console.error('Failed to initialize Expo push notifications:', error);
  }
};

// Send push notification to a specific device token
async function sendPushNotification({ token, title, body, data = {} }) {
  try {
    // Validate token format
    if (!Expo.isExpoPushToken(token)) {
      console.warn('Invalid push token format:', token);
      return false;
    }
    
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    };
    
    const tickets = await expo.sendPushNotificationsAsync([message]);
    
    console.log(`Push notification sent to ${token}:`, title);
    return tickets;
    
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// Send bulk push notifications to multiple devices
async function sendBulkPushNotifications({ notifications }) {
  try {
    // Filter out invalid tokens
    const validNotifications = notifications.filter(n => 
      n && Expo.isExpoPushToken(n.token)
    );
    
    if (validNotifications.length === 0) {
      console.log('No valid notifications to send');
      return [];
    }
    
    const messages = validNotifications.map(n => ({
      to: n.token,
      sound: 'default',
      title: n.title,
      body: n.body,
      data: n.data || {},
      priority: 'high',
    }));
    
    const tickets = await expo.sendPushNotificationsAsync(messages);
    
    console.log(`Bulk push notifications sent: ${validNotifications.length} notifications`);
    return tickets;
    
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    return [];
  }
}

// Create notification records in database
async function createNotificationRecords({ userId, notifications }) {
  try {
    const { db } = require('../db');
    
    for (const notification of notifications) {
      const insertQuery = `
        INSERT INTO notifications (user_id, type, title, body, data, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      
      await db.query(insertQuery, [
        userId,
        notification.type,
        notification.title,
        notification.body,
        JSON.stringify(notification.data)
      ]);
    }
    
    console.log(`Created ${notifications.length} notification records`);
    
  } catch (error) {
    console.error('Error creating notification records:', error);
  }
}

// Trigger different types of notifications
async function triggerPaymentDueReminder({ userId, groupName, amount, dueDate }) {
  const title = 'Payment Due Reminder';
  const body = `Your payment of Rwf ${amount} for ${groupName} is due in 3 days on ${dueDate}.`;
  const data = { 
    type: 'payment_due',
    groupName, 
    amount, 
    dueDate 
  };
  
  return { title, body, data };
}

async function triggerPaymentConfirmed({ userId, groupName, amount }) {
  const title = 'Payment Confirmed';
  const body = `Your payment of Rwf ${amount} for ${groupName} has been confirmed.`;
  const data = { 
    type: 'payment_confirmed',
    groupName, 
    amount 
  };
  
  return { title, body, data };
}

async function triggerJoinRequestReceived({ userId, groupName }) {
  const title = 'Join Request Received';
  const body = `${groupName} has received a new join request.`;
  const data = { 
    type: 'join_request_received',
    groupName 
  };
  
  return { title, body, data };
}

async function triggerJoinRequestApproved({ userId, groupName }) {
  const title = 'Join Request Approved';
  const body = `Your request to join ${groupName} has been approved!`;
  const data = { 
    type: 'join_request_approved',
    groupName 
  };
  
  return { title, body, data };
}

async function triggerJoinRequestRejected({ userId, groupName }) {
  const title = 'Join Request Rejected';
  const body = `Your request to join ${groupName} was not approved.`;
  const data = { 
    type: 'join_request_rejected',
    groupName 
  };
  
  return { title, body, data };
}

async function triggerPayoutConfirmed({ userId, groupName, amount }) {
  const title = 'Payout Confirmed';
  const body = `Your payout of Rwf ${amount} from ${groupName} has been confirmed.`;
  const data = { 
    type: 'payout_confirmed',
    groupName, 
    amount 
  };
  
  return { title, body, data };
}

async function triggerNewCycleStarted({ userId, groupName, cycleNumber }) {
  const title = 'New Cycle Started';
  const body = `Cycle ${cycleNumber} has started in ${groupName}. Your contribution is due.`;
  const data = { 
    type: 'new_cycle_started',
    groupName, 
    cycleNumber 
  };
  
  return { title, body, data };
}

async function triggerMissedPayment({ userId, groupName, amount }) {
  const title = 'Missed Payment';
  const body = `You missed your payment of Rwf ${amount} for ${groupName}. Please pay as soon as possible.`;
  const data = { 
    type: 'missed_payment',
    groupName, 
    amount 
  };
  
  return { title, body, data };
}

module.exports = {
  initExpo,
  sendPushNotification,
  sendBulkPushNotifications,
  createNotificationRecords,
  triggerPaymentDueReminder,
  triggerPaymentConfirmed,
  triggerJoinRequestReceived,
  triggerJoinRequestApproved,
  triggerJoinRequestRejected,
  triggerPayoutConfirmed,
  triggerNewCycleStarted,
  triggerMissedPayment
};
