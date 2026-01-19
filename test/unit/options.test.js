import assert from 'node:assert';
import { normalizeOptions, defaults } from '../../lib/options.js';

describe('Options', () => {
  describe('defaults', () => {
    it('should export default configuration values', () => {
      assert.strictEqual(defaults.basePath, 'src/_includes/components/_partials');
      assert.strictEqual(defaults.sectionsPath, 'src/_includes/components/sections');
      assert.strictEqual(defaults.layoutsPath, 'src/_includes/layouts');
      assert.strictEqual(defaults.cssDest, 'assets/main.css');
      assert.strictEqual(defaults.jsDest, 'assets/main.js');
      assert.strictEqual(defaults.mainCSSEntry, 'src/assets/main.css');
      assert.strictEqual(defaults.mainJSEntry, 'src/assets/main.js');
      assert.strictEqual(defaults.minifyOutput, false);
    });

    it('should have default postcss configuration', () => {
      assert.strictEqual(defaults.postcss.enabled, false);
      assert.deepStrictEqual(defaults.postcss.plugins, []);
      assert.deepStrictEqual(defaults.postcss.options, {});
    });

    it('should have default validation configuration', () => {
      assert.strictEqual(defaults.validation.enabled, true);
      assert.strictEqual(defaults.validation.strict, false);
      assert.strictEqual(defaults.validation.reportAllErrors, true);
    });
  });

  describe('normalizeOptions()', () => {
    it('should return defaults when called with no arguments', () => {
      const result = normalizeOptions();

      assert.strictEqual(result.basePath, defaults.basePath);
      assert.strictEqual(result.sectionsPath, defaults.sectionsPath);
      assert.strictEqual(result.cssDest, defaults.cssDest);
      assert.strictEqual(result.jsDest, defaults.jsDest);
    });

    it('should return defaults when called with empty object', () => {
      const result = normalizeOptions({});

      assert.strictEqual(result.basePath, defaults.basePath);
      assert.strictEqual(result.sectionsPath, defaults.sectionsPath);
    });

    it('should return defaults when called with null', () => {
      const result = normalizeOptions(null);

      assert.strictEqual(result.basePath, defaults.basePath);
    });

    it('should merge custom options with defaults', () => {
      const customOptions = {
        basePath: 'custom/base/path',
        cssDest: 'custom/css/output.css'
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.basePath, 'custom/base/path');
      assert.strictEqual(result.cssDest, 'custom/css/output.css');
      // Should retain defaults for unspecified options
      assert.strictEqual(result.sectionsPath, defaults.sectionsPath);
      assert.strictEqual(result.jsDest, defaults.jsDest);
    });

    it('should merge partial postcss configuration with defaults', () => {
      const customOptions = {
        postcss: {
          enabled: true
        }
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.postcss.enabled, true);
      assert.deepStrictEqual(result.postcss.plugins, []);
      assert.deepStrictEqual(result.postcss.options, {});
    });

    it('should merge partial validation configuration with defaults', () => {
      const customOptions = {
        validation: {
          strict: true
        }
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.validation.strict, true);
      assert.strictEqual(result.validation.enabled, true);
      assert.strictEqual(result.validation.reportAllErrors, true);
    });

    it('should handle complete postcss configuration', () => {
      const mockPlugin = () => {};
      const customOptions = {
        postcss: {
          enabled: true,
          plugins: [mockPlugin],
          options: { map: false }
        }
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.postcss.enabled, true);
      assert.deepStrictEqual(result.postcss.plugins, [mockPlugin]);
      assert.deepStrictEqual(result.postcss.options, { map: false });
    });

    it('should handle null postcss configuration', () => {
      const customOptions = {
        postcss: null
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.postcss.enabled, false);
      assert.deepStrictEqual(result.postcss.plugins, []);
    });

    it('should handle null validation configuration', () => {
      const customOptions = {
        validation: null
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.validation.enabled, true);
      assert.strictEqual(result.validation.strict, false);
    });

    it('should preserve minifyOutput option', () => {
      const customOptions = {
        minifyOutput: true
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.minifyOutput, true);
    });

    it('should preserve all path options', () => {
      const customOptions = {
        basePath: 'components/partials',
        sectionsPath: 'components/sections',
        layoutsPath: 'layouts',
        cssDest: 'dist/styles.css',
        jsDest: 'dist/scripts.js',
        mainCSSEntry: 'styles/main.css',
        mainJSEntry: 'scripts/main.js'
      };

      const result = normalizeOptions(customOptions);

      assert.strictEqual(result.basePath, 'components/partials');
      assert.strictEqual(result.sectionsPath, 'components/sections');
      assert.strictEqual(result.layoutsPath, 'layouts');
      assert.strictEqual(result.cssDest, 'dist/styles.css');
      assert.strictEqual(result.jsDest, 'dist/scripts.js');
      assert.strictEqual(result.mainCSSEntry, 'styles/main.css');
      assert.strictEqual(result.mainJSEntry, 'scripts/main.js');
    });
  });
});
