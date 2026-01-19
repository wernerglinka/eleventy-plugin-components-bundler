/**
 * @typedef {Object} ValidationRule
 * @property {string} [type] - Expected type (boolean, string, number, array, object)
 * @property {*} [const] - Single valid value
 * @property {Array} [enum] - Array of valid values
 * @property {*} [default] - Default value (for documentation)
 * @property {Object} [items] - Validation for array items
 * @property {Object} [properties] - Validation for object properties
 */

/**
 * @typedef {Object} ValidationConfig
 * @property {string[]} [required] - Array of required property paths
 * @property {Object<string, ValidationRule>} [properties] - Property validation rules
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if validation failed
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} propertyPath - Path to the invalid property
 * @property {string} message - Error message
 * @property {*} value - The invalid value
 * @property {string} [tip] - Helpful tip for fixing the error
 */

/**
 * Get nested property value using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path (e.g., "containerFields.isAnimated")
 * @returns {*} Property value or undefined
 */
function getNestedProperty(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return current[key];
    }
    return undefined;
  }, obj);
}

/**
 * Set nested property value using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 */
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();

  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Check if property exists using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @returns {boolean} Whether property exists
 */
function hasNestedProperty(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * Generate helpful tip for common validation errors
 * @param {*} value - The invalid value
 * @param {ValidationRule} rule - Validation rule
 * @returns {string|null} Helpful tip or null
 */
function generateTip(value, rule) {
  // String "false" or "true" when boolean expected
  if (rule.type === 'boolean' && typeof value === 'string') {
    if (value.toLowerCase() === 'false' || value.toLowerCase() === 'true') {
      return `String "${value}" evaluates to true in templates. Use boolean ${value.toLowerCase()} instead.`;
    }
  }

  // String number when number expected
  if (rule.type === 'number' && typeof value === 'string' && !isNaN(Number(value))) {
    return `String "${value}" should be a number. Remove quotes: ${value}`;
  }

  // Common misspellings for titleTag
  if (rule.enum && rule.enum.includes('h1') && typeof value === 'string') {
    const commonMisspellings = {
      header: 'h1, h2, h3, h4, h5, or h6',
      heading: 'h1, h2, h3, h4, h5, or h6',
      title: 'h1, h2, h3, h4, h5, or h6'
    };

    if (commonMisspellings[value.toLowerCase()]) {
      return `Use ${commonMisspellings[value.toLowerCase()]} instead of "${value}".`;
    }
  }

  return null;
}

/**
 * Validate type constraint
 * @param {*} value - Value to validate
 * @param {ValidationRule} rule - Validation rule
 * @param {string} propertyPath - Property path for error messages
 * @returns {ValidationResult} Validation result
 */
function validateTypeConstraint(value, rule, propertyPath) {
  if (!rule.type) {
    return { valid: true };
  }

  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (actualType !== rule.type) {
    const tip = generateTip(value, rule);
    return {
      valid: false,
      error: `${propertyPath}: expected ${rule.type}, got ${actualType} "${value}"${tip ? `\nTip: ${tip}` : ''}`
    };
  }

  return { valid: true };
}

/**
 * Validate const constraint
 * @param {*} value - Value to validate
 * @param {ValidationRule} rule - Validation rule
 * @param {string} propertyPath - Property path for error messages
 * @returns {ValidationResult} Validation result
 */
function validateConstConstraint(value, rule, propertyPath) {
  if (rule.const === undefined) {
    return { valid: true };
  }

  if (value !== rule.const) {
    return {
      valid: false,
      error: `${propertyPath}: expected "${rule.const}", got "${value}"`
    };
  }

  return { valid: true };
}

/**
 * Validate enum constraint
 * @param {*} value - Value to validate
 * @param {ValidationRule} rule - Validation rule
 * @param {string} propertyPath - Property path for error messages
 * @returns {ValidationResult} Validation result
 */
function validateEnumConstraint(value, rule, propertyPath) {
  if (!rule.enum) {
    return { valid: true };
  }

  if (!rule.enum.includes(value)) {
    const tip = generateTip(value, rule);
    return {
      valid: false,
      error: `${propertyPath}: "${value}" is invalid. Must be one of: ${rule.enum.join(', ')}${tip ? `\nTip: ${tip}` : ''}`
    };
  }

  return { valid: true };
}

/**
 * Validate array items
 * @param {Array} value - Array to validate
 * @param {ValidationRule} rule - Validation rule
 * @param {string} propertyPath - Property path for error messages
 * @returns {ValidationResult} Validation result
 */
function validateArrayItems(value, rule, propertyPath) {
  if (rule.type !== 'array' || !rule.items || !Array.isArray(value)) {
    return { valid: true };
  }

  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    const itemPath = `${propertyPath}[${i}]`;

    if (rule.items.properties) {
      const itemValidation = validateObjectProperties(item, rule.items.properties, itemPath);
      if (!itemValidation.valid) {
        return itemValidation;
      }
    }

    // If items has type/enum/const rules, validate the item directly
    if (rule.items.type || rule.items.enum || rule.items.const !== undefined) {
      const itemResult = validateProperty(item, rule.items, itemPath);
      if (!itemResult.valid) {
        return itemResult;
      }
    }
  }

  return { valid: true };
}

