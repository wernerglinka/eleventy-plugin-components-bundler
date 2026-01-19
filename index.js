/**
 * Eleventy Bundled Components Plugin
 *
 * Enables component-based architecture with tree-shaken CSS/JS bundling.
 * Components live in self-contained folders with optional manifests.
 * Only CSS/JS for actually-used components gets bundled.
 *
 * Debug mode: Set DEBUG=Eleventy:bundled-components to see detailed output
 *
 * @example
 * import bundledComponents from 'eleventy-bundled-components';
 *
 * export default function(eleventyConfig) {
 *   eleventyConfig.addPlugin(bundledComponents, {
 *     basePath: 'src/_includes/components/_partials',
 *     sectionsPath: 'src/_includes/components/sections',
 *     cssDest: 'assets/main.css',
 *     jsDest: 'assets/main.js'
 *   });
 * }
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import createDebug from 'debug';

import { normalizeOptions } from './lib/options.js';
import { collectComponents, createComponentMap } from './lib/component-discovery.js';
import { detectUsedComponents } from './lib/template-parser.js';
import { resolveAllDependencies, filterNeededComponents } from './lib/dependency-resolver.js';
import { validateRequirements } from './lib/requirement-validator.js';
import { bundleWithESBuild } from './lib/esbuild-processor.js';

// Create debug instance - enable with DEBUG=Eleventy:bundled-components
const debug = createDebug('Eleventy:bundled-components');

/**
 * Eleventy plugin for bundled components
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig - Eleventy configuration object
 * @param {Object} pluginOptions - Plugin options
 */
export default function bundledComponentsPlugin(eleventyConfig, pluginOptions = {}) {
  // Check Eleventy version compatibility
  try {
    eleventyConfig.versionCheck('>=2.0');
  } catch (e) {
    console.warn(`[bundled-components] Requires Eleventy 2.0 or newer. You have ${e.message}`);
  }

  // Normalize options once at registration time
  const options = normalizeOptions(pluginOptions);
  debug('Running with options: %O', options);

  // Cache for component data (populated in eleventy.before, used in eleventy.after)
  let componentCache = null;

  /**
   * Before build: Discover components, detect usage, resolve dependencies
   */
  eleventyConfig.on('eleventy.before', async ({ directories }) => {
    const projectRoot = process.cwd();

    // Resolve paths relative to project root
    const basePath = path.resolve(projectRoot, options.basePath);
    const sectionsPath = path.resolve(projectRoot, options.sectionsPath);
    const layoutsPath = path.resolve(projectRoot, options.layoutsPath);
    const inputDir = path.resolve(projectRoot, directories.input);

    debug('Partials path: %s', basePath);
    debug('Sections path: %s', sectionsPath);
    debug('Layouts path: %s', layoutsPath);
    debug('Input directory: %s', inputDir);

    // 1. Discover all available components
    const baseComponents = collectComponents(basePath);
    const sectionComponents = collectComponents(sectionsPath);
    const allComponents = [...baseComponents, ...sectionComponents];

    debug(
      'Found all partials: %O',
      baseComponents.map((c) => c.name)
    );
    debug(
      'Found all sections: %O',
      sectionComponents.map((c) => c.name)
    );

    // Check if we have any components to process
    if (allComponents.length === 0) {
      debug('No components found in configured paths');
      componentCache = null;
      return;
    }

    // Create component map for O(1) lookups
    const componentMap = createComponentMap(allComponents);
    debug('Component map created with %d available components', componentMap.size);

    // 2. Detect used components from templates
    // Derive component directory markers from configured paths (e.g., '_partials', 'sections')
    const componentDirs = [path.basename(options.basePath), path.basename(options.sectionsPath)];
    const usedComponents = await detectUsedComponents(inputDir, layoutsPath, componentDirs);

    debug('Components used in templates: %O', [...usedComponents]);

    if (usedComponents.size === 0) {
      debug('No components used in templates');
      componentCache = null;
      return;
    }

    // 3. Resolve transitive dependencies
    const neededComponents = resolveAllDependencies(usedComponents, componentMap);
    debug('Components needed (including dependencies): %O', [...neededComponents]);

    // 4. Validate that all required components exist
    try {
      validateRequirements(neededComponents, componentMap);
    } catch (error) {
      console.error(`[bundled-components] ${error.message}`);
      if (options.validation.strict) {
        throw error;
      }
    }

    // Filter to only needed components
    const filteredBaseComponents = filterNeededComponents(baseComponents, neededComponents);
    const filteredSectionComponents = filterNeededComponents(sectionComponents, neededComponents);

    debug(
      'Filtered partials to bundle: %O',
      filteredBaseComponents.map((c) => c.name)
    );
    debug(
      'Filtered sections to bundle: %O',
      filteredSectionComponents.map((c) => c.name)
    );
    debug('Found %d components to bundle', neededComponents.size);

    // Cache filtered components for eleventy.after
    componentCache = {
      baseComponents: filteredBaseComponents,
      sectionComponents: filteredSectionComponents,
      componentMap,
      projectRoot
    };
  });

  /**
   * After build: Bundle CSS/JS and write to output directory
   */
  eleventyConfig.on('eleventy.after', async ({ directories }) => {
    // Skip if no components were found
    if (!componentCache) {
      return;
    }

    const { baseComponents, sectionComponents, projectRoot } = componentCache;
    const outputDir = path.resolve(projectRoot, directories.output);

    debug('Starting bundling process...');
    debug('Output directory: %s', outputDir);

    // Bundle with esbuild
    const bundled = await bundleWithESBuild(baseComponents, sectionComponents, projectRoot, options);

    debug('Bundled assets completed: %O', {
      cssSize: bundled.css ? bundled.css.length : 0,
      jsSize: bundled.js ? bundled.js.length : 0
    });

    // Write bundled CSS
    if (bundled.css) {
      const cssPath = path.join(outputDir, options.cssDest);
      await mkdir(path.dirname(cssPath), { recursive: true });
      await writeFile(cssPath, bundled.css);
      debug('Wrote CSS to %s (%d bytes)', options.cssDest, bundled.css.length);
    }

    // Write bundled JS
    if (bundled.js) {
      const jsPath = path.join(outputDir, options.jsDest);
      await mkdir(path.dirname(jsPath), { recursive: true });
      await writeFile(jsPath, bundled.js);
      debug('Wrote JS to %s (%d bytes)', options.jsDest, bundled.js.length);
    }

    // Clear cache after build
    componentCache = null;
  });

  // Watch component directories for changes
  eleventyConfig.addWatchTarget(options.basePath);
  eleventyConfig.addWatchTarget(options.sectionsPath);
}
