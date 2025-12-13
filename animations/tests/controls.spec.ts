import { test, expect } from '@playwright/test';

test.describe('Animation Controls', () => {
  const animationUrl = 'logo/logo-02-particles-varied.html';

  test('animation runs without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`/${animationUrl}?seed=12345&showControls=true`);
    await page.waitForSelector('#anim-controls', { timeout: 1000 });

    // Let animation run for a bit
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('page loads and controls are visible', async ({ page }) => {
    await page.goto(`/${animationUrl}?seed=12345&showControls=true`);

    // Wait for controls to appear
    await page.waitForSelector('#anim-controls', { timeout: 1000 });

    // Verify controls exist
    await expect(page.locator('#anim-play-pause')).toBeVisible();
    await expect(page.locator('#anim-time-input')).toBeVisible();
    await expect(page.locator('#anim-go')).toBeVisible();
    await expect(page.locator('#anim-copy-state')).toBeVisible();
    await expect(page.locator('#anim-seed')).toBeVisible();
  });

  test('jumping to time 0 should have all particles with opacity 0', async ({ page }) => {
    await page.goto(`/${animationUrl}?seed=12345&showControls=true`);
    await page.waitForSelector('#anim-controls', { timeout: 1000 });

    // Wait for animation to initialize
    await page.waitForTimeout(500);

    // Enter 0 in the time input and click Go
    await page.fill('#anim-time-input', '0');
    await page.click('#anim-go');

    // Wait for the jump to complete
    await page.waitForTimeout(200);

    // Get the animation state
    const state = await page.evaluate(() => {
      if ((window as any).AnimControls && (window as any).AnimControls.getState) {
        return (window as any).AnimControls.getState();
      }
      return null;
    });

    expect(state).not.toBeNull();

    // All particles should have opacity 0 at time 0
    const nonZeroOpacities = state.elements.filter((el: any) => el.opacity !== 0);
    expect(nonZeroOpacities.length).toBe(0);
  });

  test('?paused=true should start paused', async ({ page }) => {
    await page.goto(`/${animationUrl}?seed=12345&paused=true&showControls=true`);
    await page.waitForSelector('#anim-controls', { timeout: 1000 });

    // Check that play button shows play icon (not pause)
    const playButton = page.locator('#anim-play-pause');
    await expect(playButton).toHaveText('▶');

    // Animation should be paused
    const isPaused = await page.evaluate(() => {
      return (window as any).AnimControls?.isPaused;
    });
    expect(isPaused).toBe(true);
  });

  test('?time=1000 should jump to 1000ms and pause', async ({ page }) => {
    await page.goto(`/${animationUrl}?seed=12345&time=1000&showControls=true`);
    await page.waitForSelector('#anim-controls', { timeout: 1000 });
    await page.waitForTimeout(300);

    // Should be paused
    const playButton = page.locator('#anim-play-pause');
    await expect(playButton).toHaveText('▶');

    // Time input should show 1000
    const timeInput = page.locator('#anim-time-input');
    await expect(timeInput).toHaveValue('1000');

    // Get state - particles should be partially progressed
    const state = await page.evaluate(() => {
      if ((window as any).AnimControls && (window as any).AnimControls.getState) {
        return (window as any).AnimControls.getState();
      }
      return null;
    });

    expect(state).not.toBeNull();

    // At 1000ms into a ~2000ms entrance, particles should have opacity > 0
    const someOpacityPositive = state.elements.some((el: any) => el.opacity > 0);
    expect(someOpacityPositive).toBe(true);
  });

  test('same seed produces identical particle positions', async ({ page }) => {
    // First load
    await page.goto(`/${animationUrl}?seed=99999&time=500&showControls=true`);
    await page.waitForSelector('#anim-controls', { timeout: 1000 });
    await page.waitForTimeout(300);

    const state1 = await page.evaluate(() => {
      if ((window as any).AnimControls && (window as any).AnimControls.getState) {
        return (window as any).AnimControls.getState();
      }
      return null;
    });
    expect(state1).not.toBeNull();

    // Reload with same seed
    await page.goto(`/${animationUrl}?seed=99999&time=500&showControls=true`);
    await page.waitForSelector('#anim-controls', { timeout: 1000 });
    await page.waitForTimeout(300);

    const state2 = await page.evaluate(() => {
      if ((window as any).AnimControls && (window as any).AnimControls.getState) {
        return (window as any).AnimControls.getState();
      }
      return null;
    });
    expect(state2).not.toBeNull();

    // States should be identical
    expect(state1.elements.length).toBe(state2.elements.length);
    expect(state1.mode).toBe(state2.mode);

    // Check first 10 elements match exactly
    for (let i = 0; i < Math.min(10, state1.elements.length); i++) {
      expect(state1.elements[i].x).toBe(state2.elements[i].x);
      expect(state1.elements[i].y).toBe(state2.elements[i].y);
      expect(state1.elements[i].opacity).toBe(state2.elements[i].opacity);
      expect(state1.elements[i].startX).toBe(state2.elements[i].startX);
      expect(state1.elements[i].startY).toBe(state2.elements[i].startY);
    }
  });
});

test.describe('Text Animation - Line Drawing Varied', () => {
  const animationUrl = 'text/text-01-line-drawing-varied.html';

  test('animation runs without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`/${animationUrl}?seed=12345`);

    // Wait briefly for any errors to surface
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
