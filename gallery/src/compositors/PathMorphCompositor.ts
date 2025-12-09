/**
 * PathMorphCompositor - Animated path morphing
 *
 * Creates "shoot-in-and-curve" animation effect where paths start from
 * an off-screen position and morph into their final curved shape.
 *
 * Algorithm:
 * - Tail: Moves linearly from startPos to first point
 * - Body: Morphs from straight line to curved path
 *   - At progress 0: All points on straight line from startPos to final point
 *   - At progress 1: Points at their final positions with curves
 */

export interface Point {
  x: number;
  y: number;
  type?: 'L' | 'Q' | 'A'; // Line, Quadratic, Arc
  controlX?: number; // For Q (quadratic bezier)
  controlY?: number;
  radiusX?: number; // For A (arc)
  radiusY?: number;
  rotation?: number;
  largeArc?: boolean;
  sweep?: boolean;
}

export interface PathMorphConfig {
  startPos: Point;
  points: Point[];
  easing?: string;
}

/**
 * PathMorphCompositor - Creates animated path morphing effects
 */
export class PathMorphCompositor {
  private startPos: Point;
  private points: Point[];
  private easing: string;

  constructor(config: PathMorphConfig) {
    this.startPos = config.startPos;
    this.points = config.points;
    this.easing = config.easing || 'linear';
  }

  /**
   * Update path at given progress (0-1)
   * Returns SVG path d attribute string
   */
  update(progress: number): string {
    // Clamp progress to 0-1 range
    const p = Math.max(0, Math.min(1, progress));

    // Empty points case
    if (this.points.length === 0) {
      return `M ${this.startPos.x} ${this.startPos.y}`;
    }

    const firstPoint = this.points[0];
    const lastPoint = this.points[this.points.length - 1];

    // Tail position: interpolate from startPos to first point
    const tailX = this.startPos.x + (firstPoint.x - this.startPos.x) * p;
    const tailY = this.startPos.y + (firstPoint.y - this.startPos.y) * p;

    // Start path with M command at tail position
    let d = `M ${tailX} ${tailY}`;

    // Generate path segments
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];

      // Calculate straight line position (what this point would be at progress 0)
      // All points lie on a straight line from startPos to lastPoint
      const t = (i + 1) / this.points.length;
      const straightX = this.startPos.x + (lastPoint.x - this.startPos.x) * t;
      const straightY = this.startPos.y + (lastPoint.y - this.startPos.y) * t;

      // Interpolate between straight and curved position
      const currentX = straightX + (point.x - straightX) * p;
      const currentY = straightY + (point.y - straightY) * p;

      // Generate appropriate command based on point type
      const type = point.type || 'L';

      if (type === 'Q') {
        // Quadratic bezier - interpolate control point as well
        const ctrlT = (i + 0.5) / this.points.length;
        const ctrlStraightX = this.startPos.x + (lastPoint.x - this.startPos.x) * ctrlT;
        const ctrlStraightY = this.startPos.y + (lastPoint.y - this.startPos.y) * ctrlT;

        const ctrlX = ctrlStraightX + ((point.controlX ?? currentX) - ctrlStraightX) * p;
        const ctrlY = ctrlStraightY + ((point.controlY ?? currentY) - ctrlStraightY) * p;

        d += ` Q ${ctrlX} ${ctrlY} ${currentX} ${currentY}`;
      } else if (type === 'A') {
        // Arc - interpolate radius and endpoint
        const radiusX = point.radiusX ?? 0;
        const radiusY = point.radiusY ?? 0;
        const rotation = point.rotation ?? 0;
        const largeArc = point.largeArc ? 1 : 0;
        const sweep = point.sweep ? 1 : 0;

        // Interpolate radii from 0 to final values
        const currentRadiusX = radiusX * p;
        const currentRadiusY = radiusY * p;

        d += ` A ${currentRadiusX} ${currentRadiusY} ${rotation} ${largeArc} ${sweep} ${currentX} ${currentY}`;
      } else {
        // Line
        d += ` L ${currentX} ${currentY}`;
      }
    }

    return d;
  }

  /**
   * Generate SMIL <animate> element for SVG export
   * Creates smooth path morphing animation with multiple keyframes
   */
  toSMIL(): string {
    // Generate keyframes for smooth animation
    const keyframeCount = 10;
    const values: string[] = [];
    const keyTimes: string[] = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const progress = i / keyframeCount;
      values.push(this.update(progress));
      keyTimes.push((progress).toFixed(3));
    }

    // Determine calcMode based on easing
    const calcMode = this.easing === 'linear' ? 'linear' : 'spline';

    // Build SMIL attributes
    const attrs: string[] = [
      'attributeName="d"',
      `values="${values.join(';')}"`,
      `keyTimes="${keyTimes.join(';')}"`,
      `calcMode="${calcMode}"`,
      'fill="freeze"',
    ];

    // Add keySplines if using spline mode
    if (calcMode === 'spline') {
      // Generate keySplines for easing
      // Each pair of keyframes needs a control point definition
      const keySplines: string[] = [];
      for (let i = 0; i < keyframeCount; i++) {
        // Simple easing curve approximation
        // For easeOutQuart: control points that create deceleration
        if (this.easing === 'easeOutQuart') {
          keySplines.push('0.25 1 0.5 1');
        } else {
          // Default to ease-out
          keySplines.push('0.33 1 0.67 1');
        }
      }
      attrs.push(`keySplines="${keySplines.join(';')}"`);
    }

    return `<animate ${attrs.join(' ')} />`;
  }
}
