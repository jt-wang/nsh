package com.longbridge.nsh;

import android.animation.ValueAnimator;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.ContentObserver;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import java.util.HashSet;

/** One receiver and settings observer per surface, only while shimmer text is attached. */
final class ShimmerEnvironment {
    private final Context context;
    private final HashSet<TextBox> views = new HashSet<>();
    boolean animationsEnabled, powerSave, highContrast;

    ShimmerEnvironment(Context context) {
        this.context = context.getApplicationContext();
    }

    private final BroadcastReceiver power = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            refresh();
        }
    };
    private final ContentObserver motion = new ContentObserver(new Handler(Looper.getMainLooper())) {
        @Override
        public void onChange(boolean selfChange) {
            refresh();
        }
    };

    void add(TextBox view) {
        if (views.isEmpty()) {
            IntentFilter filter = new IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED);
            if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(power, filter, Context.RECEIVER_NOT_EXPORTED);
            else context.registerReceiver(power, filter);
            context.getContentResolver().registerContentObserver(
                    Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, motion);
            context.getContentResolver().registerContentObserver(
                    Settings.Secure.getUriFor("high_text_contrast_enabled"), false, motion);
            read();
        }
        views.add(view);
    }

    void remove(TextBox view) {
        if (!views.remove(view) || !views.isEmpty()) return;
        context.unregisterReceiver(power);
        context.getContentResolver().unregisterContentObserver(motion);
    }

    private void read() {
        animationsEnabled = (Build.VERSION.SDK_INT < 26 || ValueAnimator.areAnimatorsEnabled()) && Settings.Global.getFloat(
                context.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0;
        PowerManager manager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        powerSave = manager != null && manager.isPowerSaveMode();
        highContrast = Settings.Secure.getInt(context.getContentResolver(), "high_text_contrast_enabled", 0) != 0;
    }

    private void refresh() {
        read();
        for (TextBox view : views) view.updateShimmer();
    }
}
