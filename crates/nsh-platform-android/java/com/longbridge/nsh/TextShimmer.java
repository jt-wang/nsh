package com.longbridge.nsh;

import android.animation.ValueAnimator;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Shader;
import android.text.Layout;
import android.text.TextPaint;
import android.view.View;
import android.view.animation.LinearInterpolator;

/** A single mask in the whole text's coordinates, driven on the UI thread. */
final class TextShimmer {
    private final View view;
    private final ValueAnimator animator = ValueAnimator.ofFloat(0, 1);
    private final Paint color = new Paint();
    private final Paint mask = new Paint();
    private final TextPaint savedPaint = new TextPaint();
    private final Matrix matrix = new Matrix();
    private final int[] coverage = new int[3];
    private final float[] stops = {0, .5f, 1};
    private LinearGradient gradient;
    private float fraction, gradientWidth = -1;
    private boolean running;

    TextShimmer(View view) {
        this.view = view;
        color.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        mask.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
        animator.setInterpolator(new LinearInterpolator());
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.addUpdateListener(a -> view.invalidate());
    }

    void configure(int highlight, int period, float width, float start, float center, float end) {
        color.setColor(highlight);
        animator.setDuration(period);
        int first = alpha(start), middle = alpha(center), last = alpha(end);
        if (fraction != width || coverage[0] != first || coverage[1] != middle || coverage[2] != last) {
            fraction = width;
            coverage[0] = first; coverage[1] = middle; coverage[2] = last;
            gradientWidth = -1;
        }
    }

    private static int alpha(float coverage) {
        return (Math.round(coverage * 255) << 24) | 0x00ffffff;
    }

    boolean running() {
        return running;
    }

    void setRunning(boolean running) {
        if (this.running == running) return;
        this.running = running;
        if (running) animator.start();
        else animator.cancel();
        view.invalidate();
    }

    void draw(Canvas canvas, Layout layout, float width, float height) {
        if (!running || width <= 0 || height <= 0) return;
        if (gradientWidth != width) {
            gradientWidth = width;
            gradient = new LinearGradient(0, 0, width * fraction, 0, coverage, stops, Shader.TileMode.CLAMP);
            mask.setShader(gradient);
        }
        matrix.setTranslate(ShimmerMotion.bandStart(width, fraction, animator.getAnimatedFraction()), 0);
        gradient.setLocalMatrix(matrix);
        int layer = canvas.saveLayer(0, 0, width, height, null);
        TextPaint paint = layout.getPaint();
        savedPaint.set(paint);
        paint.clearShadowLayer();
        try {
            layout.draw(canvas);
        } finally {
            paint.set(savedPaint);
        }
        canvas.drawRect(0, 0, width, height, color);
        canvas.drawRect(0, 0, width, height, mask);
        canvas.restoreToCount(layer);
    }
}
