import assert from 'node:assert';
import { validateRequirements } from '../../lib/requirement-validator.js';

describe('Requirement Validator', () => {
  describe('validateRequirements()', () => {
    it('should return empty array when all requirements are met', () => {
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: [] }]
      ]);
      const neededComponents = new Set(['hero', 'button']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.deepStrictEqual(errors, []);
    });

    it('should return error for missing required component', () => {
      const componentMap = new Map([['hero', { name: 'hero', requires: ['missing-button'] }]]);
      const neededComponents = new Set(['hero']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('hero'));
      assert(errors[0].includes('missing-button'));
      assert(errors[0].includes('not found'));
    });

    it('should return multiple errors for multiple missing requirements', () => {
      const componentMap = new Map([['hero', { name: 'hero', requires: ['missing1', 'missing2'] }]]);
      const neededComponents = new Set(['hero']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.strictEqual(errors.length, 2);
      assert(errors[0].includes('missing1'));
      assert(errors[1].includes('missing2'));
    });

    it('should check requirements across multiple needed components', () => {
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['missing1'] }],
        ['banner', { name: 'banner', requires: ['missing2'] }],
        ['button', { name: 'button', requires: [] }]
      ]);
      const neededComponents = new Set(['hero', 'banner', 'button']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.strictEqual(errors.length, 2);
    });

    it('should only validate needed components, not all components', () => {
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['unused', { name: 'unused', requires: ['missing-dep'] }],
        ['button', { name: 'button', requires: [] }]
      ]);
      // Only hero and button are needed, unused is not
      const neededComponents = new Set(['hero', 'button']);

      const errors = validateRequirements(neededComponents, componentMap);
      // Should not report error for unused component's missing dependency
      assert.deepStrictEqual(errors, []);
    });

    it('should support legacy dependencies property', () => {
      const componentMap = new Map([['hero', { name: 'hero', dependencies: ['missing-legacy'] }]]);
      const neededComponents = new Set(['hero']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('missing-legacy'));
    });

    it('should prefer requires over dependencies when both exist', () => {
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'], dependencies: ['missing'] }],
        ['button', { name: 'button', requires: [] }]
      ]);
      const neededComponents = new Set(['hero', 'button']);

      const errors = validateRequirements(neededComponents, componentMap);
      // Should only check 'requires', not 'dependencies'
      assert.deepStrictEqual(errors, []);
    });

    it('should handle components with no requirements', () => {
      const componentMap = new Map([
        ['button', { name: 'button' }],
        ['icon', { name: 'icon', requires: [] }],
        ['image', { name: 'image', dependencies: [] }]
      ]);
      const neededComponents = new Set(['button', 'icon', 'image']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.deepStrictEqual(errors, []);
    });

    it('should handle empty needed components set', () => {
      const componentMap = new Map([['hero', { name: 'hero', requires: ['missing'] }]]);
      const neededComponents = new Set();

      const errors = validateRequirements(neededComponents, componentMap);
      assert.deepStrictEqual(errors, []);
    });

    it('should handle empty component map', () => {
      const componentMap = new Map();
      const neededComponents = new Set();

      const errors = validateRequirements(neededComponents, componentMap);
      assert.deepStrictEqual(errors, []);
    });

    it('should handle transitive requirements that exist', () => {
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: ['icon'] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);
      const neededComponents = new Set(['hero', 'button', 'icon']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.deepStrictEqual(errors, []);
    });

    it('should catch missing transitive requirements', () => {
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: ['missing-icon'] }]
      ]);
      const neededComponents = new Set(['hero', 'button']);

      const errors = validateRequirements(neededComponents, componentMap);
      assert.strictEqual(errors.length, 1);
      assert(errors[0].includes('button'));
      assert(errors[0].includes('missing-icon'));
    });

    it('should not report errors for self-references (circular)', () => {
      // Note: Self-references shouldn't cause validation errors
      // (though they would cause infinite loops elsewhere)
      const componentMap = new Map([['recursive', { name: 'recursive', requires: ['recursive'] }]]);
      const neededComponents = new Set(['recursive']);

      const errors = validateRequirements(neededComponents, componentMap);
      // recursive requires itself, which exists
      assert.deepStrictEqual(errors, []);
    });

    it('should skip components in neededComponents that are not in componentMap', () => {
      const componentMap = new Map([['button', { name: 'button', requires: [] }]]);
      // Include a component name that doesn't exist in the map
      const neededComponents = new Set(['button', 'nonexistent']);

      const errors = validateRequirements(neededComponents, componentMap);
      // Should not error, just skip the nonexistent component
      assert.deepStrictEqual(errors, []);
    });
  });
});
