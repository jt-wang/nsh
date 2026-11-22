package com.longbridge.nsh;

/** Run with javac and java -ea; no Android runtime or test framework needed. */
public final class ShimmerMotionTest {
    public static void main(String[] args) {
        for (int bits = 0; bits < 128; bits++) {
            boolean enabled = (bits & 1) != 0, attached = (bits & 2) != 0, visible = (bits & 4) != 0;
            boolean hasText = (bits & 8) != 0, animations = (bits & 16) != 0, powerSave = (bits & 32) != 0;
            boolean highContrast = (bits & 64) != 0;
            assert ShimmerMotion.canRun(enabled, attached, visible, hasText, animations, powerSave, highContrast) == (bits == 31)
                    : "gating combination " + bits;
        }
        near(ShimmerMotion.bandStart(300, 1f / 3, 0), -100);
        near(ShimmerMotion.bandStart(300, 1f / 3, .25f), 0);
        near(ShimmerMotion.bandStart(300, 1f / 3, .5f), 100);
        near(ShimmerMotion.bandStart(300, 1f / 3, 1), 300);
        near(ShimmerMotion.bandStart(0, 1f / 3, .5f), 0);
        float previous = -Float.MAX_VALUE;
        for (int i = 0; i <= 100; i++) {
            float position = ShimmerMotion.bandStart(149, 1f / 3, i / 100f);
            assert position > previous : "the band must move left to right";
            previous = position;
        }
        System.out.println("PASS: 128 lifecycle combinations, band endpoints, empty width and linear sweep");
    }

    private static void near(float actual, float expected) {
        assert Math.abs(actual - expected) < .001f : actual + " != " + expected;
    }
}
