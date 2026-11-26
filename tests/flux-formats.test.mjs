import assert from 'node:assert/strict';
import test from 'node:test';
import { fluxDimensions } from '../lib/kai/fluxFormats.ts';

test('Every FLUX preset fits the public Space sliders and preserves the requested ratio', () => {
  for (const [ratio, [width, height]] of Object.entries(fluxDimensions)) {
    for (const side of [width, height]) {
      assert.ok(side >= 256 && side <= 1024, ratio);
      assert.equal(side % 8, 0, ratio);
    }
    const [a, b] = ratio === 'B6' ? [128, 182] : ratio.split(':').map(Number);
    assert.equal(width * b, height * a, ratio);
  }
});
