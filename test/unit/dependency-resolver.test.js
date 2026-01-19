import assert from 'node:assert';
import { resolveAllDependencies, filterNeededComponents } from '../../lib/dependency-resolver.js';

describe('Dependency Resolver', () => {
  describe('resolveAllDependencies()', () => {
    it('should return only used components when they have no dependencies', () => {
      const used = new Set(['button']);
      const componentMap = new Map([['button', { name: 'button', requires: [] }]]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should resolve single-level dependencies', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['button', 'hero'].sort());
    });

    it('should resolve multi-level (transitive) dependencies', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'] }],
        ['button', { name: 'button', requires: ['icon'] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['button', 'hero', 'icon'].sort());
    });

    it('should handle multiple direct dependencies', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button', 'image', 'icon'] }],
        ['button', { name: 'button', requires: [] }],
        ['image', { name: 'image', requires: [] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['button', 'hero', 'icon', 'image'].sort());
    });

    it('should deduplicate shared dependencies', () => {
      const used = new Set(['hero', 'banner']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button', 'icon'] }],
        ['banner', { name: 'banner', requires: ['button', 'image'] }],
        ['button', { name: 'button', requires: [] }],
        ['icon', { name: 'icon', requires: [] }],
        ['image', { name: 'image', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['banner', 'button', 'hero', 'icon', 'image'].sort());
    });

    it('should support legacy dependencies property', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', dependencies: ['button'] }],
        ['button', { name: 'button', dependencies: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['button', 'hero'].sort());
    });

    it('should prefer requires over dependencies when both exist', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button'], dependencies: ['icon'] }],
        ['button', { name: 'button', requires: [] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      // Should only resolve 'requires', not 'dependencies'
      assert.deepStrictEqual([...result].sort(), ['button', 'hero'].sort());
    });

    it('should handle components with neither requires nor dependencies', () => {
      const used = new Set(['button']);
      const componentMap = new Map([['button', { name: 'button' }]]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should skip missing components gracefully', () => {
      const used = new Set(['hero']);
      const componentMap = new Map([['hero', { name: 'hero', requires: ['missing'] }]]);

      const result = resolveAllDependencies(used, componentMap);
      // Should include hero and missing (validation catches missing later)
      assert.deepStrictEqual([...result].sort(), ['hero', 'missing'].sort());
    });

    it('should handle empty used components set', () => {
      const used = new Set();
      const componentMap = new Map([['button', { name: 'button', requires: [] }]]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result], []);
    });

    it('should handle complex diamond dependency graph', () => {
      //     hero
      //    /    \
      //  button  image
      //    \    /
      //     icon
      const used = new Set(['hero']);
      const componentMap = new Map([
        ['hero', { name: 'hero', requires: ['button', 'image'] }],
        ['button', { name: 'button', requires: ['icon'] }],
        ['image', { name: 'image', requires: ['icon'] }],
        ['icon', { name: 'icon', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['button', 'hero', 'icon', 'image'].sort());
    });

    it('should handle circular dependencies without infinite loop', () => {
      const used = new Set(['a']);
      const componentMap = new Map([
        ['a', { name: 'a', requires: ['b'] }],
        ['b', { name: 'b', requires: ['a'] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.deepStrictEqual([...result].sort(), ['a', 'b'].sort());
    });

    it('should handle deep dependency chains', () => {
      const used = new Set(['level1']);
      const componentMap = new Map([
        ['level1', { name: 'level1', requires: ['level2'] }],
        ['level2', { name: 'level2', requires: ['level3'] }],
        ['level3', { name: 'level3', requires: ['level4'] }],
        ['level4', { name: 'level4', requires: ['level5'] }],
        ['level5', { name: 'level5', requires: [] }]
      ]);

      const result = resolveAllDependencies(used, componentMap);
      assert.strictEqual(result.size, 5);
      assert(result.has('level1'));
      assert(result.has('level5'));
    });
  });

  describe('filterNeededComponents()', () => {
    it('should filter components to only needed ones', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' },
        { name: 'unused', path: '/unused' }
      ];
      const needed = new Set(['button', 'icon']);

      const result = filterNeededComponents(allComponents, needed);
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result.map((c) => c.name).sort(), ['button', 'icon'].sort());
    });

    it('should return empty array when no components are needed', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' }
      ];
      const needed = new Set();

      const result = filterNeededComponents(allComponents, needed);
      assert.deepStrictEqual(result, []);
    });

    it('should preserve original component objects', () => {
      const allComponents = [
        { name: 'button', path: '/button', styles: ['button.css'] },
        { name: 'unused', path: '/unused' }
      ];
      const needed = new Set(['button']);

      const result = filterNeededComponents(allComponents, needed);
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0], allComponents[0]);
    });

    it('should handle when all components are needed', () => {
      const allComponents = [
        { name: 'button', path: '/button' },
        { name: 'icon', path: '/icon' }
      ];
      const needed = new Set(['button', 'icon']);

      const result = filterNeededComponents(allComponents, needed);
      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result, allComponents);
    });

    it('should handle empty allComponents array', () => {
      const allComponents = [];
      const needed = new Set(['button']);

      const result = filterNeededComponents(allComponents, needed);
      assert.deepStrictEqual(result, []);
    });

    it('should maintain original order of components', () => {
      const allComponents = [
        { name: 'zebra', path: '/zebra' },
        { name: 'alpha', path: '/alpha' },
        { name: 'beta', path: '/beta' }
      ];
      const needed = new Set(['zebra', 'alpha', 'beta']);

      const result = filterNeededComponents(allComponents, needed);
      assert.strictEqual(result[0].name, 'zebra');
      assert.strictEqual(result[1].name, 'alpha');
      assert.strictEqual(result[2].name, 'beta');
    });
  });
});
