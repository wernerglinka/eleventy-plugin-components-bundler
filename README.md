# eleventy-plugin-bundled-components

> **Early Development Notice:** This plugin is under active development. The API may change before reaching v1.0.0. Please report issues and feedback on [GitHub](https://github.com/wernerglinka/eleventy-plugin-bundled-components/issues).

An Eleventy plugin that automatically discovers and bundles CSS and JavaScript files from component-based architectures using esbuild

[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![coverage][coverage-badge]][coverage-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/eleventy-plugin-bundled-components/badge.svg)](https://snyk.io/test/npm/eleventy-plugin-bundled-components)
[![AI-assisted development](https://img.shields.io/badge/AI-assisted-blue)](https://github.com/wernerglinka/eleventy-plugin-bundled-components/blob/main/CLAUDE.md)

## Features

- **Automatic component discovery** - Scans directories for components and their assets
- **Requirement validation** - Validates that component requirements exist (no complex dependency ordering)
- **esbuild-powered bundling** - Modern, fast bundling with tree shaking and minification
- **CSS @import resolution** - Automatically resolves @import statements in main CSS files
- **Complete minification** - All CSS and JS (main + components) properly minified in production
- **Main entry points** - Bundle your main CSS/JS files alongside components
- **PostCSS integration** - PostCSS support via esbuild plugins
- **Simple, predictable ordering** - Main entries -> base components -> sections (filesystem order)
- **Component validation** - Validates component properties to prevent silent failures
- **Tree shaking** - Removes unused code for smaller bundles
- **Convention over configuration** - Sensible defaults with minimal required setup
- **Template parsing** - Automatically detects components from Nunjucks includes and frontmatter sections
- **Debug mode** - Detailed logging via the `debug` package for troubleshooting

## Installation

```bash
npm install eleventy-plugin-bundled-components
```

## Usage

Add `eleventy-plugin-bundled-components` to your Eleventy configuration:

### Basic Usage

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents);

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

### With Custom Component Paths

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    basePath: 'src/_includes/components/_partials',
    sectionsPath: 'src/_includes/components/sections',
    cssDest: 'assets/bundle.css',
    jsDest: 'assets/bundle.js'
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

### With Main Entry Points

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    // Bundle main app files along with components
    mainCSSEntry: 'src/assets/main.css',
    mainJSEntry: 'src/assets/main.js',
    // Component paths
    basePath: 'src/_includes/components/_partials',
    sectionsPath: 'src/_includes/components/sections'
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

### Real-World Example with PostCSS Processing

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    basePath: 'src/_includes/components/_partials',
    sectionsPath: 'src/_includes/components/sections',
    postcss: {
      enabled: true,
      plugins: [autoprefixer(), cssnano({ preset: 'default' })],
      options: {
        // Additional PostCSS options if needed
      }
    }
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

This configuration:

1. Uses the component paths in the `src/_includes` directory structure
2. Enables PostCSS processing
3. Applies autoprefixer to add vendor prefixes for better browser compatibility
4. Minifies the CSS output using cssnano with default settings

The resulting bundled CSS will be properly ordered by dependencies, prefixed for browser compatibility, and minified for production use.

### Options

| Option         | Description                                              | Type      | Default                                                   |
| -------------- | -------------------------------------------------------- | --------- | --------------------------------------------------------- |
| `basePath`     | Path to base/atomic components directory                 | `String`  | `'src/_includes/components/_partials'`                    |
| `sectionsPath` | Path to section/composite components directory           | `String`  | `'src/_includes/components/sections'`                     |
| `layoutsPath`  | Path to layouts directory for scanning template includes | `String`  | `'src/_includes/layouts'`                                 |
| `cssDest`      | Destination path for bundled CSS                         | `String`  | `'assets/main.css'`                                       |
| `jsDest`       | Destination path for bundled JavaScript                  | `String`  | `'assets/main.js'`                                        |
| `mainCSSEntry` | Main CSS entry point (design tokens, base styles)        | `String`  | `null`                                                    |
| `mainJSEntry`  | Main JS entry point (app initialization code)            | `String`  | `null`                                                    |
| `minifyOutput` | Enable esbuild minification for production builds        | `Boolean` | `false`                                                   |
| `postcss`      | PostCSS configuration (enabled, plugins, options)        | `Object`  | `{ enabled: false, plugins: [], options: {} }`            |
| `validation`   | Section validation configuration                         | `Object`  | `{ enabled: true, strict: false, reportAllErrors: true }` |

## Component Structure

The plugin expects components to be organized in a specific structure:

```
src/
└─ _includes/
   ├─ components/
   │  ├─ _partials/          # Atomic/base components
   │  │  ├─ button/
   │  │  │  ├─ button.njk
   │  │  │  ├─ button.css
   │  │  │  ├─ button.js
   │  │  │  └─ manifest.json (optional)
   │  │  └─ image/
   │  │     ├─ image.njk
   │  │     └─ image.css
   │  └─ sections/           # Composite components
   │      ├─ banner/
   │      │   ├─ banner.njk
   │      │   ├─ banner.css
   │      │   ├─ banner.js
   │      │   └─ manifest.json
   │      └─ media/
   │          ├─ media.njk
   │          ├─ media.css
   │          └─ manifest.json
   └─ layouts/
      ├─ base.njk
      └─ page.njk
```

### Component Manifest

Each component can include an optional `manifest.json` file:

```json
{
  "name": "banner",
  "type": "section",
  "description": "banner section with background image",
  "styles": ["banner.css", "banner-responsive.css"],
  "scripts": ["banner.js"],
  "requires": ["button", "image"]
}
```

If no manifest file is present, the plugin will auto-generate one based on the component name:

- It will look for `<component-name>.css` and `<component-name>.js` files
- Requirements must be explicitly defined in a manifest file if component depends on others

## Template Detection

The plugin automatically detects components used in your templates through:

### Nunjucks Includes

```njk
{% include "components/sections/banner/banner.njk" %}
{% include "components/_partials/button/button.njk" %}
```

### Nunjucks Imports (Macros)

```njk
{% from "components/_partials/button/button.njk" import button %}
```

### Frontmatter Sections

```yaml
---
title: My Page
sections:
  - sectionType: banner
    title: Welcome
  - sectionType: media
    image: /images/hero.jpg
---
```

The plugin scans your templates, layouts, and frontmatter to build a complete dependency graph, ensuring only the CSS and JavaScript needed for each page is bundled.

## Section Validation

The plugin includes validation capabilities to catch common configuration errors in your frontmatter/YAML that would otherwise result in "silent failures" - where the site builds successfully but renders incorrectly.

### Common Problems Solved

- **Type coercion issues**: `isAnimated: "false"` (string) always evaluates to `true` in templates
- **Invalid enum values**: `buttonStyle: "blue"` when CSS only supports `primary`, `secondary`, `ghost`
- **Misspelled properties**: `titleTag: "header"` instead of valid HTML heading tags

### Manifest with Validation Rules

Add a `validation` object to your component's `manifest.json`:

```json
{
  "name": "hero",
  "type": "section",
  "styles": ["hero.css"],
  "scripts": [],
  "requires": ["button", "image"],
  "validation": {
    "required": ["sectionType"],
    "properties": {
      "sectionType": {
        "type": "string",
        "const": "hero"
      },
      "isReverse": {
        "type": "boolean"
      },
      "containerFields.isAnimated": {
        "type": "boolean"
      },
      "containerFields.background.imageScreen": {
        "type": "string",
        "enum": ["light", "dark", "none"]
      },
      "text.titleTag": {
        "type": "string",
        "enum": ["h1", "h2", "h3", "h4", "h5", "h6"]
      },
      "ctas": {
        "type": "array",
        "items": {
          "properties": {
            "isButton": {
              "type": "boolean"
            },
            "buttonStyle": {
              "type": "string",
              "enum": ["primary", "secondary", "ghost", "none"]
            }
          }
        }
      }
    }
  }
}
```

### Validation Features

**Type Validation**: Ensure fields are actual booleans, strings, numbers, or arrays - not string representations.

**Enum Validation**: Restrict values to predefined options (e.g., `titleTag: ["h1", "h2", "h3"]`).

**Nested Properties**: Use dot notation for nested validation (`containerFields.isAnimated`).

**Array Items**: Validate properties within array elements.

**Helpful Error Messages**: Get error messages with file context and helpful tips.

### Error Message Example

```
Section Validation Errors:

Section 0 (hero) in src/index.md:
  - containerFields.isAnimated: expected boolean, got string "false"
  - text.titleTag: "header" is invalid. Must be one of: h1, h2, h3, h4, h5, h6
  - ctas[0].buttonStyle: "blue" is invalid. Must be one of: primary, secondary, ghost, none

Tip: String "false" evaluates to true in templates. Use boolean false instead.
```

### Validation Configuration

Configure validation behavior in plugin options:

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    validation: {
      enabled: true, // Enable/disable validation
      strict: false, // Fail build on errors vs warnings only
      reportAllErrors: true // Report all errors vs stop on first
    }
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

## Debug Mode

The plugin uses the [`debug`](https://www.npmjs.com/package/debug) package for detailed logging, which is the same debugging mechanism Eleventy uses internally. Debug output is silent by default and can be enabled using the `DEBUG` environment variable.

### Enabling Debug Output

```bash
# Just this plugin
DEBUG=Eleventy:bundled-components npx @11ty/eleventy

# All Eleventy debugging (including this plugin)
DEBUG=Eleventy* npx @11ty/eleventy

# Everything (very verbose)
DEBUG=* npx @11ty/eleventy
```

### Cross-Platform Usage

For cross-platform compatibility, use the `cross-env` package:

```json
{
  "scripts": {
    "build": "npx @11ty/eleventy",
    "build:debug": "cross-env DEBUG=Eleventy:bundled-components npx @11ty/eleventy"
  }
}
```

### Debug Output Includes

When debug mode is enabled, you'll see detailed information about:

- Plugin options configuration
- Paths being used (partials, sections, layouts, input directory)
- Components discovered in each directory
- Components detected in templates
- Components needed after dependency resolution
- Filtered components to bundle
- Bundling progress
- Output file sizes in bytes

### Example Debug Output

```
Eleventy:bundled-components Running with options: { basePath: '...', sectionsPath: '...', ... }
Eleventy:bundled-components Partials path: /project/src/_includes/components/_partials
Eleventy:bundled-components Sections path: /project/src/_includes/components/sections
Eleventy:bundled-components Found all partials: [ 'button', 'image', 'icon' ]
Eleventy:bundled-components Found all sections: [ 'banner', 'hero', 'media' ]
Eleventy:bundled-components Components used in templates: [ 'banner', 'hero' ]
Eleventy:bundled-components Components needed (including dependencies): [ 'banner', 'hero', 'button', 'image' ]
Eleventy:bundled-components Found 4 components to bundle
Eleventy:bundled-components Starting bundling process...
Eleventy:bundled-components Wrote CSS to assets/main.css (4523 bytes)
Eleventy:bundled-components Wrote JS to assets/main.js (1892 bytes)
```

## Additional PostCSS Examples

### Adding Custom Media Queries Support

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssCustomMedia from 'postcss-custom-media';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    postcss: {
      enabled: true,
      plugins: [postcssCustomMedia(), autoprefixer(), cssnano({ preset: 'default' })]
    }
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

### Adding Nested Rules Support

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';
import postcssNested from 'postcss-nested';
import autoprefixer from 'autoprefixer';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    postcss: {
      enabled: true,
      plugins: [postcssNested(), autoprefixer()]
    }
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

## CSS Processing & @import Resolution

The plugin provides CSS processing with automatic @import resolution:

### How CSS Processing Works

1. **Concatenation**: Main CSS entry + all component CSS files are combined
2. **Temp Directory Setup**: Combined CSS and @import dependencies copied to temporary directory
3. **@import Resolution**: esbuild processes the combined CSS to resolve all @import statements
4. **Minification**: When `minifyOutput: true`, all CSS (main + components) is minified together
5. **Output**: Final processed CSS written to build directory
6. **Cleanup**: Temporary files automatically cleaned up

### @import Support

Your main CSS file can use @import statements with the following supported directory structure:

```css
/* main.css */
@import './styles/_design-tokens.css';
@import './styles/_base.css';
@import './_utilities.css'; /* Files in same directory */

/* Your main application styles */
body {
  font-family: var(--font-primary);
  line-height: var(--line-height);
}
```

**Expected Directory Structure:**

```
src/assets/
├── main.css               /* Main CSS entry point */
├── _utilities.css         /* CSS files in same directory */
└── styles/                /* Subdirectory for @imports */
    ├── _design-tokens.css
    ├── _base.css
    └── _components.css
```

The plugin automatically:

- **Copies imported files** to temp directory preserving relative paths
- **Resolves @import statements** using esbuild bundling
- **Combines with component CSS** for a single output file
- **Applies minification** to the entire combined CSS when enabled

### Production Minification

When `minifyOutput: true` is set:

```js
// eleventy.config.js
import bundledComponents from 'eleventy-plugin-bundled-components';

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(bundledComponents, {
    mainCSSEntry: 'src/assets/main.css',
    minifyOutput: process.env.NODE_ENV === 'production'
  });

  return {
    dir: {
      input: 'src',
      output: '_site'
    }
  };
}
```

**Result**: All CSS (main entry + imported files + component styles) is fully minified into a single optimized file.

## Development

### Scripts

```bash
npm test              # Run all tests with coverage
npm run test:unit     # Run unit tests only
npm run coverage      # Generate detailed coverage report
npm run lint          # Lint and auto-fix code
npm run lint:check    # Check linting without fixing
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without fixing
npm run prerelease    # Run lint, format, and tests (pre-release check)
```

### Code Quality

This project uses ESLint and Prettier to maintain code quality:

- **ESLint**: Enforces code quality rules including `prefer-const`, `no-var`, strict equality, and complexity limits
- **Prettier**: Ensures consistent code formatting (single quotes, no trailing commas, 120 char line width)

Run `npm run prerelease` before committing to ensure your code passes all checks.

## Test Coverage

This plugin is tested using mocha with c8 for code coverage. Current coverage: 96%.

## License

MIT

## Development Transparency

Portions of this project were developed with the assistance of AI tools including Claude and Claude Code. These tools were used to:

- Generate or refactor code
- Assist with documentation
- Troubleshoot bugs and explore alternative approaches

All AI-assisted code has been reviewed and tested to ensure it meets project standards. See the included [CLAUDE.md](CLAUDE.md) file for more details.

[npm-badge]: https://img.shields.io/npm/v/eleventy-plugin-bundled-components.svg
[npm-url]: https://www.npmjs.com/package/eleventy-plugin-bundled-components
[license-badge]: https://img.shields.io/github/license/wernerglinka/eleventy-plugin-bundled-components
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-96%25-brightgreen
[coverage-url]: #test-coverage
