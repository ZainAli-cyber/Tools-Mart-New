package com.aitoolzmart.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ToolLauncherPlugin.class);
        createAlertChannel();
        super.onCreate(savedInstanceState);
    }

    private void createAlertChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            "aitoolzmart_alerts",
            "AI Toolz Mart Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Admin updates, support replies, and ticket alerts");
        channel.enableVibration(true);
        channel.setSound(
            android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }
}
