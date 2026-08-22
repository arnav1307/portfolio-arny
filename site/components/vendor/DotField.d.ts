import type { ComponentPropsWithoutRef } from "react";

/**
 * Types for the vendored react-bits DotField (JS source, kept verbatim so it
 * stays diffable against upstream). Prop names/defaults mirror DotField.jsx.
 */
export interface DotFieldProps extends ComponentPropsWithoutRef<"div"> {
  /** Dot diameter in px (drawn radius is dotRadius / 2). */
  dotRadius?: number;
  /** Gap added to dotRadius to form the grid step. */
  dotSpacing?: number;
  /** Cursor influence radius in px. */
  cursorRadius?: number;
  /** Push force used when bulgeOnly is false. */
  cursorForce?: number;
  /** true = dots bulge away from cursor; false = velocity-based scatter. */
  bulgeOnly?: boolean;
  /** Max bulge displacement in px. */
  bulgeStrength?: number;
  /** Radius of the cursor glow circle in px. */
  glowRadius?: number;
  /** Randomly enlarge ~3% of dots per frame. */
  sparkle?: boolean;
  /** Idle sine wave displacement in px (0 = off). */
  waveAmplitude?: number;
  /** Dot gradient start colour (top-left). */
  gradientFrom?: string;
  /** Dot gradient end colour (bottom-right). */
  gradientTo?: string;
  /** Cursor glow colour. */
  glowColor?: string;
}

declare const DotField: React.MemoExoticComponent<
  (props: DotFieldProps) => React.JSX.Element
>;

export default DotField;
