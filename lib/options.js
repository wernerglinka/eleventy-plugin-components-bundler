/**
 * @typedef {Object} PostCSSConfiguration
 * @property {Array} [plugins] - Array of PostCSS plugins
 * @property {Object} [options] - PostCSS processing options
 * @property {boolean} [enabled] - Whether PostCSS processing is enabled
 */

/**
 * @typedef {Object} ValidationOptions
 * @property {boolean} [enabled] - Enable/disable validation
 * @property {boolean} [strict] - Fail build on validation errors (vs warnings only)
 * @property {boolean} [reportAllErrors] - Report all errors vs stop on first error
 */

/**
 * @typedef {Object} BundledComponentsOptions
 * @property {string} [basePath] - Path to base/partial components directory
 * @property {string} [sectionsPath] - Path to section components directory
 * @property {string} [layoutsPath] - Path to layouts directory for scanning template includes
 * @property {string} [cssDest] - Output path for bundled CSS file
 * @property {string} [jsDest] - Output path for bundled JavaScript file
 * @property {string} [mainCSSEntry] - Main CSS entry point (design tokens, base styles)
 * @property {string} [mainJSEntry] - Main JavaScript entry point (app initialization)
 * @property {boolean} [minifyOutput] - Enable esbuild minification for production
 * @property {PostCSSConfiguration} [postcss] - PostCSS configuration via esbuild plugin
 * @property {ValidationOptions} [validation] - Component property validation settings
 */

/** @type {BundledComponentsOptions} */
const defaults = {
  basePath: 'src/_includes/components/_partials', // Base/partial components (buttons, cards, etc.)
  sectionsPath: 'src/_includes/components/sections', // Section components (hero, banner, etc.)
  layoutsPath: 'src/_includes/layouts', // Layouts directory for scanning includes
  cssDest: 'assets/main.css', // Output path for bundled CSS (main + components)
  jsDest: 'assets/main.js', // Output path for bundled JS (main + components)
  mainCSSEntry: 'src/assets/main.css', // Main CSS entry (design tokens, base styles)
  mainJSEntry: 'src/assets/main.js', // Main JS entry (app initialization)
  minifyOutput: false, // Enable esbuild minification
  postcss: {
    enabled: false, // PostCSS via esbuild plugin
    plugins: [], // PostCSS plugins array
    options: {} // Additional PostCSS options
  },
  validation: {
    enabled: true, // Component property validation
    strict: false, // Warn vs fail on validation errors
    reportAllErrors: true // Report all errors vs stop on first
  }
};

/**
 * Normalize and merge plugin options with defaults
 *
 * Ensures all configuration objects have required properties and applies
 * sensible defaults for the Eleventy component architecture.
 *
 * @param {BundledComponentsOptions} [options] - User-provided options
 * @returns {BundledComponentsOptions} Normalized options with all defaults applied
 */
function normalizeOptions(options) {
  const normalized = Object.assign({}, defaults, options || {});

  // Ensure postcss configuration has all required properties
  normalized.postcss = Object.assign({}, defaults.postcss, normalized.postcss || {});

  // Ensure validation configuration has all required properties
  normalized.validation = Object.assign({}, defaults.validation, normalized.validation || {});

  return normalized;
}

export { normalizeOptions, defaults };
