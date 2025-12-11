/**
 * AnimationCard - Individual animation preview card
 */

import { useState } from 'react';
import type { AnimationMeta } from '../data/types';
import { LineDrawingViewer } from './animations/LineDrawingViewer';
import { ParticleViewer } from './animations/ParticleViewer';
import { SideBySideViewer } from './animations/SideBySideViewer';

interface AnimationCardProps {
  animation: AnimationMeta;
  cardIndex?: number; // Index within its section for POC limiting
}

export function AnimationCard({ animation, cardIndex = 0 }: AnimationCardProps) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleTogglePreview = () => {
    setIsPreviewVisible(!isPreviewVisible);
  };

  const handleOpenFullscreen = () => {
    const fullPath = `/animations/${animation.filePath}`;
    window.open(fullPath, '_blank');
  };

  const getVariantClass = () => {
    if (animation.variant === 'varied') return 'varied';
    if (animation.variant === 'procedural') return 'procedural';
    return '';
  };

  const getVariantTag = () => {
    if (animation.variant === 'varied') return 'Random';
    if (animation.variant === 'procedural') return 'Wild';
    return null;
  };

  // Check if this animation should use React component instead of iframe
  const useLineDrawingViewer = animation.technique === '01'; // Line drawing
  const useParticleViewer = animation.technique === '02'; // Particles

  // POC: Only show comparison button for first 3 line drawing animations (logo target)
  const showCompareButton = animation.technique === '01' && animation.target === 'logo' && cardIndex < 3;

  const handleToggleComparison = () => {
    setShowComparison(!showComparison);
    if (!showComparison) {
      setIsPreviewVisible(false); // Hide regular preview when showing comparison
    }
  };

  return (
    <div className={`animation-card ${getVariantClass()}`}>
      <div className="card-header">
        <div className="card-title-row">
          <div className="card-title">{animation.title}</div>
          {getVariantTag() && (
            <span className={`variant-tag ${getVariantClass()}`}>
              {getVariantTag()}
            </span>
          )}
        </div>
        <div className={`badge badge-${animation.target}`}>
          {animation.target === 'logo' ? 'Logo' : 'Text'}
        </div>
      </div>

      <div className="card-description">{animation.description}</div>

      <div className="card-actions">
        <button className="btn btn-preview" onClick={handleTogglePreview}>
          {isPreviewVisible ? 'Hide Preview' : 'Preview'}
        </button>
        {showCompareButton && (
          <button className="btn btn-compare" onClick={handleToggleComparison}>
            {showComparison ? 'Hide Compare' : 'Compare'}
          </button>
        )}
        <button className="btn btn-open" onClick={handleOpenFullscreen}>
          Open
        </button>
      </div>

      {isPreviewVisible && (
        <div className="preview-container">
          {useLineDrawingViewer ? (
            <LineDrawingViewer
              target={animation.target}
              variant={animation.variant}
              holdDuration={2000}
              enableScrubbing={true}
            />
          ) : useParticleViewer ? (
            <ParticleViewer
              target={animation.target}
              variant={animation.variant}
              holdDuration={2000}
            />
          ) : (
            <iframe
              className="preview-frame"
              src={`/animations/${animation.filePath}`}
              loading="lazy"
              title={`${animation.title} - ${animation.technique}`}
            />
          )}
        </div>
      )}

      {showComparison && (
        <div className="comparison-container">
          <SideBySideViewer
            target={animation.target}
            variant={animation.variant}
          />
        </div>
      )}
    </div>
  );
}
