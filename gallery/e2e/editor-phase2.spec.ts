/**
 * Phase 2 Editor Tests
 *
 * Acceptance criteria from PROJECT_SPEC.md:
 * 1. User drags "RadialOrigin" from library, drops into Fields lane, block appears
 * 2. Blocks persist in store (during session they stay)
 * 3. Clicking block selects it (visual highlight)
 * 4. Inspector displays selected block info
 * 5. Multiple blocks can exist in same lane
 */

import { test, expect } from '@playwright/test';

test.describe('Editor Phase 2: Block Library + Drag-and-Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/editor');
    // Wait for editor to fully load
    await expect(page.locator('.editor')).toBeVisible();
    await expect(page.locator('.block-library')).toBeVisible();
    await expect(page.locator('.patch-bay')).toBeVisible();
  });

  test('editor layout has all 4 panels', async ({ page }) => {
    // Left: Block Library
    await expect(page.locator('.block-library')).toBeVisible();
    await expect(page.locator('.library-header h2')).toHaveText('Block Library');

    // Center: Patch Bay with 7 lanes
    const lanes = page.locator('.lane');
    await expect(lanes).toHaveCount(7);

    // Right: Inspector
    await expect(page.locator('.inspector')).toBeVisible();

    // Bottom: Transport
    await expect(page.locator('.transport')).toBeVisible();
  });

  test('block library shows blocks organized by category', async ({ page }) => {
    // Check categories are present
    await expect(page.locator('.category-label:has-text("Scene")')).toBeVisible();
    await expect(page.locator('.category-label:has-text("Fields")')).toBeVisible();
    await expect(page.locator('.category-label:has-text("Time")')).toBeVisible();

    // Check specific blocks exist
    await expect(page.locator('.block-item:has-text("SVG Paths")')).toBeVisible();
    await expect(page.locator('.block-item:has-text("Radial Origin")')).toBeVisible();
    await expect(page.locator('.block-item:has-text("Phase Machine")')).toBeVisible();
    await expect(page.locator('.block-item:has-text("Particle Renderer")')).toBeVisible();
  });

  test('lanes show "Drag blocks here" when empty', async ({ page }) => {
    // All lanes should show empty state
    const emptyMessages = page.locator('.lane-empty');
    await expect(emptyMessages.first()).toContainText('Drag blocks here');
  });

  test('can drag block from library to lane', async ({ page }) => {
    // Find the RadialOrigin block in library
    const radialOriginBlock = page.locator('.block-item:has-text("Radial Origin")');
    await expect(radialOriginBlock).toBeVisible();

    // Find the Fields lane
    const fieldsLane = page.locator('.lane[data-lane="Fields"]');
    const fieldsLaneContent = fieldsLane.locator('.lane-content');

    // Drag the block to the lane
    await radialOriginBlock.dragTo(fieldsLaneContent);

    // Block should appear in the lane
    const blockInLane = fieldsLane.locator('.block');
    await expect(blockInLane).toBeVisible();
    await expect(blockInLane).toContainText('Radial Origin');
  });

  test('clicking block selects it and shows in inspector', async ({ page }) => {
    // First, add a block
    const radialOriginBlock = page.locator('.block-item:has-text("Radial Origin")');
    const fieldsLane = page.locator('.lane[data-lane="Fields"] .lane-content');
    await radialOriginBlock.dragTo(fieldsLane);

    // Click the block in the lane
    const blockInLane = page.locator('.lane[data-lane="Fields"] .block');
    await blockInLane.click();

    // Block should have selected class
    await expect(blockInLane).toHaveClass(/selected/);

    // Inspector should show block details
    const inspector = page.locator('.inspector');
    await expect(inspector.locator('.inspector-header h2')).toHaveText('Radial Origin');
    await expect(inspector.locator('.block-type-code')).toHaveText('RadialOrigin');

    // Inspector should show parameters
    await expect(inspector.locator('.param-label:has-text("centerX")')).toBeVisible();
    await expect(inspector.locator('.param-label:has-text("centerY")')).toBeVisible();
  });

  test('multiple blocks can exist in same lane', async ({ page }) => {
    const fieldsLane = page.locator('.lane[data-lane="Fields"] .lane-content');

    // Add RadialOrigin block
    await page.locator('.block-item:has-text("Radial Origin")').dragTo(fieldsLane);

    // Add LinearStagger block
    await page.locator('.block-item:has-text("Linear Stagger")').dragTo(fieldsLane);

    // Both blocks should be visible in the lane
    const blocksInLane = page.locator('.lane[data-lane="Fields"] .block');
    await expect(blocksInLane).toHaveCount(2);
    await expect(blocksInLane.nth(0)).toContainText('Radial Origin');
    await expect(blocksInLane.nth(1)).toContainText('Linear Stagger');
  });

  test('can delete block from inspector', async ({ page }) => {
    // Add a block
    const radialOriginBlock = page.locator('.block-item:has-text("Radial Origin")');
    const fieldsLane = page.locator('.lane[data-lane="Fields"] .lane-content');
    await radialOriginBlock.dragTo(fieldsLane);

    // Select the block
    await page.locator('.lane[data-lane="Fields"] .block').click();

    // Click delete button in inspector
    await page.locator('.delete-button').click();

    // Block should be removed
    await expect(page.locator('.lane[data-lane="Fields"] .block')).toHaveCount(0);

    // Inspector should show empty state
    await expect(page.locator('.inspector-empty')).toBeVisible();
  });

  test('can edit block parameters in inspector', async ({ page }) => {
    // Add a block
    await page.locator('.block-item:has-text("Radial Origin")').dragTo(
      page.locator('.lane[data-lane="Fields"] .lane-content')
    );

    // Select the block
    await page.locator('.lane[data-lane="Fields"] .block').click();

    // Find the centerX input and change it
    const centerXInput = page.locator('.param-item:has(.param-label:has-text("centerX")) input');
    await centerXInput.fill('500');

    // Value should be updated (we can verify by checking the input value)
    await expect(centerXInput).toHaveValue('500');
  });

  test('inspector shows input/output slots', async ({ page }) => {
    // Add PerElementTransport (has multiple inputs)
    await page.locator('.block-item:has-text("Per-Element Transport")').dragTo(
      page.locator('.lane[data-lane="Composition"] .lane-content')
    );

    // Select the block
    await page.locator('.lane[data-lane="Composition"] .block').click();

    // Should show inputs
    await expect(page.locator('.inspector-section h3:has-text("Inputs")')).toBeVisible();
    await expect(page.locator('.slot-label:has-text("Targets")')).toBeVisible();
    await expect(page.locator('.slot-type:has-text("SceneTargets")')).toBeVisible();

    // Should show outputs
    await expect(page.locator('.inspector-section h3:has-text("Outputs")')).toBeVisible();
    await expect(page.locator('.slot-label:has-text("Program")')).toBeVisible();
  });

  test('lane highlights when dragging over it', async ({ page }) => {
    const radialOriginBlock = page.locator('.block-item:has-text("Radial Origin")');
    const fieldsLane = page.locator('.lane[data-lane="Fields"]');

    // Start dragging
    await radialOriginBlock.hover();
    await page.mouse.down();

    // Move to fields lane
    const laneBox = await fieldsLane.boundingBox();
    if (laneBox) {
      await page.mouse.move(laneBox.x + laneBox.width / 2, laneBox.y + laneBox.height / 2);
    }

    // Lane should have drop-target class
    await expect(fieldsLane).toHaveClass(/drop-target/);

    // Release
    await page.mouse.up();
  });

  test('transport bar controls are present', async ({ page }) => {
    // Play/pause button
    await expect(page.locator('.transport-button:has-text("▶")')).toBeVisible();

    // Scrubber
    await expect(page.locator('.scrubber-slider')).toBeVisible();
    await expect(page.locator('.time-display')).toContainText('0.00s');

    // Settings
    await expect(page.locator('.setting-label:has-text("Speed")')).toBeVisible();
    await expect(page.locator('.setting-label:has-text("Seed")')).toBeVisible();
  });
});
