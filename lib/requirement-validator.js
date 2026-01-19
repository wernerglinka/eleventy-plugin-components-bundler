/**
 * Simple requirement validation for component dependencies
 *
 * Validates that components marked as 'requires' or 'dependencies' exist.
 * Components are namespaced (CSS) and wrapped in IIFEs (JS), so load order
 * doesn't affect functionality - only existence matters.
 */

/**
 * Validate that needed components have their requirements satisfied
 *
 * Checks both 'requires' (new format) and 'dependencies' (backward compatibility)
 * for component manifest declarations. Only validates components that are
 * actually needed for the build, not all discovered components.
 *
 * @param {Set<string>} neededComponents - Set of component names that will be bundled
 * @param {Map<string, Object>} componentMap - Map of all available components
 * @returns {Array<string>} Array of error messages (empty if all requirements met)
 */
function validateRequirements(neededComponents, componentMap) {
  const errors = [];

  // Only validate components that are actually needed
  neededComponents.forEach((componentName) => {
    const component = componentMap.get(componentName);

    // Skip if component doesn't exist (will be caught elsewhere)
    if (!component) {
      return;
    }

    // Check both 'requires' (new) and 'dependencies' (backward compat)
    const requirements = component.requires || component.dependencies || [];

    requirements.forEach((required) => {
      if (!componentMap.has(required)) {
        errors.push(`Component "${component.name}" requires "${required}" which was not found`);
      }
    });
  });

  return errors;
}

export { validateRequirements };
