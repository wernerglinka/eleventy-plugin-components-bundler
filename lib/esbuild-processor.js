import fs from 'fs';
import path from 'path';
import os from 'os';
import { build } from 'esbuild';
import postcssPlugin from 'esbuild-plugin-postcss';

/**
 * @typedef {Object} BundledAssets
 * @property {string|null} css - Bundled CSS content or null if no CSS
 * @property {string|null} js - Bundled JavaScript content or null if no JS
 */

/**
 * Add main entry files to entry point sets if they exist
 * @param {Object} options - Plugin options
 * @param {string} projectRoot - Project root directory
 * @param {Set<string>} cssEntryPoints - Set to add CSS entry to
 * @param {Set<string>} jsEntryPoints - Set to add JS entry to
 */
function addMainEntries(options, projectRoot, cssEntryPoints, jsEntryPoints) {
  if (options.mainCSSEntry) {
    const mainCSSPath = path.resolve(projectRoot, options.mainCSSEntry);
    if (fs.existsSync(mainCSSPath)) {
      cssEntryPoints.add(mainCSSPath);
    }
  }

  if (options.mainJSEntry) {
    const mainJSPath = path.resolve(projectRoot, options.mainJSEntry);
    if (fs.existsSync(mainJSPath)) {
      jsEntryPoints.add(mainJSPath);
    }
  }
}

/**
 * Collect asset files from components
 * @param {Array} components - Component array
 * @param {Set<string>} cssEntryPoints - Set to add CSS files to
 * @param {Set<string>} jsEntryPoints - Set to add JS files to
 */
function collectComponentAssets(components, cssEntryPoints, jsEntryPoints) {
  components.forEach((component) => {
    component.styles.forEach((styleFile) => {
      const filePath = path.join(component.path, styleFile);
      if (fs.existsSync(filePath)) {
        cssEntryPoints.add(filePath);
      }
    });

    component.scripts.forEach((scriptFile) => {
      const filePath = path.join(component.path, scriptFile);
      if (fs.existsSync(filePath)) {
        jsEntryPoints.add(filePath);
      }
    });
  });
}

/**
 * Configure esbuild plugins based on options
 * @param {Object} options - Plugin options
 * @returns {Array} Array of esbuild plugins
 */
function configurePlugins(options) {
  const plugins = [];

  if (options.postcss && options.postcss.enabled) {
    plugins.push(
      postcssPlugin.default({
        plugins: options.postcss.plugins || [],
        ...(options.postcss.options || {})
      })
    );
  }

  return plugins;
}

/**
 * Copy CSS files for @import resolution
 * @param {string} mainCSSFile - Path to main CSS file
 * @param {string} tempDir - Temp directory path
 * @param {Array<string>} tempFiles - Array to track temp files
 */
function copyCSSImportFiles(mainCSSFile, tempDir, tempFiles) {
  const mainCSSDir = path.dirname(mainCSSFile);
  const assetsFiles = fs.readdirSync(mainCSSDir);

  assetsFiles.forEach((file) => {
    if (file.endsWith('.css') && file !== path.basename(mainCSSFile)) {
      fs.copyFileSync(path.join(mainCSSDir, file), path.join(tempDir, file));
      tempFiles.push(path.join(tempDir, file));
    }
  });

  // Copy styles subdirectory if it exists
  const stylesDir = path.join(mainCSSDir, 'styles');
  if (fs.existsSync(stylesDir)) {
    const tempStylesDir = path.join(tempDir, 'styles');
    fs.mkdirSync(tempStylesDir, { recursive: true });

    const styleFiles = fs.readdirSync(stylesDir);
    styleFiles.forEach((file) => {
      if (file.endsWith('.css')) {
        fs.copyFileSync(path.join(stylesDir, file), path.join(tempStylesDir, file));
        tempFiles.push(path.join(tempStylesDir, file));
      }
    });
  }
}

/**
 * Bundle CSS files using esbuild
 * @param {Set<string>} cssEntryPoints - CSS entry points
 * @param {string} tempDir - Temp directory path
 * @param {Array<string>} tempFiles - Array to track temp files
 * @param {Array} plugins - esbuild plugins
 * @param {Object} options - Plugin options
 * @returns {Promise<string|null>} Bundled CSS content or null
 * @throws {Error} If bundling fails and validation.strict is true
 */
async function bundleCSS(cssEntryPoints, tempDir, tempFiles, plugins, options) {
  if (cssEntryPoints.size === 0) {
    return null;
  }

  const isStrict = options.validation && options.validation.strict;

  try {
    const cssContents = [];

    for (const cssFile of cssEntryPoints) {
      if (fs.existsSync(cssFile)) {
        const content = fs.readFileSync(cssFile, 'utf8');
        cssContents.push(content);
      }
    }

    if (cssContents.length === 0) {
      return null;
    }

    const combinedCSS = cssContents.join('\n\n');
    const tempMainCSS = path.join(tempDir, 'main.css');
    fs.writeFileSync(tempMainCSS, combinedCSS);
    tempFiles.push(tempMainCSS);

    // Copy @import files from main CSS entry directory for resolution
    // This supports @import statements in main.css referencing sibling files (e.g., @import 'variables.css')
    // Component CSS files should be self-contained and not use @imports
    if (options.mainCSSEntry) {
      const mainCSSPath = path.resolve(options.projectRoot || process.cwd(), options.mainCSSEntry);
      if (fs.existsSync(mainCSSPath)) {
        copyCSSImportFiles(mainCSSPath, tempDir, tempFiles);
      }
    }

    const result = await build({
      entryPoints: [tempMainCSS],
      bundle: true,
      write: false,
      plugins,
      loader: { '.css': 'css' },
      minify: options.minifyOutput === true,
      logLevel: 'silent',
      absWorkingDir: tempDir
    });

    if (result.outputFiles && result.outputFiles.length > 0) {
      return result.outputFiles[0].text;
    }

    return null;
  } catch (error) {
    const errorMessage = `Error bundling CSS: ${error.message}`;
    console.error(errorMessage);

    if (isStrict) {
      throw new Error(errorMessage);
    }

    return null;
  }
}

