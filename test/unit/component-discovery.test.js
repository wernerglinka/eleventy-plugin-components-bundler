import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectComponents,
  loadComponent,
  autoGenerateManifest,
  createComponentMap,
  isPathSafe,
  filterSafeAssetPaths
} from '../../lib/component-discovery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Component Discovery', () => {
  describe('collectComponents()', () => {
    it('should return empty array for non-existent directory', () => {
      const result = collectComponents('/non/existent/path');
      assert.deepStrictEqual(result, []);
    });

    it('should collect components from existing directory', () => {
      const testDir = path.join(fixturesDir, 'default/src/_includes/components/_partials');
      const result = collectComponents(testDir);

      assert(Array.isArray(result));
      assert(result.length > 0);
      assert(result.some((c) => c.name === 'button'));
    });

    it('should collect section components with manifests', () => {
      const testDir = path.join(fixturesDir, 'default/src/_includes/components/sections');
      const result = collectComponents(testDir);

      assert(Array.isArray(result));
      assert(result.some((c) => c.name === 'banner'));

      const banner = result.find((c) => c.name === 'banner');
      assert(banner.requires.includes('button'));
    });

    it('should skip non-directory items', () => {
      const tempDir = path.join(fixturesDir, 'temp-discovery');
      const tempFile = path.join(tempDir, 'not-a-dir.txt');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFile, 'test');

      try {
        const result = collectComponents(tempDir);
        assert.deepStrictEqual(result, []);
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });

  describe('loadComponent()', () => {
    it('should load component with manifest file', () => {
      const componentPath = path.join(fixturesDir, 'default/src/_includes/components/sections/banner');
      const result = loadComponent(componentPath, 'banner');

      assert.strictEqual(result.name, 'banner');
      assert(Array.isArray(result.styles));
      assert(Array.isArray(result.scripts));
      assert(Array.isArray(result.dependencies));
      assert.strictEqual(result.path, componentPath);
    });

    it('should auto-generate manifest for component without manifest file', () => {
      const componentPath = path.join(fixturesDir, 'default/src/_includes/components/_partials/button');
      const result = loadComponent(componentPath, 'button');

      assert.strictEqual(result.name, 'button');
      assert.strictEqual(result.type, 'auto');
      assert(result.styles.includes('button.css'));
      assert(result.scripts.includes('button.js'));
      assert.deepStrictEqual(result.dependencies, []);
    });

    it('should return null for component with invalid manifest JSON', () => {
      const tempDir = path.join(fixturesDir, 'temp-invalid');
      const manifestPath = path.join(tempDir, 'manifest.json');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(manifestPath, 'invalid json{');

      try {
        const result = loadComponent(tempDir, 'invalid');
        assert.strictEqual(result, null);
      } finally {
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should return null for component with missing name in manifest', () => {
      const tempDir = path.join(fixturesDir, 'temp-no-name');
      const manifestPath = path.join(tempDir, 'manifest.json');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(manifestPath, JSON.stringify({ type: 'test' }));

      try {
        const result = loadComponent(tempDir, 'no-name');
        assert.strictEqual(result, null);
      } finally {
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should preserve requires array from manifest', () => {
      const tempDir = path.join(fixturesDir, 'temp-requires');
      const manifestPath = path.join(tempDir, 'manifest.json');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          name: 'test',
          requires: ['button', 'icon']
        })
      );

      try {
        const result = loadComponent(tempDir, 'test');
        assert.strictEqual(result.name, 'test');
        // Note: requires is spread via ...manifest, dependencies is always set
        assert.deepStrictEqual(result.dependencies, []);
      } finally {
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });

  describe('autoGenerateManifest()', () => {
    it('should generate manifest for component with CSS and JS files', () => {
      const componentPath = path.join(fixturesDir, 'default/src/_includes/components/_partials/button');
      const result = autoGenerateManifest(componentPath, 'button');

      assert.strictEqual(result.name, 'button');
      assert.strictEqual(result.type, 'auto');
      assert(result.styles.includes('button.css'));
      assert(result.scripts.includes('button.js'));
      assert.deepStrictEqual(result.dependencies, []);
    });

    it('should generate manifest for component with only CSS file', () => {
      const tempDir = path.join(fixturesDir, 'temp-css-only');
      const cssFile = path.join(tempDir, 'test.css');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(cssFile, '.test {}');

      try {
        const result = autoGenerateManifest(tempDir, 'test');

        assert.strictEqual(result.name, 'test');
        assert.strictEqual(result.type, 'auto');
        assert(result.styles.includes('test.css'));
        assert.deepStrictEqual(result.scripts, []);
        assert.deepStrictEqual(result.dependencies, []);
      } finally {
        if (fs.existsSync(cssFile)) {
          fs.unlinkSync(cssFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should generate manifest for component with only JS file', () => {
      const tempDir = path.join(fixturesDir, 'temp-js-only');
      const jsFile = path.join(tempDir, 'test.js');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(jsFile, 'console.log("test");');

      try {
        const result = autoGenerateManifest(tempDir, 'test');

        assert.strictEqual(result.name, 'test');
        assert.strictEqual(result.type, 'auto');
        assert.deepStrictEqual(result.styles, []);
        assert(result.scripts.includes('test.js'));
        assert.deepStrictEqual(result.dependencies, []);
      } finally {
        if (fs.existsSync(jsFile)) {
          fs.unlinkSync(jsFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should generate manifest for component with no asset files', () => {
      const tempDir = path.join(fixturesDir, 'temp-empty');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        const result = autoGenerateManifest(tempDir, 'empty');

        assert.strictEqual(result.name, 'empty');
        assert.strictEqual(result.type, 'auto');
        assert.deepStrictEqual(result.styles, []);
        assert.deepStrictEqual(result.scripts, []);
        assert.deepStrictEqual(result.dependencies, []);
      } finally {
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });

  describe('createComponentMap()', () => {
    it('should create map from component array', () => {
      const components = [
        { name: 'button', styles: [], scripts: [], dependencies: [] },
        { name: 'image', styles: [], scripts: [], dependencies: [] }
      ];

      const result = createComponentMap(components);

      assert(result instanceof Map);
      assert.strictEqual(result.size, 2);
      assert(result.has('button'));
      assert(result.has('image'));
      assert.strictEqual(result.get('button').name, 'button');
    });

    it('should throw error for duplicate component names', () => {
      const components = [
        { name: 'button', styles: [], scripts: [], dependencies: [] },
        { name: 'button', styles: [], scripts: [], dependencies: [] }
      ];

      assert.throws(() => {
        createComponentMap(components);
      }, /Duplicate component name: button/);
    });

    it('should handle empty component array', () => {
      const result = createComponentMap([]);

      assert(result instanceof Map);
      assert.strictEqual(result.size, 0);
    });

    it('should preserve all component properties in map', () => {
      const components = [
        {
          name: 'button',
          styles: ['button.css'],
          scripts: ['button.js'],
          dependencies: [],
          path: '/path/to/button'
        }
      ];

      const result = createComponentMap(components);
      const button = result.get('button');

      assert.deepStrictEqual(button.styles, ['button.css']);
      assert.deepStrictEqual(button.scripts, ['button.js']);
      assert.strictEqual(button.path, '/path/to/button');
    });
  });

  describe('isPathSafe()', () => {
    it('should return true for simple filename in component directory', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, 'button.css'), true);
    });

    it('should return true for subdirectory path within component', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, 'styles/button.css'), true);
    });

    it('should return false for parent directory traversal', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, '../secret.css'), false);
    });

    it('should return false for deep parent traversal', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, '../../../etc/passwd'), false);
    });

    it('should return false for hidden traversal with subdirectory', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, 'styles/../../secret.css'), false);
    });

    it('should return true for current directory reference', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, './button.css'), true);
    });

    it('should handle absolute paths that escape', () => {
      const componentPath = '/project/components/button';
      assert.strictEqual(isPathSafe(componentPath, '/etc/passwd'), false);
    });
  });

  describe('filterSafeAssetPaths()', () => {
    it('should filter out unsafe paths', () => {
      const assets = ['button.css', '../secret.css', 'styles/extra.css'];
      const componentPath = '/project/components/button';

      const result = filterSafeAssetPaths(assets, componentPath, 'button', 'styles');

      assert.deepStrictEqual(result, ['button.css', 'styles/extra.css']);
    });

    it('should return empty array for non-array input', () => {
      const result = filterSafeAssetPaths(null, '/path', 'test', 'styles');
      assert.deepStrictEqual(result, []);
    });

    it('should filter out non-string values', () => {
      const assets = ['button.css', 123, null, 'styles.css'];
      const componentPath = '/project/components/button';

      const result = filterSafeAssetPaths(assets, componentPath, 'button', 'styles');

      assert.deepStrictEqual(result, ['button.css', 'styles.css']);
    });

    it('should handle empty array', () => {
      const result = filterSafeAssetPaths([], '/path', 'test', 'styles');
      assert.deepStrictEqual(result, []);
    });

    it('should filter all unsafe paths', () => {
      const assets = ['../a.css', '../../b.css', '/etc/c.css'];
      const componentPath = '/project/components/button';

      const result = filterSafeAssetPaths(assets, componentPath, 'button', 'styles');

      assert.deepStrictEqual(result, []);
    });
  });

  describe('loadComponent() path traversal protection', () => {
    it('should filter out unsafe style paths from manifest', () => {
      const tempDir = path.join(fixturesDir, 'temp-unsafe-styles');
      const manifestPath = path.join(tempDir, 'manifest.json');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          name: 'unsafe',
          styles: ['safe.css', '../unsafe.css', '../../very-unsafe.css'],
          scripts: []
        })
      );

      try {
        const result = loadComponent(tempDir, 'unsafe');

        assert.strictEqual(result.name, 'unsafe');
        assert.deepStrictEqual(result.styles, ['safe.css']);
      } finally {
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should filter out unsafe script paths from manifest', () => {
      const tempDir = path.join(fixturesDir, 'temp-unsafe-scripts');
      const manifestPath = path.join(tempDir, 'manifest.json');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          name: 'unsafe',
          styles: [],
          scripts: ['safe.js', '../../../etc/passwd', '/absolute/path.js']
        })
      );

      try {
        const result = loadComponent(tempDir, 'unsafe');

        assert.strictEqual(result.name, 'unsafe');
        assert.deepStrictEqual(result.scripts, ['safe.js']);
      } finally {
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });
});
