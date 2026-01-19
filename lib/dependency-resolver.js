/**
 * Dependency Resolver - Resolves transitive component dependencies
 *
 * Given a set of directly used components, this module finds all transitively
 * required components by following the `requires` arrays in component manifests.
 *
 * Since components use IIFEs (JS) and are namespaced (CSS), load order doesn't
 * matter - we just need to ensure all required components are included.
 */

/**
 * Resolve all transitive dependencies for a set of components
 *
 * Starting with a set of directly used components, follows the dependency
 * chain to find all components that must be included. Uses breadth-first
 * traversal to collect all dependencies.
 *
 * @param {Set<string>} usedComponents - Set of component names directly used in templates
 * @param {Map<string, Object>} componentMap - Map of all available components
 * @returns {Set<string>} - Set of all components needed (used + dependencies)
 *
 * @example
 * // If "hero" requires "button" and "button" requires "icon"
 * // Input: new Set(['hero'])
 * // Output: new Set(['hero', 'button', 'icon'])
 */
function resolveAllDependencies(usedComponents, componentMap) {
  const resolved = new Set(usedComponents);
  const queue = [...usedComponents];

  while (queue.length > 0) {
    const currentName = queue.shift();
    const component = componentMap.get(currentName);

    // Skip if component not found (will be caught by validation later)
    if (!component) {
      continue;
    }

    // Get requirements (supports both 'requires' and legacy 'dependencies')
    const requirements = component.requires || component.dependencies || [];

    requirements.forEach((requiredName) => {
      if (!resolved.has(requiredName)) {
        resolved.add(requiredName);
        queue.push(requiredName);
      }
    });
  }

  return resolved;
}

/**
 * Filter component list to only include needed components
 *
 * Takes a list of all available components and returns only those that
 * are needed (either used directly or required transitively).
 *
 * @param {Array<Object>} allComponents - Array of all available components
 * @param {Set<string>} neededComponents - Set of component names to include
 * @returns {Array<Object>} - Filtered array of component objects
 */
function filterNeededComponents(allComponents, neededComponents) {
  return allComponents.filter((component) => neededComponents.has(component.name));
}

export { resolveAllDependencies, filterNeededComponents };
