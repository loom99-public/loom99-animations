/**
 * Gallery Store - MobX state management
 */

import { makeAutoObservable } from 'mobx';
import { animations, techniques } from '../data/animations';
import type { AnimationMeta, TechniqueMeta } from '../data/types';

class GalleryStore {
  expandedTechniques: Set<string> = new Set();
  selectedAnimation: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * Toggle technique section expansion
   */
  toggleTechnique(id: string): void {
    if (this.expandedTechniques.has(id)) {
      this.expandedTechniques.delete(id);
    } else {
      this.expandedTechniques.add(id);
    }
  }

  /**
   * Check if technique is expanded
   */
  isTechniqueExpanded(id: string): boolean {
    return this.expandedTechniques.has(id);
  }

  /**
   * Expand all techniques
   */
  expandAll(): void {
    techniques.forEach((tech) => {
      this.expandedTechniques.add(tech.id);
    });
  }

  /**
   * Collapse all techniques
   */
  collapseAll(): void {
    this.expandedTechniques.clear();
  }

  /**
   * Select an animation
   */
  selectAnimation(id: string | null): void {
    this.selectedAnimation = id;
  }

  /**
   * Get animations for a specific technique
   */
  getAnimationsForTechnique(techniqueId: string): AnimationMeta[] {
    return animations.filter((anim) => anim.technique === techniqueId);
  }

  /**
   * Get animations by target (logo or text)
   */
  getAnimationsByTarget(techniqueId: string, target: 'logo' | 'text'): AnimationMeta[] {
    return animations.filter(
      (anim) => anim.technique === techniqueId && anim.target === target
    );
  }

  /**
   * Get technique by ID
   */
  getTechnique(id: string): TechniqueMeta | undefined {
    return techniques.find((tech) => tech.id === id);
  }

  /**
   * Get all techniques
   */
  get allTechniques(): TechniqueMeta[] {
    return techniques;
  }

  /**
   * Get all animations
   */
  get allAnimations(): AnimationMeta[] {
    return animations;
  }
}

export const galleryStore = new GalleryStore();
