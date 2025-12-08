/**
 * Type definitions for animation metadata
 */

export type AnimationTarget = 'logo' | 'text';
export type AnimationVariant = 'original' | 'varied' | 'procedural';

export interface AnimationMeta {
  id: string;
  title: string;
  description: string;
  technique: string;
  target: AnimationTarget;
  variant: AnimationVariant;
  filePath: string;
  supportsDynamicText?: boolean;
}

export interface TechniqueMeta {
  id: string;
  number: string;
  name: string;
  description: string;
}
