const { Expo } = require('expo-server-sdk');

let expo = new Expo();

const sendPushNotification = async (pushToken, message) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      badge: 1,
      body: message,
      data: { withSome: 'data' },
    },
  ];

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }

  // Handle receipts if necessary, but this is basic implementation
};

module.exports = { sendPushNotification };
