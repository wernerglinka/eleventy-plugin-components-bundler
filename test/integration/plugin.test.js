import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Eleventy from '@11ty/eleventy';
import bundledComponentsPlugin from '../../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../fixtures');

function fixture(p) {
  return path.resolve(fixturesDir, p);
}

function cleanOutput(dir) {
  const outputDir = path.join(dir, '_site');
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

describe('Eleventy Bundled Components Plugin', () => {
  describe('Plugin Export', () => {
    it('should export a function', () => {
      assert.strictEqual(typeof bundledComponentsPlugin, 'function');
    });

    it('should have the correct function name', () => {
      assert.strictEqual(bundledComponentsPlugin.name, 'bundledComponentsPlugin');
    });
  });

  describe('Plugin Registration', () => {
    it('should register event handlers with eleventyConfig', () => {
      const registeredEvents = [];
      const watchTargets = [];

      const mockEleventyConfig = {
        versionCheck: () => {},
        on: (event, handler) => {
          registeredEvents.push({ event, handler });
        },
        addWatchTarget: (target) => {
          watchTargets.push(target);
        }
      };

      bundledComponentsPlugin(mockEleventyConfig, {});

      const eventNames = registeredEvents.map((e) => e.event);
      assert(eventNames.includes('eleventy.before'));
      assert(eventNames.includes('eleventy.after'));
      assert(watchTargets.length >= 2);
    });

    it('should handle missing versionCheck gracefully', () => {
      const mockEleventyConfig = {
        versionCheck: () => {
          throw new Error('Eleventy version too old');
        },
        on: () => {},
        addWatchTarget: () => {}
      };

      assert.doesNotThrow(() => {
        bundledComponentsPlugin(mockEleventyConfig, {});
      });
    });

    it('should add watch targets for configured paths', () => {
      const watchTargets = [];

      const mockEleventyConfig = {
        versionCheck: () => {},
        on: () => {},
        addWatchTarget: (target) => {
          watchTargets.push(target);
        }
      };

      const customOptions = {
        basePath: 'custom/partials',
        sectionsPath: 'custom/sections'
      };

      bundledComponentsPlugin(mockEleventyConfig, customOptions);

      assert(watchTargets.includes('custom/partials'));
      assert(watchTargets.includes('custom/sections'));
    });
  });

  describe('Eleventy Integration', () => {
    const defaultFixture = fixture('default');
    const srcDir = path.join(defaultFixture, 'src');

    beforeEach(() => {
      cleanOutput(defaultFixture);
    });

    afterEach(() => {
      cleanOutput(defaultFixture);
    });

    it('should run a complete Eleventy build with the plugin', async () => {
      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js'
          });
        }
      });

      await elev.write();

      const outputDir = path.join(defaultFixture, '_site');
      assert(fs.existsSync(outputDir), 'Output directory should exist');
    });

    it('should generate bundled CSS file', async () => {
      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js'
          });
        }
      });

      await elev.write();

      const cssPath = path.join(defaultFixture, '_site/assets/main.css');
      assert(fs.existsSync(cssPath), 'CSS bundle should be created');

      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Should contain main entry styles
      assert(cssContent.includes('--color-primary'), 'CSS should contain design tokens from main entry');

      // Should contain component styles
      assert(cssContent.includes('.button'), 'CSS should contain button component styles');
      assert(cssContent.includes('.banner'), 'CSS should contain banner component styles');
    });

    it('should generate bundled JS file', async () => {
      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js'
          });
        }
      });

      await elev.write();

      const jsPath = path.join(defaultFixture, '_site/assets/main.js');
      assert(fs.existsSync(jsPath), 'JS bundle should be created');

      const jsContent = fs.readFileSync(jsPath, 'utf8');

      // Should contain main entry code
      assert(jsContent.includes('Main app initialized'), 'JS should contain main entry code');

      // Should contain component code
      assert(jsContent.includes('Button component initialized'), 'JS should contain button component code');
      assert(jsContent.includes('Banner component initialized'), 'JS should contain banner component code');
    });

    it('should resolve component dependencies', async () => {
      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js'
          });
        }
      });

      await elev.write();

      const cssPath = path.join(defaultFixture, '_site/assets/main.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Banner requires button, so button should be included even if only banner is used directly
      assert(cssContent.includes('.button'), 'CSS should include button (dependency of banner)');
      assert(cssContent.includes('.banner'), 'CSS should include banner');
    });

    it('should detect components from frontmatter sections', async () => {
      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js'
          });
        }
      });

      await elev.write();

      const cssPath = path.join(defaultFixture, '_site/assets/main.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      assert(cssContent.includes('.banner'), 'Banner should be detected from frontmatter sections');
    });

    it('should detect components from layout includes', async () => {
      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js'
          });
        }
      });

      await elev.write();

      const cssPath = path.join(defaultFixture, '_site/assets/main.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      assert(cssContent.includes('.banner'), 'Banner should be detected from layout include');
    });
  });

  describe('Plugin with Custom Options', () => {
    const defaultFixture = fixture('default');
    const srcDir = path.join(defaultFixture, 'src');

    afterEach(() => {
      cleanOutput(defaultFixture);
    });

    it('should accept custom output paths', async () => {
      cleanOutput(defaultFixture);

      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/styles.css',
            jsDest: 'assets/scripts.js'
          });
        }
      });

      await elev.write();

      assert(fs.existsSync(path.join(defaultFixture, '_site/assets/styles.css')), 'Custom CSS path should work');
      assert(fs.existsSync(path.join(defaultFixture, '_site/assets/scripts.js')), 'Custom JS path should work');
    });

    it('should handle minification option', async () => {
      cleanOutput(defaultFixture);

      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'src/_includes/components/_partials'),
            sectionsPath: path.join(defaultFixture, 'src/_includes/components/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            mainCSSEntry: path.join(defaultFixture, 'src/assets/main.css'),
            mainJSEntry: path.join(defaultFixture, 'src/assets/main.js'),
            cssDest: 'assets/main.css',
            jsDest: 'assets/main.js',
            minifyOutput: true
          });
        }
      });

      await elev.write();

      const cssPath = path.join(defaultFixture, '_site/assets/main.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Minified CSS should still contain component styles
      assert(cssContent.includes('.button'), 'Minified CSS should contain button styles');
      assert(cssContent.includes('.banner'), 'Minified CSS should contain banner styles');
    });
  });

  describe('Edge Cases', () => {
    const defaultFixture = fixture('default');
    const srcDir = path.join(defaultFixture, 'src');

    afterEach(() => {
      cleanOutput(defaultFixture);
    });

    it('should handle empty component directories gracefully', async () => {
      cleanOutput(defaultFixture);

      const elev = new Eleventy(srcDir, path.join(defaultFixture, '_site'), {
        quietMode: true,
        config: function (eleventyConfig) {
          eleventyConfig.addPlugin(bundledComponentsPlugin, {
            basePath: path.join(defaultFixture, 'non-existent/partials'),
            sectionsPath: path.join(defaultFixture, 'non-existent/sections'),
            layoutsPath: path.join(defaultFixture, 'src/_includes/layouts'),
            cssDest: 'assets/empty.css',
            jsDest: 'assets/empty.js'
          });
        }
      });

      // Should not throw
      await assert.doesNotReject(async () => {
        await elev.write();
      });
    });
  });

  describe('Options Handling', () => {
    it('should use default options when none provided', () => {
      const watchTargets = [];

      const mockEleventyConfig = {
        versionCheck: () => {},
        on: () => {},
        addWatchTarget: (target) => {
          watchTargets.push(target);
        }
      };

      bundledComponentsPlugin(mockEleventyConfig);

      assert(watchTargets.includes('src/_includes/components/_partials'));
      assert(watchTargets.includes('src/_includes/components/sections'));
    });

    it('should merge partial options with defaults', () => {
      const watchTargets = [];

      const mockEleventyConfig = {
        versionCheck: () => {},
        on: () => {},
        addWatchTarget: (target) => {
          watchTargets.push(target);
        }
      };

      const partialOptions = {
        basePath: 'custom/partials'
      };

      bundledComponentsPlugin(mockEleventyConfig, partialOptions);

      assert(watchTargets.includes('custom/partials'));
      assert(watchTargets.includes('src/_includes/components/sections'));
    });
  });
});
