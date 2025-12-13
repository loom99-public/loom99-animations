/**
 * Animation Controls + Seeded Randomness
 *
 * Add to any animation HTML with:
 *   <script src="../shared/controls.js"></script>
 *
 * URL Parameters:
 *   ?seed=123456      - Set random seed for reproducibility
 *   ?paused=true      - Start paused
 *   ?time=1500        - Jump to 1500ms and pause
 *   ?showControls=true - Show the control UI (hidden by default)
 *
 * PostMessage API (for iframe embedding):
 *   { type: 'pause' }
 *   { type: 'resume' }
 *   { type: 'jumpToTime', time: 1500 }
 *   { type: 'getState' } - responds with { type: 'state', state: {...} }
 *   { type: 'getSeed' }  - responds with { type: 'seed', seed: 123456 }
 *
 * Zero-code integration:
 *   - requestAnimationFrame is patched to auto-pause and adjust timestamps
 *   - Math.random is patched for seeded randomness
 *   - Just include the script - no other changes needed for basic functionality
 */

(function() {
    'use strict';

    // ==========================================================================
    // URL PARAMETERS
    // ==========================================================================

    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const pausedParam = urlParams.get('paused');
    const timeParam = urlParams.get('time');
    const showControlsParam = urlParams.get('showControls');

    const seed = seedParam ? parseInt(seedParam, 10) : Date.now();
    const startPaused = pausedParam === 'true' || pausedParam === '1';
    const jumpToTime = timeParam ? parseInt(timeParam, 10) : null;
    const showControls = showControlsParam === 'true' || showControlsParam === '1';

    // ==========================================================================
    // SEEDED RANDOM - Patches Math.random globally
    // ==========================================================================

    const initialSeed = seed;
    let rngState = seed;

    function seededRandom() {
        rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
        return rngState / 0x7fffffff;
    }

    function resetSeed() {
        rngState = initialSeed;
    }

    // Patch Math.random
    Math.random = seededRandom;

    // Update URL with seed (for bookmarking) without reloading
    if (!seedParam) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('seed', seed.toString());
        window.history.replaceState({}, '', newUrl.toString());
    }

    // ==========================================================================
    // PAUSE/RESUME TIMING
    // ==========================================================================

    let isPaused = startPaused;
    let pauseStartTime = startPaused ? performance.now() : null;
    let totalPausedDuration = 0;

    // For hold timeout management
    let activeHoldTimeout = null;
    let holdTimeoutRemainingMs = 0;
    let holdTimeoutCallback = null;

    // For time jumping
    let timeOffset = 0; // Added to adjusted timestamp to simulate time jump

    function adjustedTimestamp(rawTimestamp) {
        return rawTimestamp - totalPausedDuration + timeOffset;
    }

    // ==========================================================================
    // REQUEST ANIMATION FRAME PATCHING
    // For zero-code integration - animations work without any modifications
    // ==========================================================================

    const originalRAF = window.requestAnimationFrame;
    const queuedCallbacks = [];

    window.requestAnimationFrame = function(callback) {
        if (isPaused) {
            // Queue callback to run when resumed
            queuedCallbacks.push(callback);
            return -1;
        }
        // Wrap callback to provide adjusted timestamp
        return originalRAF((timestamp) => {
            callback(adjustedTimestamp(timestamp));
        });
    };

    function flushQueuedCallbacks() {
        const callbacks = queuedCallbacks.splice(0, queuedCallbacks.length);
        callbacks.forEach(cb => {
            originalRAF((timestamp) => {
                cb(adjustedTimestamp(timestamp));
            });
        });
    }

    // ==========================================================================
    // ANIMATION CONTROLS UI
    // ==========================================================================

    function createControlsUI() {
        // Only show if explicitly requested
        if (!showControls) {
            return;
        }

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'anim-controls';
        container.innerHTML = `
            <style>
                #anim-controls {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(10px);
                    border-radius: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    z-index: 10000;
                }
                #anim-controls button {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                #anim-controls button:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                #anim-controls .divider {
                    width: 1px;
                    height: 20px;
                    background: rgba(255, 255, 255, 0.2);
                    margin: 0 4px;
                }
                #anim-controls input[type="number"] {
                    width: 70px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 4px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: monospace;
                }
                #anim-controls input[type="number"]:focus {
                    outline: none;
                    border-color: rgba(255, 255, 255, 0.4);
                }
                #anim-controls .label {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                #anim-controls .seed-display {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 11px;
                    font-family: monospace;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                #anim-controls .seed-display:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.9);
                }
                #anim-controls .success {
                    color: #4ade80 !important;
                }
                @media (prefers-reduced-motion: reduce) {
                    #anim-controls { display: none; }
                }
            </style>
            <button id="anim-play-pause" title="Play/Pause (Space)">${isPaused ? '▶' : '⏸'}</button>
            <div class="divider"></div>
            <span class="label">ms:</span>
            <input type="number" id="anim-time-input" value="0" min="0" step="100" title="Time in milliseconds">
            <button id="anim-go" title="Jump to time and pause">Go</button>
            <div class="divider"></div>
            <button id="anim-copy-state" title="Copy element state to clipboard">Copy State</button>
            <div class="divider"></div>
            <span class="seed-display" id="anim-seed" title="Click to copy seed">seed: ${seed}</span>
        `;
        document.body.appendChild(container);

        // Play/Pause button
        document.getElementById('anim-play-pause').addEventListener('click', togglePause);

        // Time input + Go button
        const timeInput = document.getElementById('anim-time-input');
        document.getElementById('anim-go').addEventListener('click', () => {
            const targetTime = parseInt(timeInput.value, 10) || 0;
            jumpToTimeAndPause(targetTime);
        });
        timeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const targetTime = parseInt(timeInput.value, 10) || 0;
                jumpToTimeAndPause(targetTime);
            }
        });

        // Copy State button
        document.getElementById('anim-copy-state').addEventListener('click', copyState);

        // Seed copy
        const seedDisplay = document.getElementById('anim-seed');
        seedDisplay.addEventListener('click', () => {
            navigator.clipboard.writeText(seed.toString()).then(() => {
                seedDisplay.textContent = 'copied!';
                seedDisplay.classList.add('success');
                setTimeout(() => {
                    seedDisplay.textContent = `seed: ${seed}`;
                    seedDisplay.classList.remove('success');
                }, 1500);
            });
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                togglePause();
            }
        });

        // Handle initial jump to time
        if (jumpToTime !== null) {
            // Delay slightly to let animation initialize
            setTimeout(() => {
                jumpToTimeAndPause(jumpToTime);
                timeInput.value = jumpToTime;
            }, 50);
        }
    }

    function updatePlayPauseButton() {
        const btn = document.getElementById('anim-play-pause');
        if (btn) {
            btn.textContent = isPaused ? '▶' : '⏸';
            btn.title = isPaused ? 'Play (Space)' : 'Pause (Space)';
        }
    }

    function updateTimeInput(ms) {
        const input = document.getElementById('anim-time-input');
        if (input) {
            input.value = Math.round(ms);
        }
    }

    // ==========================================================================
    // PAUSE/RESUME
    // ==========================================================================

    function togglePause() {
        if (isPaused) {
            resume();
        } else {
            pause();
        }
    }

    function pause() {
        if (isPaused) return;
        isPaused = true;
        pauseStartTime = performance.now();
        updatePlayPauseButton();

        // Save hold timeout state
        if (activeHoldTimeout) {
            clearTimeout(activeHoldTimeout);
        }

        // Notify animation (if it has custom handler)
        if (window.AnimControls && window.AnimControls.onPause) {
            window.AnimControls.onPause();
        }
    }

    function resume() {
        if (!isPaused) return;

        // Calculate paused duration
        const pausedFor = performance.now() - pauseStartTime;
        totalPausedDuration += pausedFor;

        isPaused = false;
        pauseStartTime = null;
        updatePlayPauseButton();

        // Restore hold timeout
        if (holdTimeoutCallback && holdTimeoutRemainingMs > 0) {
            activeHoldTimeout = setTimeout(() => {
                activeHoldTimeout = null;
                holdTimeoutCallback();
            }, holdTimeoutRemainingMs);
        }

        // Flush queued RAF callbacks (for zero-code integration)
        flushQueuedCallbacks();

        // Notify animation (if it has custom handler)
        if (window.AnimControls && window.AnimControls.onResume) {
            window.AnimControls.onResume();
        }
    }

    // ==========================================================================
    // TIME JUMPING
    // ==========================================================================

    function jumpToTimeAndPause(targetMs) {
        // Reset everything first
        resetSeed();
        totalPausedDuration = 0;
        timeOffset = 0;
        clearHoldTimeout();
        queuedCallbacks.length = 0; // Clear any queued callbacks

        // Calculate what timeOffset we need
        // adjustedTimestamp(now) should equal targetMs
        // adjustedTimestamp = rawTimestamp - totalPausedDuration + timeOffset
        // targetMs = now - 0 + timeOffset
        // timeOffset = targetMs - now
        const now = performance.now();
        timeOffset = targetMs - now;

        // Pause at this point
        isPaused = true;
        pauseStartTime = now;
        updatePlayPauseButton();
        updateTimeInput(targetMs);

        // Notify animation to reinitialize and render one frame
        if (window.AnimControls && window.AnimControls.onJumpToTime) {
            window.AnimControls.onJumpToTime(targetMs);
        }
    }

    // ==========================================================================
    // COPY STATE
    // ==========================================================================

    function copyState() {
        const btn = document.getElementById('anim-copy-state');

        if (!window.AnimControls || !window.AnimControls.getState) {
            if (btn) {
                btn.textContent = 'No getState()';
                btn.classList.add('success');
                setTimeout(() => {
                    btn.textContent = 'Copy State';
                    btn.classList.remove('success');
                }, 1500);
            }
            return null;
        }

        try {
            const state = window.AnimControls.getState();
            const stateJson = JSON.stringify(state, null, 2);

            if (btn) {
                navigator.clipboard.writeText(stateJson).then(() => {
                    btn.textContent = 'Copied!';
                    btn.classList.add('success');
                    setTimeout(() => {
                        btn.textContent = 'Copy State';
                        btn.classList.remove('success');
                    }, 1500);
                });
            }
            return state;
        } catch (err) {
            console.error('Failed to copy state:', err);
            if (btn) {
                btn.textContent = 'Error';
                setTimeout(() => {
                    btn.textContent = 'Copy State';
                }, 1500);
            }
            return null;
        }
    }

    // ==========================================================================
    // HOLD TIMEOUT MANAGEMENT
    // ==========================================================================

    function setHoldTimeout(callback, ms) {
        holdTimeoutCallback = callback;
        holdTimeoutRemainingMs = ms;

        if (!isPaused) {
            const startTime = performance.now();
            activeHoldTimeout = setTimeout(() => {
                activeHoldTimeout = null;
                holdTimeoutCallback = null;
                holdTimeoutRemainingMs = 0;
                callback();
            }, ms);

            // Track remaining time for pause/resume
            const trackRemaining = () => {
                if (activeHoldTimeout && !isPaused) {
                    holdTimeoutRemainingMs = Math.max(0, ms - (performance.now() - startTime));
                    if (holdTimeoutRemainingMs > 0) {
                        originalRAF(trackRemaining);
                    }
                }
            };
            originalRAF(trackRemaining);
        }
    }

    function clearHoldTimeout() {
        if (activeHoldTimeout) {
            clearTimeout(activeHoldTimeout);
            activeHoldTimeout = null;
        }
        holdTimeoutCallback = null;
        holdTimeoutRemainingMs = 0;
    }

    // ==========================================================================
    // POSTMESSAGE API - For iframe embedding
    // ==========================================================================

    function handlePostMessage(event) {
        const data = event.data;
        if (!data || typeof data !== 'object' || !data.type) return;

        switch (data.type) {
            case 'pause':
                pause();
                break;

            case 'resume':
                resume();
                break;

            case 'togglePause':
                togglePause();
                break;

            case 'jumpToTime':
                if (typeof data.time === 'number') {
                    jumpToTimeAndPause(data.time);
                }
                break;

            case 'getState':
                const state = window.AnimControls.getState ? window.AnimControls.getState() : null;
                event.source.postMessage({
                    type: 'state',
                    state: state,
                    time: window.AnimControls.currentTime,
                    seed: seed
                }, '*');
                break;

            case 'getSeed':
                event.source.postMessage({
                    type: 'seed',
                    seed: seed
                }, '*');
                break;

            case 'getTime':
                event.source.postMessage({
                    type: 'time',
                    time: window.AnimControls.currentTime,
                    isPaused: isPaused
                }, '*');
                break;
        }
    }

    window.addEventListener('message', handlePostMessage);

    // ==========================================================================
    // PUBLIC API
    // ==========================================================================

    window.AnimControls = {
        // State
        get isPaused() { return isPaused; },
        get seed() { return seed; },
        get currentTime() {
            // Return the current animation time in ms
            const now = performance.now();
            if (isPaused && pauseStartTime) {
                return now - totalPausedDuration + timeOffset - (now - pauseStartTime);
            }
            return now - totalPausedDuration + timeOffset;
        },

        // Timing - use this to get pause-adjusted timestamp
        adjustedTimestamp: adjustedTimestamp,

        // Callbacks - set these in your animation for custom behavior
        onPause: null,      // Called when pause button pressed
        onResume: null,     // Called when resume button pressed
        onJumpToTime: null, // Called when jumping to a specific time

        // State capture - implement this in your animation
        // Should return: { time: ms, elements: [...], metadata: {...} }
        getState: null,

        // Hold timeout management
        setHoldTimeout: setHoldTimeout,
        clearHoldTimeout: clearHoldTimeout,

        // Reset functions
        resetPausedDuration: function() {
            totalPausedDuration = 0;
            timeOffset = 0;
            clearHoldTimeout();
        },
        resetSeed: resetSeed,

        // Manual pause control
        pause: pause,
        resume: resume,
        togglePause: togglePause,

        // Update time display
        updateTimeDisplay: updateTimeInput
    };

    // Initialize UI when DOM ready (only if showControls=true)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createControlsUI);
    } else {
        createControlsUI();
    }

    // Handle initial jump to time (even without UI)
    if (jumpToTime !== null && !showControls) {
        // Delay slightly to let animation initialize
        setTimeout(() => {
            jumpToTimeAndPause(jumpToTime);
        }, 50);
    }

})();
