/**
 * IframeHtmlViewer - Displays original HTML animations in an iframe
 *
 * Uses postMessage to control the animation via controls.js in the iframe.
 */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface IframeHtmlViewerProps {
  technique: string;
  target: 'logo' | 'text';
  variant: 'original' | 'varied' | 'procedural';
  seed: number;
  className?: string;
}

export interface IframeHtmlViewerRef {
  pause: () => void;
  resume: () => void;
  jumpToTime: (time: number) => void;
  getState: () => Promise<any>;
}

// Map technique numbers to URL path names
const TECHNIQUE_NAMES: Record<string, string> = {
  '01': 'line-drawing',
  '02': 'particles',
  '03': 'morphing',
  '04': 'glitch',
  '05': 'liquid',
  '06': 'kinetic',
  '07': '3d-transforms',
  '08': 'reveal-mask',
  '09': 'wave-ripple',
  '10': 'typewriter',
};

function getHtmlAnimationUrl(
  technique: string,
  target: 'logo' | 'text',
  variant: 'original' | 'varied' | 'procedural',
  seed: number
): string {
  const techniqueName = TECHNIQUE_NAMES[technique];
  if (!techniqueName) {
    console.warn(`Unknown technique: ${technique}`);
    return '';
  }

  const variantSuffix = variant === 'original' ? '' : `-${variant}`;
  const filename = `${target}-${technique}-${techniqueName}${variantSuffix}.html`;

  // Path to animations folder (relative to gallery)
  // Start paused so gallery controls can manage playback
  const basePath = '/animations';
  return `${basePath}/${target}/${filename}?seed=${seed}&paused=true`;
}

export const IframeHtmlViewer = forwardRef<IframeHtmlViewerRef, IframeHtmlViewerProps>(
  ({ technique, target, variant, seed, className }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const pendingStateResolve = useRef<((state: any) => void) | null>(null);

    const sendMessage = useCallback((message: object) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(message, '*');
      }
    }, []);

    // Handle messages from iframe
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'state' && pendingStateResolve.current) {
          pendingStateResolve.current(event.data);
          pendingStateResolve.current = null;
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Resume animation when iframe loads (since it starts paused)
    const handleIframeLoad = useCallback(() => {
      // Small delay to ensure controls.js has initialized
      setTimeout(() => {
        sendMessage({ type: 'resume' });
      }, 100);
    }, [sendMessage]);

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
      pause: () => sendMessage({ type: 'pause' }),
      resume: () => sendMessage({ type: 'resume' }),
      jumpToTime: (time: number) => sendMessage({ type: 'jumpToTime', time }),
      getState: () => {
        return new Promise((resolve) => {
          pendingStateResolve.current = resolve;
          sendMessage({ type: 'getState' });
          // Timeout after 1 second
          setTimeout(() => {
            if (pendingStateResolve.current) {
              pendingStateResolve.current(null);
              pendingStateResolve.current = null;
            }
          }, 1000);
        });
      },
    }), [sendMessage]);

    const url = getHtmlAnimationUrl(technique, target, variant, seed);

    return (
      <iframe
        ref={iframeRef}
        src={url}
        className={className}
        onLoad={handleIframeLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#1a1a2e',
        }}
        title={`${target}-${technique}-${variant}`}
      />
    );
  }
);

IframeHtmlViewer.displayName = 'IframeHtmlViewer';
