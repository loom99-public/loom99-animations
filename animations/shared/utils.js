// Shared utilities for loom99 animations

// Random utilities
export const Random = {
    range: (min, max) => min + Math.random() * (max - min),
    int: (min, max) => Math.floor(Random.range(min, max + 1)),
    pick: (arr) => arr[Random.int(0, arr.length - 1)],
    vary: (base, variance) => base + Random.range(-variance, variance),
    varyPercent: (base, percent) => base * Random.range(1 - percent, 1 + percent),
};

// Color utilities
export const ColorRandom = {
    baseColors: {
        red: { h: 0, s: 100, l: 59 },
        orange: { h: 25, s: 100, l: 50 },
        yellow: { h: 50, s: 100, l: 50 },
        cyan: { h: 187, s: 100, l: 50 },
        purple: { h: 262, s: 93, l: 58 },
        pink: { h: 340, s: 100, l: 59 }
    },
    shiftColor: (hsl, hueShift, satShift, lightShift) => ({
        h: (hsl.h + hueShift + 360) % 360,
        s: Math.max(0, Math.min(100, hsl.s + satShift)),
        l: Math.max(0, Math.min(100, hsl.l + lightShift))
    }),
    toHSL: (hsl) => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
};

// Easing functions
export const Easing = {
    linear: t => t,
    easeOutQuart: t => 1 - Math.pow(1 - t, 4),
    easeInQuart: t => t * t * t * t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInCubic: t => t * t * t,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuad: t => t * (2 - t),
    easeInQuad: t => t * t,
    easeOutSine: t => Math.sin(t * Math.PI / 2),
    easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
};

// Common timing constants
export const Timing = {
    HOLD_DURATION: 2000,
    EXIT_DURATION: 250
};
