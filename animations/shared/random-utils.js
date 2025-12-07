/**
 * Animation Randomization Utilities
 *
 * Modular randomization system where each property can be independently toggled.
 * Use: const config = createRandomConfig({ timing: true, colors: false, ... })
 */

// Seeded random for reproducible randomness (optional)
class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    range(min, max) {
        return min + this.next() * (max - min);
    }

    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    pick(array) {
        return array[this.int(0, array.length - 1)];
    }
}

// Core random utilities (non-seeded, true randomness)
const Random = {
    // Basic random in range
    range: (min, max) => min + Math.random() * (max - min),

    // Random integer inclusive
    int: (min, max) => Math.floor(Random.range(min, max + 1)),

    // Random from array
    pick: (arr) => arr[Random.int(0, arr.length - 1)],

    // Random with gaussian-ish distribution (center-weighted)
    gaussian: (min, max, skew = 1) => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        num = num / 10.0 + 0.5;
        if (num > 1 || num < 0) num = Random.gaussian(min, max, skew);
        num = Math.pow(num, skew);
        return min + num * (max - min);
    },

    // Random boolean with probability
    chance: (probability = 0.5) => Math.random() < probability,

    // Shuffle array (returns new array)
    shuffle: (arr) => {
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Random.int(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    // Random variation around a base value
    vary: (base, variance) => base + Random.range(-variance, variance),

    // Random variation as percentage
    varyPercent: (base, percent) => base * Random.range(1 - percent, 1 + percent),
};

// Color utilities
const ColorRandom = {
    // Base colors for the logo
    baseColors: {
        cyan: { h: 190, s: 100, l: 50 },
        purple: { h: 265, s: 85, l: 57 },
        pink: { h: 340, s: 100, l: 63 }
    },

    // Vary a color
    varyColor: (hsl, { hueVariance = 0, satVariance = 0, lightVariance = 0 }) => ({
        h: (hsl.h + Random.range(-hueVariance, hueVariance) + 360) % 360,
        s: Math.max(0, Math.min(100, hsl.s + Random.range(-satVariance, satVariance))),
        l: Math.max(0, Math.min(100, hsl.l + Random.range(-lightVariance, lightVariance)))
    }),

    // Convert HSL to CSS string
    toHSL: (hsl) => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,

    // Convert HSL to hex
    toHex: (hsl) => {
        const h = hsl.h / 360;
        const s = hsl.s / 100;
        const l = hsl.l / 100;

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },

    // Get random palette variation
    randomPalette: (variance = 'subtle') => {
        const levels = {
            subtle: { hue: 10, sat: 5, light: 5 },
            moderate: { hue: 25, sat: 15, light: 10 },
            wild: { hue: 60, sat: 30, light: 20 }
        };
        const v = levels[variance] || levels.subtle;

        return {
            cyan: ColorRandom.varyColor(ColorRandom.baseColors.cyan, { hueVariance: v.hue, satVariance: v.sat, lightVariance: v.light }),
            purple: ColorRandom.varyColor(ColorRandom.baseColors.purple, { hueVariance: v.hue, satVariance: v.sat, lightVariance: v.light }),
            pink: ColorRandom.varyColor(ColorRandom.baseColors.pink, { hueVariance: v.hue, satVariance: v.sat, lightVariance: v.light })
        };
    }
};

// Timing utilities
const TimingRandom = {
    // Easing functions
    easings: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => 1 - Math.pow(1 - t, 3),
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        easeInQuart: t => t * t * t * t,
        easeOutQuart: t => 1 - Math.pow(1 - t, 4),
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
        easeOutBack: t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        easeOutElastic: t => {
            if (t === 0 || t === 1) return t;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
        },
        easeOutBounce: t => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },

    // Get random easing
    randomEasing: (category = 'any') => {
        const categories = {
            smooth: ['easeOutCubic', 'easeOutQuart', 'easeInOutCubic'],
            bouncy: ['easeOutBack', 'easeOutElastic', 'easeOutBounce'],
            sharp: ['easeInQuad', 'easeOutQuad', 'linear'],
            any: Object.keys(TimingRandom.easings)
        };
        const name = Random.pick(categories[category] || categories.any);
        return { name, fn: TimingRandom.easings[name] };
    },

    // Vary duration
    varyDuration: (base, variance = 'subtle') => {
        const levels = { subtle: 0.1, moderate: 0.25, wild: 0.5 };
        return Random.varyPercent(base, levels[variance] || 0.1);
    },

    // Generate stagger delays
    randomStagger: (count, baseDelay = 100, variance = 'subtle') => {
        const levels = { subtle: 0.2, moderate: 0.4, wild: 0.7 };
        const v = levels[variance] || 0.2;

        return Array.from({ length: count }, (_, i) =>
            Random.varyPercent(i * baseDelay, v)
        );
    }
};

// Motion utilities
const MotionRandom = {
    // Random direction (radians)
    randomDirection: () => Random.range(0, Math.PI * 2),

    // Random from cardinal/diagonal directions
    randomCardinal: () => Random.pick([0, Math.PI/2, Math.PI, Math.PI * 1.5]),

    // Random start position off-screen
    randomOffscreen: (width = 600, height = 200, margin = 100) => {
        const side = Random.pick(['top', 'bottom', 'left', 'right']);
        switch (side) {
            case 'top': return { x: Random.range(0, width), y: -margin };
            case 'bottom': return { x: Random.range(0, width), y: height + margin };
            case 'left': return { x: -margin, y: Random.range(0, height) };
            case 'right': return { x: width + margin, y: Random.range(0, height) };
        }
    },

    // Random velocity
    randomVelocity: (minSpeed = 1, maxSpeed = 5) => {
        const angle = MotionRandom.randomDirection();
        const speed = Random.range(minSpeed, maxSpeed);
        return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    },

    // Vary position
    varyPosition: (pos, variance = 10) => ({
        x: Random.vary(pos.x, variance),
        y: Random.vary(pos.y, variance)
    }),

    // Random rotation
    randomRotation: (maxDegrees = 360) => Random.range(-maxDegrees, maxDegrees),

    // Random scale
    randomScale: (min = 0.8, max = 1.2) => Random.range(min, max)
};

