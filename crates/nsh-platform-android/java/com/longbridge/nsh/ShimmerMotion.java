package com.longbridge.nsh;

/** Paint-only shimmer geometry and lifecycle decisions, independent of Android. */
final class ShimmerMotion {
    static boolean canRun(boolean enabled, boolean attached, boolean visible, boolean hasText,
                          boolean animationsEnabled, boolean powerSave, boolean highContrast) {
        return enabled && attached && visible && hasText && animationsEnabled && !powerSave && !highContrast;
    }

    static float bandStart(float width, float bandFraction, float progress) {
        float band = width * bandFraction;
        return -band + (width + band) * progress;
    }
}
