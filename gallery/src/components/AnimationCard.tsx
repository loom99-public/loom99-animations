/**
 * AnimationCard - Individual animation preview card
 */

import { useState } from 'react';
import type { AnimationMeta } from '../data/types';
import { V4Viewer } from './animations/V4Viewer';
import { IframeSideBySideViewer } from './animations/IframeSideBySideViewer';

interface AnimationCardProps {
  animation: AnimationMeta;
  cardIndex?: number; // Index within its section for POC limiting
}

type PreviewMode = 'none' | 'html' | 'v4' | 'compare';

export function AnimationCard({ animation }: AnimationCardProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('none');
  const [v4Key, setV4Key] = useState(0); // Forces remount with new seed

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

  // V4 implementations exist for techniques 01, 02, 03, and 04
  const hasV4 = animation.technique === '01' || animation.technique === '02' || animation.technique === '03' || animation.technique === '04';

  // Compare is available for all techniques
  const hasCompare = true;

  const handleHtmlClick = () => {
    setPreviewMode(previewMode === 'html' ? 'none' : 'html');
  };

  const handleV4Click = () => {
    if (previewMode === 'v4') {
      setPreviewMode('none');
    } else {
      setV4Key(k => k + 1); // New seed on each show
      setPreviewMode('v4');
    }
  };

  const handleCompareClick = () => {
    setPreviewMode(previewMode === 'compare' ? 'none' : 'compare');
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
        <button
          className={`btn btn-preview ${previewMode === 'html' ? 'active' : ''}`}
          onClick={handleHtmlClick}
        >
          {previewMode === 'html' ? 'Hide HTML' : 'HTML'}
        </button>
        {hasV4 && (
          <button
            className={`btn btn-v4 ${previewMode === 'v4' ? 'active' : ''}`}
            onClick={handleV4Click}
          >
            {previewMode === 'v4' ? 'Hide V4' : 'V4'}
          </button>
        )}
        {hasCompare && (
          <button
            className={`btn btn-compare ${previewMode === 'compare' ? 'active' : ''}`}
            onClick={handleCompareClick}
          >
            {previewMode === 'compare' ? 'Hide Compare' : 'Compare'}
          </button>
        )}
        <button className="btn btn-open" onClick={handleOpenFullscreen}>
          Open
        </button>
      </div>

      {previewMode === 'html' && (
        <div className="preview-container">
          <iframe
            className="preview-frame"
            src={`/animations/${animation.filePath}`}
            loading="lazy"
            title={`${animation.title} - HTML`}
          />
        </div>
      )}

      {previewMode === 'v4' && (
        <div className="preview-container">
          <V4Viewer
            key={v4Key}
            technique={animation.technique}
            target={animation.target}
            variant={animation.variant}
          />
        </div>
      )}

      {previewMode === 'compare' && (
        <div className="comparison-container">
          <IframeSideBySideViewer
            technique={animation.technique}
            target={animation.target}
            variant={animation.variant}
          />
        </div>
      )}
    </div>
  );
}
