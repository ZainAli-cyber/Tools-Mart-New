import { apiUrl } from './portalBase';
import { isMobileApp } from './toolLauncher';

export async function initMobilePush() {
  if (!isMobileApp()) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  try {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel({
      id: 'aitoolzmart_alerts',
      name: 'AI Toolz Mart Alerts',
      description: 'Admin updates, support replies, and ticket alerts',
      importance: 5,
      sound: 'default',
      vibration: true,
      visibility: 1,
    });
  } catch {
    /* channel may exist */
  }

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return;

  await PushNotifications.addListener('registration', async reg => {
    try {
      const { supabase } = await import('../db');
      const { data } = await supabase.auth.getSession();
      const authToken = data.session?.access_token;
      if (!authToken) return;
      await fetch(apiUrl('/api/mobile/push/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token: reg.value, platform: 'android' }),
      });
    } catch {
      /* ignore */
    }
  });

  await PushNotifications.addListener('registrationError', err => {
    console.warn('[push] registration error', err);
  });

  await PushNotifications.addListener('pushNotificationReceived', async notification => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2147483647,
            title: notification.title || 'AI Toolz Mart',
            body: notification.body || '',
            channelId: 'aitoolzmart_alerts',
            sound: 'default',
            smallIcon: 'ic_notification',
          },
        ],
      });
    } catch {
      /* ignore */
    }
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', () => {
    /* opening app is enough — user lands on dashboard */
  });

  await PushNotifications.register();
}