/**
 * Create JS entry file content
 * @param {Array<string>} jsEntryArray - Array of JS file paths
 * @param {Object} options - Plugin options
 * @param {string} projectRoot - Project root directory
 * @returns {string} Entry file content
 */
function createJSEntryContent(jsEntryArray, options, projectRoot) {
  let mainEntryFile = null;
  const componentFiles = [];

  jsEntryArray.forEach((file, index) => {
    const isMainEntry = index === 0 && options.mainJSEntry && path.resolve(projectRoot, options.mainJSEntry) === file;

    if (isMainEntry) {
      mainEntryFile = file;
    } else {
      componentFiles.push(file);
    }
  });

  let entryContent = '';

  if (mainEntryFile) {
    entryContent += `// Main entry: ${path.relative(projectRoot, mainEntryFile)}\n`;
    entryContent += `import '${mainEntryFile}';\n\n`;
  }

  componentFiles.forEach((file, index) => {
    entryContent += `// Component ${index}: ${path.relative(projectRoot, file)}\n`;
    entryContent += `import '${file}';\n`;
  });

  return entryContent;
}

/**
 * Bundle JS files using esbuild
 * @param {Set<string>} jsEntryPoints - JS entry points
 * @param {string} tempDir - Temp directory path
 * @param {Array<string>} tempFiles - Array to track temp files
 * @param {Array} plugins - esbuild plugins
 * @param {Object} options - Plugin options
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<string|null>} Bundled JS content or null
 * @throws {Error} If bundling fails and validation.strict is true
 */
async function bundleJS(jsEntryPoints, tempDir, tempFiles, plugins, options, projectRoot) {
  if (jsEntryPoints.size === 0) {
    return null;
  }

  const isStrict = options.validation && options.validation.strict;

  try {
    const tempJSEntry = path.join(tempDir, 'entry.js');
    tempFiles.push(tempDir);

    const jsEntryArray = Array.from(jsEntryPoints).filter((file) => fs.existsSync(file));

    if (jsEntryArray.length === 0) {
      return null;
    }

    const entryContent = createJSEntryContent(jsEntryArray, options, projectRoot);
    fs.writeFileSync(tempJSEntry, entryContent);
    tempFiles.push(tempJSEntry);

    if (!fs.existsSync(tempJSEntry)) {
      throw new Error(`Failed to create temp JS file at ${tempJSEntry}`);
    }

    const result = await build({
      entryPoints: [tempJSEntry],
      bundle: true,
      write: false,
      plugins,
      format: 'iife',
      minify: options.minifyOutput === true,
      target: options.target || 'es2020',
      treeShaking: true,
      logLevel: 'silent',
      absWorkingDir: projectRoot
    });

    if (result.outputFiles && result.outputFiles.length > 0) {
      return result.outputFiles[0].text;
    }

    return null;
  } catch (error) {
    const errorMessage = `Error bundling JS: ${error.message}`;
    console.error(errorMessage);

    if (isStrict) {
      throw new Error(errorMessage);
    }

    return null;
  }
}

/**
 * Clean up temporary files and directories
 * @param {Array<string>} tempFiles - Array of temp file/directory paths
 */
function cleanupTempFiles(tempFiles) {
  tempFiles.forEach((tempPath) => {
    try {
      if (fs.existsSync(tempPath)) {
        const stats = fs.statSync(tempPath);
        if (stats.isDirectory()) {
          fs.rmSync(tempPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(tempPath);
        }
      }
    } catch {
      // Silently ignore cleanup errors
    }
  });
}

/**
 * Bundle main entries and components using esbuild with plugins for modern, optimized output
 * - Uses esbuild.build() for full plugin ecosystem support
 * - Integrates PostCSS via esbuild-plugin-postcss
 * - Merges main entries with component assets into single output files
 * - Processing order: Main entries → Base components → Section components
 * - Supports tree shaking, minification (via minifyOutput flag), and modern JS output
 *
 * @param {Array} baseComponents - Base/partial components
 * @param {Array} sectionComponents - Section components
 * @param {string} projectRoot - Project root directory for resolving paths
 * @param {Object} options - Plugin options including minifyOutput, PostCSS config, etc.
 * @returns {Promise<BundledAssets>} Promise resolving to merged main + component assets
 */
async function bundleWithESBuild(baseComponents, sectionComponents, projectRoot, options) {
  const cssEntryPoints = new Set();
  const jsEntryPoints = new Set();
  const tempFiles = [];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eleventy-bundled-'));

  // Add main entries first
  addMainEntries(options, projectRoot, cssEntryPoints, jsEntryPoints);

  // Collect component files (base components first, then sections)
  const allComponents = [...baseComponents, ...sectionComponents];
  collectComponentAssets(allComponents, cssEntryPoints, jsEntryPoints);

  // Configure plugins
  const plugins = configurePlugins(options);

  // Bundle CSS and JS
  const cssContent = await bundleCSS(cssEntryPoints, tempDir, tempFiles, plugins, options);
  const jsContent = await bundleJS(jsEntryPoints, tempDir, tempFiles, plugins, options, projectRoot);

  // Clean up temp files
  cleanupTempFiles(tempFiles);

  return {
    css: cssContent,
    js: jsContent
  };
}

export { bundleWithESBuild };