/**
 * Validate a single property against its validation rule
 * @param {*} value - Property value to validate
 * @param {ValidationRule} rule - Validation rule
 * @param {string} propertyPath - Property path for error messages
 * @returns {ValidationResult} Validation result
 */
function validateProperty(value, rule, propertyPath) {
  if (value === undefined || value === null) {
    return { valid: true }; // Optional properties
  }

  // Run all validation constraints
  const typeResult = validateTypeConstraint(value, rule, propertyPath);
  if (!typeResult.valid) {
    return typeResult;
  }

  const constResult = validateConstConstraint(value, rule, propertyPath);
  if (!constResult.valid) {
    return constResult;
  }

  const enumResult = validateEnumConstraint(value, rule, propertyPath);
  if (!enumResult.valid) {
    return enumResult;
  }

  const arrayResult = validateArrayItems(value, rule, propertyPath);
  if (!arrayResult.valid) {
    return arrayResult;
  }

  return { valid: true };
}

/**
 * Validate object properties against validation rules
 * @param {Object} obj - Object to validate
 * @param {Object<string, ValidationRule>} properties - Property validation rules
 * @param {string} [basePath] - Base path for nested error messages
 * @returns {ValidationResult} Validation result
 */
function validateObjectProperties(obj, properties, basePath = '') {
  for (const [propertyPath, rule] of Object.entries(properties)) {
    const fullPath = basePath ? `${basePath}.${propertyPath}` : propertyPath;
    const value = getNestedProperty(obj, propertyPath);

    const result = validateProperty(value, rule, fullPath);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Validate required properties
 * @param {Object} obj - Object to validate
 * @param {string[]} required - Array of required property paths
 * @returns {ValidationResult} Validation result
 */
function validateRequiredProperties(obj, required) {
  for (const propertyPath of required) {
    if (!hasNestedProperty(obj, propertyPath)) {
      return {
        valid: false,
        error: `${propertyPath}: required property is missing`
      };
    }
  }

  return { valid: true };
}

/**
 * Validate a section against its component validation rules
 * @param {Object} section - Section data to validate
 * @param {ValidationConfig} validation - Validation configuration
 * @param {string} [context] - Context information for error messages
 * @returns {ValidationResult} Validation result
 */
function validateSection(section, validation, context = '') {
  if (!validation || typeof validation !== 'object') {
    return { valid: true }; // No validation rules
  }

  // Validate required properties
  if (validation.required && Array.isArray(validation.required)) {
    const requiredResult = validateRequiredProperties(section, validation.required);
    if (!requiredResult.valid) {
      const contextPrefix = context ? `${context}\n  ` : '';
      return {
        valid: false,
        error: `${contextPrefix}${requiredResult.error}`
      };
    }
  }

  // Validate properties
  if (validation.properties) {
    const propertiesResult = validateObjectProperties(section, validation.properties);
    if (!propertiesResult.valid) {
      const contextPrefix = context ? `${context}\n  ` : '';
      return {
        valid: false,
        error: `${contextPrefix}${propertiesResult.error}`
      };
    }
  }

  return { valid: true };
}

/**
 * Validate multiple sections with context information
 * @param {Array} sections - Array of sections to validate
 * @param {Function} getManifest - Function to get manifest for a section type
 * @param {string} [fileName] - File name for error context
 * @returns {Array<ValidationError>} Array of validation errors
 */
function validateSections(sections, getManifest, fileName = '') {
  const errors = [];

  if (!Array.isArray(sections)) {
    return errors;
  }

  sections.forEach((section, index) => {
    if (!section || typeof section !== 'object') {
      return;
    }

    const sectionType = section.sectionType;
    if (!sectionType) {
      return; // Skip sections without sectionType
    }

    try {
      const manifest = getManifest(sectionType);
      if (!manifest || !manifest.validation) {
        return; // No validation rules for this component
      }

      const context = fileName
        ? `Section ${index} (${sectionType}) in ${fileName}:`
        : `Section ${index} (${sectionType}):`;

      const result = validateSection(section, manifest.validation, context);
      if (!result.valid) {
        errors.push({
          propertyPath: `sections[${index}]`,
          message: result.error,
          value: section,
          sectionType,
          sectionIndex: index,
          fileName
        });
      }
    } catch (error) {
      // Skip validation if manifest loading fails
      console.warn(`Warning: Could not load manifest for section type "${sectionType}": ${error.message}`);
    }
  });

  return errors;
}

export {
  getNestedProperty,
  setNestedProperty,
  hasNestedProperty,
  validateProperty,
  validateSection,
  validateSections,
  validateObjectProperties,
  validateRequiredProperties,
  validateTypeConstraint,
  validateConstConstraint,
  validateEnumConstraint,
  validateArrayItems,
  generateTip
};
