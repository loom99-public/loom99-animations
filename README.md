# loom99 Animations

A collection of 20 unique animations showcasing 10 different animation techniques applied to both the loom99 logo and "Do It Now" text.

## Overview

This project demonstrates professional-grade web animations using vanilla JavaScript, CSS, and SVG. Each animation is:

- **Self-contained**: Standalone HTML files with no external dependencies
- **Accessible**: Respects `prefers-reduced-motion` for users with motion sensitivity
- **Interactive**: Click anywhere to restart the animation
- **Performant**: Optimized for smooth 60fps playback

## View the Gallery

Open `index.html` in a web browser to see all 20 animations organized by technique.

## Animation Techniques

### 1. Line Drawing / Path Animation
- **Logo**: Lines shoot in from off-canvas and curve into the logo shape
- **Text**: Animated strokes form "Do It Now" with staggered timing

### 2. Particle Effects
- **Logo**: Particles coalesce from an explosion pattern
- **Text**: Scattered particles gravitate together to form text

### 3. Morphing / Shape Transitions
- **Logo**: Geometric shapes smoothly morph into the logo
- **Text**: Simple shapes transform into letters with path interpolation

### 4. Glitch Effects
- **Logo**: Digital glitch with RGB split and transform distortion
- **Text**: Chromatic aberration, jitter, and scanlines

### 5. Liquid / Fluid Motion
- **Logo**: Liquid droplets merge using metaball effects
- **Text**: Fluid blobs coalesce with SVG goo filter

### 6. Kinetic Typography / Motion
- **Logo**: Components fly in with spring physics
- **Text**: Letters spiral in with elastic bounce

### 7. 3D Transforms
- **Logo**: Flips through 3D space with perspective rotation
- **Text**: Each word rotates on different axes

### 8. Reveal / Mask Animations
- **Logo**: Left-to-right wipe reveal
- **Text**: Expanding circular mask from center

### 9. Wave / Ripple Effects
- **Logo**: Sine wave ripples through components
- **Text**: Letters oscillate in wave patterns

### 10. Typewriter / Sequential Reveal
- **Logo**: Monospace typewriter with cursor
- **Text**: Classic typewriter with blinking cursor

## Project Structure

```
loom99-animations/
├── index.html                 # Gallery page showcasing all animations
├── README.md                  # This file
├── animations/
│   ├── logo/                  # 10 logo animations
│   │   ├── logo-01-line-drawing.html
│   │   ├── logo-02-particles.html
│   │   ├── logo-03-morphing.html
│   │   ├── logo-04-glitch.html
│   │   ├── logo-05-liquid.html
│   │   ├── logo-06-kinetic.html
│   │   ├── logo-07-3d-transforms.html
│   │   ├── logo-08-reveal-mask.html
│   │   ├── logo-09-wave-ripple.html
│   │   └── logo-10-typewriter.html
│   ├── text/                  # 10 text animations
│   │   ├── text-01-line-drawing.html
│   │   ├── text-02-particles.html
│   │   ├── text-03-morphing.html
│   │   ├── text-04-glitch.html
│   │   ├── text-05-liquid.html
│   │   ├── text-06-kinetic.html
│   │   ├── text-07-3d-transforms.html
│   │   ├── text-08-reveal-mask.html
│   │   ├── text-09-wave-ripple.html
│   │   └── text-10-typewriter.html
│   └── template.html          # Base template for creating new animations
├── assets/
│   └── logo-design.html       # Logo design reference
└── .agent_planning/           # Project planning documents
```

## Technical Details

### Technologies Used
- **HTML5**: Semantic markup
- **CSS3**: Transforms, animations, filters, gradients
- **JavaScript (ES6+)**: Animation logic and timing
- **SVG**: Vector graphics and path manipulation
- **Canvas API**: Particle effects (where applicable)

### Browser Support
Modern browsers with support for:
- SVG
- CSS transforms and filters
- requestAnimationFrame
- ES6 JavaScript

Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

### Performance Considerations
- Target: 60fps on desktop, smooth on mobile
- Efficient rendering with `requestAnimationFrame`
- Minimal DOM manipulation
- CSS transforms for hardware acceleration
- Particle counts optimized for performance

### Accessibility Features
- `prefers-reduced-motion` media query support in all animations
- Reduced-motion users see either the final state immediately or a gentle fade-in
- No flashing or strobing that could trigger photosensitive epilepsy
- Click-to-restart functionality accessible via keyboard (body element)

## Logo Design

The loom99 logo is a text-based design with:
- Clean stroke-based typography
- Gradient colors: cyan (#00d4ff) → purple (#7b2ff7) → pink (#ff2d75)
- 6 separable elements: L, O, O, M, 9, 9
- Optimized for animation with simple, clean paths

See `assets/logo-design.html` for the full design reference.

## How to Use

### Viewing Individual Animations
1. Navigate to the desired animation file in `animations/logo/` or `animations/text/`
2. Open the HTML file in a web browser
3. Click anywhere to restart the animation

### Viewing the Gallery
1. Open `index.html` in a web browser
2. Browse animations organized by technique
3. Click any card to view the full animation

### Creating New Animations
1. Copy `animations/template.html` as a starting point
2. Modify the animation logic in the `<script>` section
3. Update the SVG content in the `<svg>` section
4. Test with `prefers-reduced-motion` enabled in browser dev tools

## Common Animation Patterns

### Easing Functions
Several easing functions are available in the template:
- `easeOutQuart(t)`: Quick start, slow end
- `easeInQuart(t)`: Slow start, quick end
- `easeInOutCubic(t)`: Smooth acceleration and deceleration
- `easeOutElastic(t)`: Bouncy spring effect
- `easeOutBack(t)`: Overshoot and settle

### Timing Structure
Most animations follow this pattern:
```javascript
const delay = 0;          // When to start (ms)
const duration = 2000;    // How long to run (ms)
const elapsed = timestamp - startTime;
const progress = Math.min(1, (elapsed - delay) / duration);
const eased = easingFunction(progress);
```

### Click-to-Restart
All animations include:
```javascript
document.body.addEventListener('click', restart);
```

### Reduced Motion
All animations check for motion preference:
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReducedMotion) {
    // Show final state immediately or use gentle fade
} else {
    // Run full animation
}
```

## Development Notes

### Animation Durations
- Short animations: 800-1200ms (glitch, reveal)
- Medium animations: 1500-2000ms (most techniques)
- Long animations: 2500-3000ms (complex multi-stage animations)

### Color Palettes
- **Logo**: Cyan, purple, pink gradient
- **Text "Do It Now"**:
  - "DO": Red (#ff2d2d)
  - "IT": Orange (#ff6b00)
  - "NOW": Yellow (#ffdd00)

### File Naming Convention
- Logo animations: `logo-NN-technique-name.html`
- Text animations: `text-NN-technique-name.html`
- Where NN is 01-10

## Known Limitations

- SVG filters (blur, goo) may impact performance on older devices
- Particle animations use Canvas API (not SVG) for better performance
- 3D transforms require perspective support (modern browsers only)
- Some animations use experimental CSS features (well-supported but check caniuse.com)

## Future Enhancements

Potential additions (not currently implemented):
- Timing controls (speed adjustment, loop toggle)
- Export to video/GIF functionality
- Sound effects integration
- Additional animation variants
- WebGL-accelerated effects

## License

This project was created for the loom99 brand. All rights reserved.

## Credits

Animations designed and implemented using modern web standards and best practices for performance, accessibility, and visual quality.
