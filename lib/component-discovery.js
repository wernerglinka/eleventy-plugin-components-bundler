import fs from 'fs';
import path from 'path';

/**
 * @typedef {Object} ComponentManifest
 * @property {string} name - Component name
 * @property {string} [type] - Component type (e.g., 'auto', 'manual')
 * @property {string[]} styles - Array of CSS file names
 * @property {string[]} scripts - Array of JS file names
 * @property {string[]} dependencies - Array of component names this component depends on (legacy)
 * @property {string[]} requires - Array of component names this component requires (new format)
 */

/**
 * @typedef {Object} Component
 * @property {string} name - Component name
 * @property {string} [type] - Component type
 * @property {string[]} styles - Array of CSS file names
 * @property {string[]} scripts - Array of JS file names
 * @property {string[]} dependencies - Array of component names this component depends on (legacy)
 * @property {string[]} requires - Array of component names this component requires (new format)
 * @property {string} path - Full path to component directory
 */

/**
 * Collect all components from a directory (base or sections)
 *
 * Scans the provided directory for component subdirectories and loads
 * their manifests or auto-generates them. Supports both explicit manifests
 * and auto-discovery based on file patterns.
 *
 * @param {string} dirPath - Directory to scan for components
 * @returns {Array} Array of component objects with metadata and file paths
 */
function collectComponents(dirPath) {
  // Component directories are optional - return empty array if not found
  // This allows projects to have only partials or only sections
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  // Read all items in the component directory (e.g., 'button', 'hero', etc.)
  const items = fs.readdirSync(dirPath);
  const components = [];

  items.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    // Skip files - we only process directories (each directory is a component)
    if (!stats.isDirectory()) {
      return;
    }

    // Load the component from its directory (reads manifest or auto-generates)
    const component = loadComponent(itemPath, item);

    // Only add successfully loaded components (null means loading failed)
    if (component) {
      components.push(component);
    }
  });

  return components;
}

/**
 * Validate that an asset path stays within the component directory
 *
 * Prevents path traversal attacks where manifest.json could specify
 * paths like "../../../etc/passwd" to read files outside the component.
 *
 * @param {string} componentPath - Component directory (absolute path)
 * @param {string} assetPath - Asset path from manifest (relative)
 * @returns {boolean} True if path is safe, false if it escapes component directory
 */
function isPathSafe(componentPath, assetPath) {
  // Resolve the full path and check it starts with the component directory
  const resolvedPath = path.resolve(componentPath, assetPath);
  const normalizedComponentPath = path.resolve(componentPath);

  return resolvedPath.startsWith(normalizedComponentPath + path.sep) || resolvedPath === normalizedComponentPath;
}

/**
 * Filter asset paths to only include safe ones within the component directory
 *
 * @param {string[]} assets - Array of asset paths from manifest
 * @param {string} componentPath - Component directory path
 * @param {string} componentName - Component name for error messages
 * @param {string} assetType - Type of asset ('styles' or 'scripts') for error messages
 * @returns {string[]} Filtered array with only safe paths
 */
function filterSafeAssetPaths(assets, componentPath, componentName, assetType) {
  if (!Array.isArray(assets)) {
    return [];
  }

  return assets.filter((assetPath) => {
    if (typeof assetPath !== 'string') {
      console.warn(`Invalid ${assetType} path in ${componentName}: expected string, got ${typeof assetPath}`);
      return false;
    }

    if (!isPathSafe(componentPath, assetPath)) {
      console.warn(`Unsafe ${assetType} path in ${componentName}: "${assetPath}" escapes component directory`);
      return false;
    }

    return true;
  });
}

/**
 * Load a single component from directory
 *
 * Attempts to read a manifest.json file from the component directory.
 * If no manifest exists, auto-generates one based on file conventions.
 *
 * @param {string} componentPath - Component directory path
 * @param {string} componentName - Component name
 * @returns {Object|null} Component object or null if invalid
 */
function loadComponent(componentPath, componentName) {
  const manifestPath = path.join(componentPath, 'manifest.json');
  let manifest;

  // Try to load an explicit manifest file if it exists
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      // Invalid JSON - log error and skip this component
      console.error(`Invalid manifest.json in ${componentName}: ${error.message}`);
      return null;
    }
  } else {
    // No manifest found - auto-generate based on component name conventions
    // Looks for componentName.css and componentName.js files
    manifest = autoGenerateManifest(componentPath, componentName);
  }

  // Validate that manifest has the required 'name' field
  if (!manifest.name) {
    console.error(`Missing 'name' in manifest for ${componentName}`);
    return null;
  }

  // Filter asset paths to prevent path traversal attacks
  const safeStyles = filterSafeAssetPaths(manifest.styles, componentPath, componentName, 'styles');
  const safeScripts = filterSafeAssetPaths(manifest.scripts, componentPath, componentName, 'scripts');

  // Return the complete component object with normalized arrays
  // and the full filesystem path for later asset resolution
  return {
    ...manifest,
    path: componentPath,
    // Use filtered safe paths
    styles: safeStyles,
    scripts: safeScripts,
    dependencies: manifest.dependencies || []
  };
}

/**
 * Auto-generate manifest for components without one
 *
 * Creates a manifest based on naming conventions:
 * - Looks for {componentName}.css
 * - Looks for {componentName}.js
 * - No dependencies (must be explicit via manifest.json)
 *
 * This enables "convention over configuration" for simple components.
 *
 * @param {string} componentPath - Component directory
 * @param {string} componentName - Component name
 * @returns {Object} Generated manifest
 */
function autoGenerateManifest(componentPath, componentName) {
  // Expected file names based on component name
  // Example: 'button' component looks for 'button.css' and 'button.js'
  const cssFile = `${componentName}.css`;
  const jsFile = `${componentName}.js`;

  return {
    name: componentName,
    type: 'auto', // Mark as auto-generated for debugging
    // Only include files that actually exist on disk
    styles: fs.existsSync(path.join(componentPath, cssFile)) ? [cssFile] : [],
    scripts: fs.existsSync(path.join(componentPath, jsFile)) ? [jsFile] : [],
    // Auto-generated manifests can't know dependencies - must be explicit
    dependencies: []
  };
}

/**
 * Create a Map from component array for efficient lookups
 *
 * Converts the component array into a Map for O(1) lookups by name.
 * This is used throughout the plugin for:
 * - Dependency resolution (checking if required components exist)
 * - Template analysis (getting component manifests)
 * - Validation (accessing component schemas)
 *
 * @param {Array} components - Array of components
 * @returns {Map} Component map keyed by name
 * @throws {Error} If duplicate component names are found
 */
function createComponentMap(components) {
  const componentMap = new Map();

  components.forEach((component) => {
    // Detect duplicate component names across partials and sections
    // This prevents ambiguity in dependency resolution
    if (componentMap.has(component.name)) {
      throw new Error(`Duplicate component name: ${component.name}`);
    }

    // Map stores: componentName → full component object with path, styles, scripts, etc.
    componentMap.set(component.name, component);
  });

  return componentMap;
}

export { collectComponents, loadComponent, autoGenerateManifest, createComponentMap, isPathSafe, filterSafeAssetPaths };
