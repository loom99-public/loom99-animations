/**
 * AnimationCard - Individual animation preview card
 */

import { useState } from 'react';
import type { AnimationMeta } from '../data/types';
import { LineDrawingViewer } from './animations/LineDrawingViewer';

interface AnimationCardProps {
  animation: AnimationMeta;
}

export function AnimationCard({ animation }: AnimationCardProps) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

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
  const useReactComponent = animation.technique === '01'; // Line drawing

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
        <button className="btn btn-open" onClick={handleOpenFullscreen}>
          Open
        </button>
      </div>

      {isPreviewVisible && (
        <div className="preview-container">
          {useReactComponent ? (
            <LineDrawingViewer
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
    </div>
  );
}
