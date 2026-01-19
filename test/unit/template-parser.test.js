import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractComponentName,
  parseTemplateFile,
  detectUsedComponents,
  scanLayoutFiles
} from '../../lib/template-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Template Parser', () => {
  describe('extractComponentName()', () => {
    it('should extract component name from _partials path', () => {
      const result = extractComponentName('components/_partials/button/button.njk', ['_partials', 'sections']);
      assert.strictEqual(result, 'button');
    });

    it('should extract component name from sections path', () => {
      const result = extractComponentName('components/sections/hero/hero.njk', ['_partials', 'sections']);
      assert.strictEqual(result, 'hero');
    });

    it('should extract component name from path without components prefix', () => {
      const result = extractComponentName('_partials/ctas/ctas.njk', ['_partials', 'sections']);
      assert.strictEqual(result, 'ctas');
    });

    it('should return null for non-component paths', () => {
      const result = extractComponentName('templates/page.njk', ['_partials', 'sections']);
      assert.strictEqual(result, null);
    });

    it('should handle deeply nested component paths', () => {
      const result = extractComponentName('lib/layouts/components/_partials/button/button.njk', [
        '_partials',
        'sections'
      ]);
      assert.strictEqual(result, 'button');
    });

    it('should return null when component dir marker is at the end', () => {
      const result = extractComponentName('components/_partials', ['_partials', 'sections']);
      assert.strictEqual(result, null);
    });
  });

  describe('parseTemplateFile()', () => {
    it('should parse single component import', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should parse multiple component imports', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
        {% from "components/sections/hero/hero.njk" import hero %}
        {% from "components/_partials/icon/icon.njk" import icon %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result].sort(), ['button', 'hero', 'icon'].sort());
    });

    it('should handle single quotes', () => {
      const template = `
        {% from 'components/_partials/button/button.njk' import button %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should handle multiple imports from same component', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button, iconButton %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should deduplicate same component imported multiple times', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
        {% from "components/_partials/button/button.njk" import iconButton %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should ignore non-component imports', () => {
      const template = `
        {% from "templates/macros.njk" import something %}
        {% from "components/_partials/button/button.njk" import button %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should handle templates with no imports', () => {
      const template = `
        <html>
          <body>No imports here</body>
        </html>
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], []);
    });

    it('should handle compact import syntax (no spaces)', () => {
      const template = `{%from"components/_partials/button/button.njk"import button%}`;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should handle imports with extra whitespace', () => {
      const template = `
        {%   from   "components/_partials/button/button.njk"   import   button   %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['button']);
    });

    it('should parse include statements', () => {
      const template = `
        {% include "components/sections/header/header.njk" %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['header']);
    });

    it('should parse both import and include statements', () => {
      const template = `
        {% from "components/_partials/button/button.njk" import button %}
        {% include "components/sections/header/header.njk" %}
      `;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result].sort(), ['button', 'header'].sort());
    });

    it('should handle compact include syntax', () => {
      const template = `{%include"components/sections/hero/hero.njk"%}`;
      const result = parseTemplateFile(template, ['_partials', 'sections']);
      assert.deepStrictEqual([...result], ['hero']);
    });
  });

  describe('detectUsedComponents()', () => {
    it('should detect components from frontmatter sections array', async () => {
      const inputDir = path.join(fixturesDir, 'default/src');
      const layoutDir = path.join(fixturesDir, 'default/src/_includes/layouts');
      const result = await detectUsedComponents(inputDir, layoutDir, ['_partials', 'sections']);

      assert(result instanceof Set);
      assert(result.has('banner'));
    });

    it('should detect components from layout includes', async () => {
      const inputDir = path.join(fixturesDir, 'default/src');
      const layoutDir = path.join(fixturesDir, 'default/src/_includes/layouts');
      const result = await detectUsedComponents(inputDir, layoutDir, ['_partials', 'sections']);

      // Layout includes banner component
      assert(result.has('banner'));
    });

    it('should return empty set when no components are used', async () => {
      const tempDir = path.join(fixturesDir, 'temp-no-components');
      const tempFile = path.join(tempDir, 'index.njk');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(tempFile, '<html><body>No components</body></html>');

      try {
        const result = await detectUsedComponents(tempDir, null, ['_partials', 'sections']);
        assert(result instanceof Set);
        assert.strictEqual(result.size, 0);
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should handle markdown files with frontmatter', async () => {
      const tempDir = path.join(fixturesDir, 'temp-md-frontmatter');
      const tempFile = path.join(tempDir, 'index.md');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(
        tempFile,
        `---
title: Test
sections:
  - sectionType: hero
  - sectionType: banner
---

# Test Content
`
      );

      try {
        const result = await detectUsedComponents(tempDir, null, ['_partials', 'sections']);
        assert(result.has('hero'));
        assert(result.has('banner'));
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should ignore sections without sectionType', async () => {
      const tempDir = path.join(fixturesDir, 'temp-no-sectiontype');
      const tempFile = path.join(tempDir, 'index.md');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(
        tempFile,
        `---
sections:
  - title: No Type
  - sectionType: hero
---

Content
`
      );

      try {
        const result = await detectUsedComponents(tempDir, null, ['_partials', 'sections']);
        assert.strictEqual(result.size, 1);
        assert(result.has('hero'));
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

  describe('scanLayoutFiles()', () => {
    it('should scan layout files for component includes', () => {
      const layoutDir = path.join(fixturesDir, 'default/src/_includes/layouts');
      const result = scanLayoutFiles(layoutDir, ['_partials', 'sections']);

      assert(result instanceof Set);
      assert(result.has('banner'));
    });

    it('should return empty set for non-existent directory', () => {
      const result = scanLayoutFiles('/non/existent/path', ['_partials', 'sections']);
      assert(result instanceof Set);
      assert.strictEqual(result.size, 0);
    });

    it('should recursively scan subdirectories', () => {
      const tempDir = path.join(fixturesDir, 'temp-nested-layouts');
      const subDir = path.join(tempDir, 'nested');
      const layoutFile = path.join(subDir, 'layout.njk');

      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      fs.writeFileSync(layoutFile, '{% from "components/_partials/button/button.njk" import button %}');

      try {
        const result = scanLayoutFiles(tempDir, ['_partials', 'sections']);
        assert(result.has('button'));
      } finally {
        if (fs.existsSync(layoutFile)) {
          fs.unlinkSync(layoutFile);
        }
        if (fs.existsSync(subDir)) {
          fs.rmdirSync(subDir);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });

    it('should only process .njk files', () => {
      const tempDir = path.join(fixturesDir, 'temp-mixed-files');
      const njkFile = path.join(tempDir, 'layout.njk');
      const txtFile = path.join(tempDir, 'readme.txt');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.writeFileSync(njkFile, '{% from "components/_partials/button/button.njk" import button %}');
      fs.writeFileSync(txtFile, '{% from "components/_partials/icon/icon.njk" import icon %}');

      try {
        const result = scanLayoutFiles(tempDir, ['_partials', 'sections']);
        assert(result.has('button'));
        assert(!result.has('icon')); // Should not parse .txt file
      } finally {
        if (fs.existsSync(njkFile)) {
          fs.unlinkSync(njkFile);
        }
        if (fs.existsSync(txtFile)) {
          fs.unlinkSync(txtFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      }
    });
  });
});
