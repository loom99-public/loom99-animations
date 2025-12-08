/**
 * TechniqueSection - Collapsible section for animation technique
 */

import { observer } from 'mobx-react-lite';
import { galleryStore } from '../stores/galleryStore';
import type { TechniqueMeta } from '../data/types';
import { AnimationCard } from './AnimationCard';

interface TechniqueSectionProps {
  technique: TechniqueMeta;
}

export const TechniqueSection = observer(({ technique }: TechniqueSectionProps) => {
  const isExpanded = galleryStore.isTechniqueExpanded(technique.id);
  const logoAnimations = galleryStore.getAnimationsByTarget(technique.id, 'logo');
  const textAnimations = galleryStore.getAnimationsByTarget(technique.id, 'text');

  const handleToggle = () => {
    galleryStore.toggleTechnique(technique.id);
  };

  return (
    <div className="technique-section" data-technique={technique.id}>
      <div className="technique-header" onClick={handleToggle}>
        <div className="technique-title-wrapper">
          <h2 className="technique-title">
            <span className="technique-number">{technique.number}</span>
            {technique.name}
          </h2>
          <p className="technique-description">{technique.description}</p>
        </div>
        <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</div>
      </div>

      {isExpanded && (
        <div className="technique-content">
          <div className="content-inner">
            {logoAnimations.length > 0 && (
              <div className="animation-row">
                <div className="row-label">loom99 Logo</div>
                <div className="animation-grid">
                  {logoAnimations.map((anim) => (
                    <AnimationCard key={anim.id} animation={anim} />
                  ))}
                </div>
              </div>
            )}

            {textAnimations.length > 0 && (
              <div className="animation-row">
                <div className="row-label">Do More Now</div>
                <div className="animation-grid">
                  {textAnimations.map((anim) => (
                    <AnimationCard key={anim.id} animation={anim} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