// Effect utilities
const EffectRandom = {
    // Random blur
    randomBlur: (min = 0, max = 10) => Random.range(min, max),

    // Random glow intensity
    randomGlow: (min = 5, max = 20) => Random.range(min, max),

    // Random stroke width
    randomStroke: (base = 12, variance = 3) => Random.vary(base, variance),

    // Random opacity
    randomOpacity: (min = 0.7, max = 1) => Random.range(min, max)
};

// Particle utilities
const ParticleRandom = {
    // Random particle count
    randomCount: (base = 100, variance = 'subtle') => {
        const levels = { subtle: 0.2, moderate: 0.4, wild: 0.7 };
        return Math.round(Random.varyPercent(base, levels[variance] || 0.2));
    },

    // Random particle size
    randomSize: (base = 3, variance = 1) => Math.max(1, Random.vary(base, variance)),

    // Random particle behavior
    randomBehavior: () => Random.pick(['linear', 'spiral', 'wave', 'bounce', 'drift'])
};

/**
 * Master configuration creator
 * Toggle which properties are randomized
 */
function createRandomConfig(options = {}) {
    const defaults = {
        // Toggle categories
        timing: true,
        colors: true,
        motion: true,
        effects: true,
        particles: true,

        // Variance level: 'subtle', 'moderate', 'wild'
        variance: 'subtle',

        // Mode: 'varied' (multiple modes + subtle), 'procedural' (heavy random)
        mode: 'varied',

        // Seed for reproducibility (null = true random)
        seed: null
    };

    const config = { ...defaults, ...options };
    const variance = config.mode === 'procedural' ? 'wild' : config.variance;

    return {
        // Meta
        mode: config.mode,
        variance,
        seed: config.seed,

        // Timing (if enabled)
        timing: config.timing ? {
            enabled: true,
            duration: (base) => TimingRandom.varyDuration(base, variance),
            delay: (base) => TimingRandom.varyDuration(base, variance),
            stagger: (count, base) => TimingRandom.randomStagger(count, base, variance),
            easing: () => TimingRandom.randomEasing(config.mode === 'procedural' ? 'any' : 'smooth')
        } : { enabled: false },

        // Colors (if enabled)
        colors: config.colors ? {
            enabled: true,
            palette: () => ColorRandom.randomPalette(variance),
            vary: (hsl) => ColorRandom.varyColor(hsl, {
                hueVariance: variance === 'wild' ? 60 : variance === 'moderate' ? 25 : 10,
                satVariance: variance === 'wild' ? 30 : variance === 'moderate' ? 15 : 5,
                lightVariance: variance === 'wild' ? 20 : variance === 'moderate' ? 10 : 5
            })
        } : { enabled: false },

        // Motion (if enabled)
        motion: config.motion ? {
            enabled: true,
            direction: () => config.mode === 'procedural' ? MotionRandom.randomDirection() : MotionRandom.randomCardinal(),
            startPosition: (w, h) => MotionRandom.randomOffscreen(w, h, variance === 'wild' ? 200 : 100),
            varyPosition: (pos) => MotionRandom.varyPosition(pos, variance === 'wild' ? 30 : variance === 'moderate' ? 15 : 5),
            rotation: () => MotionRandom.randomRotation(variance === 'wild' ? 720 : variance === 'moderate' ? 180 : 45),
            scale: () => MotionRandom.randomScale(
                variance === 'wild' ? 0.5 : variance === 'moderate' ? 0.7 : 0.9,
                variance === 'wild' ? 1.5 : variance === 'moderate' ? 1.3 : 1.1
            )
        } : { enabled: false },

        // Effects (if enabled)
        effects: config.effects ? {
            enabled: true,
            blur: () => EffectRandom.randomBlur(0, variance === 'wild' ? 15 : variance === 'moderate' ? 8 : 3),
            glow: () => EffectRandom.randomGlow(
                variance === 'wild' ? 0 : 5,
                variance === 'wild' ? 30 : variance === 'moderate' ? 20 : 12
            ),
            stroke: (base) => variance === 'wild' ? EffectRandom.randomStroke(base, 5) : EffectRandom.randomStroke(base, 2),
            opacity: () => EffectRandom.randomOpacity(variance === 'wild' ? 0.5 : 0.8, 1)
        } : { enabled: false },

        // Particles (if enabled)
        particles: config.particles ? {
            enabled: true,
            count: (base) => ParticleRandom.randomCount(base, variance),
            size: (base) => ParticleRandom.randomSize(base, variance === 'wild' ? 2 : 1),
            behavior: () => config.mode === 'procedural' ? ParticleRandom.randomBehavior() : 'linear'
        } : { enabled: false }
    };
}

/**
 * Animation mode selector
 * Randomly picks from predefined variations
 */
function selectMode(modes, weights = null) {
    if (!weights) {
        return Random.pick(modes);
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < modes.length; i++) {
        random -= weights[i];
        if (random <= 0) return modes[i];
    }

    return modes[modes.length - 1];
}

// Export for use in animations
if (typeof window !== 'undefined') {
    window.AnimRandom = {
        Random,
        ColorRandom,
        TimingRandom,
        MotionRandom,
        EffectRandom,
        ParticleRandom,
        createRandomConfig,
        selectMode,
        SeededRandom
    };
}
