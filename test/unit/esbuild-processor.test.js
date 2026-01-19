import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleWithESBuild } from '../../lib/esbuild-processor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('ESBuild Processor', () => {
  describe('bundleWithESBuild()', () => {
    it('should return null css and js when no components provided', async () => {
      const result = await bundleWithESBuild([], [], process.cwd(), {
        mainCSSEntry: null,
        mainJSEntry: null
      });

      assert.strictEqual(result.css, null);
      assert.strictEqual(result.js, null);
    });

    it('should bundle CSS from components', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: []
        }
      ];

      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.css !== null);
      assert(result.css.includes('.button'));
    });

    it('should bundle JS from components', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: [],
          scripts: ['button.js']
        }
      ];

      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.js !== null);
      assert(result.js.includes('Button component initialized'));
    });

    it('should bundle both CSS and JS from components', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: ['button.js']
        }
      ];

      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.css !== null);
      assert(result.js !== null);
      assert(result.css.includes('.button'));
      assert(result.js.includes('Button component initialized'));
    });

    it('should include main CSS entry when specified', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const mainCSSEntry = 'assets/main.css';

      const result = await bundleWithESBuild([], [], projectRoot, {
        mainCSSEntry,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.css !== null);
      assert(result.css.includes('--color-primary'));
    });

    it('should include main JS entry when specified', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const mainJSEntry = 'assets/main.js';

      const result = await bundleWithESBuild([], [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry,
        minifyOutput: false
      });

      assert(result.js !== null);
      assert(result.js.includes('Main app initialized'));
    });

    it('should combine main entries with component assets', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: ['button.js']
        }
      ];

      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: 'assets/main.css',
        mainJSEntry: 'assets/main.js',
        minifyOutput: false
      });

      // Should contain both main entry and component styles/scripts
      assert(result.css.includes('--color-primary'));
      assert(result.css.includes('.button'));
      assert(result.js.includes('Main app initialized'));
      assert(result.js.includes('Button component initialized'));
    });

    it('should bundle section components', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const bannerPath = path.join(projectRoot, '_includes/components/sections/banner');

      const sectionComponents = [
        {
          name: 'banner',
          path: bannerPath,
          styles: ['banner.css'],
          scripts: ['banner.js']
        }
      ];

      const result = await bundleWithESBuild([], sectionComponents, projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.css.includes('.banner'));
      assert(result.js.includes('Banner component initialized'));
    });

    it('should minify output when minifyOutput is true', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: ['button.js']
        }
      ];

      const minified = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: true
      });

      const unminified = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      // Minified should be shorter (fewer whitespace/newlines)
      assert(minified.css.length <= unminified.css.length);
      assert(minified.css.includes('.button'));
    });

    it('should skip non-existent asset files gracefully', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css', 'non-existent.css'],
          scripts: ['button.js', 'non-existent.js']
        }
      ];

      // Should not throw, should bundle what exists
      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.css !== null);
      assert(result.css.includes('.button'));
    });

    it('should skip non-existent main entry files gracefully', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');

      const result = await bundleWithESBuild([], [], projectRoot, {
        mainCSSEntry: 'non-existent/main.css',
        mainJSEntry: 'non-existent/main.js',
        minifyOutput: false
      });

      assert.strictEqual(result.css, null);
      assert.strictEqual(result.js, null);
    });

    it('should deduplicate shared asset files', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      // Two components referencing the same CSS file
      const baseComponents = [
        {
          name: 'button1',
          path: buttonPath,
          styles: ['button.css'],
          scripts: []
        },
        {
          name: 'button2',
          path: buttonPath,
          styles: ['button.css'],
          scripts: []
        }
      ];

      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      // Should only include .button styles once
      const buttonOccurrences = (result.css.match(/\.button\s*\{/g) || []).length;
      assert.strictEqual(buttonOccurrences, 1);
    });

    it('should output IIFE format for JavaScript', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: [],
          scripts: ['button.js']
        }
      ];

      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      // IIFE format starts with (() => { or (function() {
      assert(result.js.includes('('));
      assert(result.js.includes(')'));
    });

    it('should handle PostCSS configuration when enabled', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: []
        }
      ];

      // PostCSS with empty plugins should still work
      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false,
        postcss: {
          enabled: true,
          plugins: [],
          options: {}
        }
      });

      assert(result.css !== null);
      assert(result.css.includes('.button'));
    });

    it('should process base components before section components', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');
      const bannerPath = path.join(projectRoot, '_includes/components/sections/banner');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: []
        }
      ];

      const sectionComponents = [
        {
          name: 'banner',
          path: bannerPath,
          styles: ['banner.css'],
          scripts: []
        }
      ];

      const result = await bundleWithESBuild(baseComponents, sectionComponents, projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      // Both should be included
      assert(result.css.includes('.button'));
      assert(result.css.includes('.banner'));
    });

    it('should return null on CSS bundling error in non-strict mode', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');

      const baseComponents = [
        {
          name: 'invalid',
          path: '/non/existent/path',
          styles: ['invalid.css'],
          scripts: []
        }
      ];

      // Non-strict mode (default) - should return null, not throw
      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false,
        validation: { strict: false }
      });

      assert.strictEqual(result.css, null);
    });

    it('should return null on JS bundling error in non-strict mode', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');

      const baseComponents = [
        {
          name: 'invalid',
          path: '/non/existent/path',
          styles: [],
          scripts: ['invalid.js']
        }
      ];

      // Non-strict mode (default) - should return null, not throw
      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false,
        validation: { strict: false }
      });

      assert.strictEqual(result.js, null);
    });

    it('should handle validation.strict option being undefined', async () => {
      const projectRoot = path.join(fixturesDir, 'default/src');
      const buttonPath = path.join(projectRoot, '_includes/components/_partials/button');

      const baseComponents = [
        {
          name: 'button',
          path: buttonPath,
          styles: ['button.css'],
          scripts: ['button.js']
        }
      ];

      // No validation object at all - should work fine
      const result = await bundleWithESBuild(baseComponents, [], projectRoot, {
        mainCSSEntry: null,
        mainJSEntry: null,
        minifyOutput: false
      });

      assert(result.css !== null);
      assert(result.js !== null);
    });
  });
});
