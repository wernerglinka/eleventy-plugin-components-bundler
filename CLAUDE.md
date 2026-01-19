# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Eleventy plugin (`eleventy-bundled-components`) that enables component-based architecture with tree-shaken CSS/JS bundling. Components live in self-contained folders with optional manifests. Only CSS/JS for actually-used components gets bundled into the final output.

## Commands

```bash
npm test                    # Run Mocha tests
npm test -- --grep "name"   # Run specific test by name
```

## Architecture

The plugin hooks into Eleventy's build lifecycle via two events:

1. **`eleventy.before`**: Discovers components, parses templates for usage, resolves dependencies
2. **`eleventy.after`**: Bundles CSS/JS with esbuild and writes output files

### Processing Pipeline

```
Templates → Template Parser → Used Components → Dependency Resolver → Needed Components → esbuild → Bundled Output
```

### Core Modules (`lib/`)

- **options.js**: Normalizes plugin configuration with defaults (paths, PostCSS config, validation settings)
- **component-discovery.js**: Scans component directories, loads manifests or auto-generates them from naming conventions (`{name}.css`, `{name}.js`)
- **template-parser.js**: Detects components via Nunjucks `{% from %}` imports, `{% include %}` statements, and frontmatter `sections` arrays with `sectionType` properties
- **dependency-resolver.js**: Resolves transitive dependencies using breadth-first traversal (supports both `requires` and legacy `dependencies` fields)
- **esbuild-processor.js**: Bundles CSS/JS using esbuild with optional PostCSS plugin support; outputs IIFE format for JS
- **validation.js**: Validates section data against component manifest schemas (type, const, enum constraints)
- **requirement-validator.js**: Validates that all required components exist in the component map

### Component Structure

Components are directories containing:

- `manifest.json` (optional): Declares `name`, `styles`, `scripts`, `requires`/`dependencies`
- `{name}.css` and `{name}.js`: Auto-discovered if no manifest exists
- `{name}.njk`: Nunjucks template (detected by template parser)

Components live in two locations (configurable):

- **Partials** (`_partials/`): Base components like buttons, cards
- **Sections** (`sections/`): Page sections like hero, banner

### Template Detection

The parser finds used components through:

1. Frontmatter sections array: `sections: [{ sectionType: "hero" }]`
2. Nunjucks imports: `{% from "components/_partials/button/button.njk" import button %}`
3. Nunjucks includes: `{% include "components/sections/header/header.njk" %}`

### Bundle Output

esbuild produces:

- Single CSS file (main entry + component styles, @imports resolved)
- Single JS file (IIFE format, tree-shaken, ES2020 target)

## Default Configuration

```javascript
{
  basePath: 'src/_includes/components/_partials',
  sectionsPath: 'src/_includes/components/sections',
  layoutsPath: 'src/_includes/layouts',
  cssDest: 'assets/main.css',
  jsDest: 'assets/main.js',
  mainCSSEntry: 'src/assets/main.css',
  mainJSEntry: 'src/assets/main.js',
  minifyOutput: false
}
```
