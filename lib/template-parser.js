/**
 * Template Parser - Detects component imports in Nunjucks templates
 *
 * Parses Nunjucks template files to detect which components are actually used
 * via {% from "..." import ... %} statements and frontmatter sections.
 * This enables tree-shaking of unused components for optimal bundle sizes.
 */

import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

/**
 * Regular expression to match Nunjucks import statements
 * Matches: {% from "components/_partials/button/button.njk" import button %}
 * Also matches compact syntax: {%from"path"import name%}
 * Captures: The full path to the component template
 */
const IMPORT_PATTERN = /\{%\s*from\s*["']([^"']+)["']\s*import\s+[^%]+\s*%\}/g;

/**
 * Regular expression to match Nunjucks include statements
 * Matches: {% include "components/sections/header/header.njk" %}
 * Also matches compact syntax: {%include"path"%}
 * Captures: The full path to the included template
 */
const INCLUDE_PATTERN = /\{%\s*include\s*["']([^"']+)["']\s*%\}/g;

/**
 * Extract component name from a Nunjucks import path
 *
 * Examples:
 *   "components/_partials/button/button.njk" → "button"
 *   "components/sections/hero/hero.njk" → "hero"
 *   "_partials/ctas/ctas.njk" → "ctas"
 *
 * @param {string} importPath - The path from the {% from "..." %} statement
 * @param {string[]} componentDirs - Component directory names to look for (_partials, sections)
 * @returns {string|null} - Component name or null if not a component import
 */
function extractComponentName(importPath, componentDirs) {
  // Split path into segments
  const segments = importPath.split('/');

  // Look for component directory markers (_partials, sections, etc.)
  for (let i = 0; i < segments.length; i++) {
    if (componentDirs.includes(segments[i])) {
      // Component name is the next segment after the directory marker
      if (i + 1 < segments.length) {
        return segments[i + 1];
      }
    }
  }

  return null;
}

/**
 * Parse a single template file for component imports
 *
 * @param {string} fileContent - Template file contents as string
 * @param {string[]} componentDirs - Component directory names (_partials, sections)
 * @returns {Set<string>} - Set of component names imported in this file
 */
function parseTemplateFile(fileContent, componentDirs) {
  const importedComponents = new Set();
  let match;

  // Check {% from "..." import ... %} statements
  IMPORT_PATTERN.lastIndex = 0;
  while ((match = IMPORT_PATTERN.exec(fileContent)) !== null) {
    const importPath = match[1];
    const componentName = extractComponentName(importPath, componentDirs);

    if (componentName) {
      importedComponents.add(componentName);
    }
  }

  // Check {% include "..." %} statements
  INCLUDE_PATTERN.lastIndex = 0;
  while ((match = INCLUDE_PATTERN.exec(fileContent)) !== null) {
    const includePath = match[1];
    const componentName = extractComponentName(includePath, componentDirs);

    if (componentName) {
      importedComponents.add(componentName);
    }
  }

  return importedComponents;
}

/**
 * Detect all used components across all template files in the Eleventy input directory
 *
 * Scans template files for:
 * 1. Components in frontmatter sections array (component-driven approach)
 * 2. Component imports in Nunjucks {% from "..." import ... %} statements
 * 3. Components in layout files via {% include "..." %} and {% from "..." import ... %}
 *
 * @param {string} inputDir - Eleventy input directory path
 * @param {string} layoutDir - Path to layouts directory for scanning
 * @param {string[]} componentDirs - Component directory names (e.g., ['_partials', 'sections'])
 * @returns {Promise<Set<string>>} - Set of all component names used in templates
 */
async function detectUsedComponents(inputDir, layoutDir, componentDirs) {
  const allUsedComponents = new Set();

  // Find all template files in the input directory
  const templateFiles = await glob('**/*.{njk,md,html}', {
    cwd: inputDir,
    ignore: ['node_modules/**', '_site/**']
  });

  // Process each template file in parallel
  const processFile = async (filepath) => {
    const fullPath = path.join(inputDir, filepath);

    try {
      const content = await readFile(fullPath, 'utf8');
      const { data: frontmatter, content: templateContent } = matter(content);
      const components = new Set();

      // Check frontmatter for sections array (component-driven approach)
      if (frontmatter.sections && Array.isArray(frontmatter.sections)) {
        frontmatter.sections.forEach((section) => {
          if (section && typeof section === 'object' && section.sectionType) {
            components.add(section.sectionType);
          }
        });
      }

      // Parse Nunjucks imports and includes in the template content
      const fileComponents = parseTemplateFile(templateContent, componentDirs);
      fileComponents.forEach((component) => components.add(component));

      return components;
    } catch (error) {
      console.warn(`Warning: Could not read template file ${fullPath}: ${error.message}`);
      return new Set();
    }
  };

  // Process all files in parallel and merge results
  const results = await Promise.all(templateFiles.map(processFile));
  results.forEach((components) => {
    components.forEach((component) => allUsedComponents.add(component));
  });

  // Also scan layout files if layoutDir is provided
  if (layoutDir && fs.existsSync(layoutDir)) {
    const layoutComponents = scanLayoutFiles(layoutDir, componentDirs);
    layoutComponents.forEach((component) => allUsedComponents.add(component));
  }

  return allUsedComponents;
}

/**
 * Recursively scan layout directory for .njk template files and detect components
 * @param {string} layoutDir - Path to the layout directory
 * @param {string[]} componentDirs - Component directory names (_partials, sections)
 * @returns {Set<string>} - Set of component names found in layout files
 */
function scanLayoutFiles(layoutDir, componentDirs) {
  const components = new Set();

  // Check if directory exists
  if (!fs.existsSync(layoutDir)) {
    return components;
  }

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.njk')) {
        // Parse .njk template files
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileComponents = parseTemplateFile(content, componentDirs);
          fileComponents.forEach((comp) => components.add(comp));
        } catch {
          // Silently skip files that can't be read
        }
      }
    }
  }

  scanDirectory(layoutDir);
  return components;
}

export { detectUsedComponents, parseTemplateFile, extractComponentName, scanLayoutFiles };
