import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPanelWidth, panelWidthBounds } from '../js/resizable-panel.js';

test('panel width preserves room for the visualization',()=>{
  assert.deepEqual(panelWidthBounds(1440),{min:285,max:720});
  assert.deepEqual(panelWidthBounds(900),{min:285,max:580});
  assert.equal(clampPanelWidth(800,900),580);
});

test('panel width has an accessible minimum',()=>{
  assert.equal(clampPanelWidth(100,1440),285);
  assert.equal(clampPanelWidth(440,1440),440);
});
