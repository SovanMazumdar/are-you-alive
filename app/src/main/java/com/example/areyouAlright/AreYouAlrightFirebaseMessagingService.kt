package com.example.areyouAlright

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class AreYouAlrightFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        remoteMessage.notification?.let {
            showNotification(
                it.title ?: "Are You Alright!",
                it.body  ?: "Don't forget to check in today!"
            )
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: POST token to /api/fcm-token on your Flask backend
    }

    private fun showNotification(title: String, body: String) {
        val channelId = "checkin_reminders"
        val intent = Intent(this, SplashActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pi = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            mgr.createNotificationChannel(
                NotificationChannel(
                    channelId, "Check-In Reminders",
                    NotificationManager.IMPORTANCE_HIGH
                )
            )
        }
        mgr.notify(
            System.currentTimeMillis().toInt(),
            NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle(title).setContentText(body)
                .setAutoCancel(true).setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()
        )
    }
}
