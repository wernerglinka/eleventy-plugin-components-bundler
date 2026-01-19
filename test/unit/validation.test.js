import assert from 'node:assert';
import {
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
} from '../../lib/validation.js';

describe('Validation', () => {
  describe('getNestedProperty()', () => {
    const testObj = {
      simple: 'value',
      nested: {
        prop: 'nested-value',
        deep: {
          prop: 'deep-value'
        }
      },
      array: [{ item: 'first' }, { item: 'second' }]
    };

    it('should get simple property', () => {
      assert.strictEqual(getNestedProperty(testObj, 'simple'), 'value');
    });

    it('should get nested property', () => {
      assert.strictEqual(getNestedProperty(testObj, 'nested.prop'), 'nested-value');
    });

    it('should get deeply nested property', () => {
      assert.strictEqual(getNestedProperty(testObj, 'nested.deep.prop'), 'deep-value');
    });

    it('should return undefined for non-existent property', () => {
      assert.strictEqual(getNestedProperty(testObj, 'missing'), undefined);
      assert.strictEqual(getNestedProperty(testObj, 'nested.missing'), undefined);
      assert.strictEqual(getNestedProperty(testObj, 'nested.deep.missing'), undefined);
    });

    it('should handle null/undefined object', () => {
      assert.strictEqual(getNestedProperty(null, 'prop'), undefined);
      assert.strictEqual(getNestedProperty(undefined, 'prop'), undefined);
    });

    it('should handle non-object values', () => {
      assert.strictEqual(getNestedProperty('string', 'prop'), undefined);
      assert.strictEqual(getNestedProperty(123, 'prop'), undefined);
    });
  });

  describe('setNestedProperty()', () => {
    it('should set simple property', () => {
      const obj = {};
      setNestedProperty(obj, 'simple', 'value');
      assert.strictEqual(obj.simple, 'value');
    });

    it('should set nested property', () => {
      const obj = {};
      setNestedProperty(obj, 'nested.prop', 'value');
      assert.strictEqual(obj.nested.prop, 'value');
    });

    it('should set deeply nested property', () => {
      const obj = {};
      setNestedProperty(obj, 'nested.deep.prop', 'value');
      assert.strictEqual(obj.nested.deep.prop, 'value');
    });

    it('should overwrite existing nested structure', () => {
      const obj = { nested: 'string' };
      setNestedProperty(obj, 'nested.prop', 'value');
      assert.strictEqual(obj.nested.prop, 'value');
    });
  });

  describe('hasNestedProperty()', () => {
    const testObj = {
      simple: 'value',
      nested: {
        prop: 'nested-value',
        nullProp: null,
        undefinedProp: undefined
      }
    };

    it('should return true for existing properties', () => {
      assert.strictEqual(hasNestedProperty(testObj, 'simple'), true);
      assert.strictEqual(hasNestedProperty(testObj, 'nested.prop'), true);
      assert.strictEqual(hasNestedProperty(testObj, 'nested.nullProp'), true);
      assert.strictEqual(hasNestedProperty(testObj, 'nested.undefinedProp'), true);
    });

    it('should return false for non-existent properties', () => {
      assert.strictEqual(hasNestedProperty(testObj, 'missing'), false);
      assert.strictEqual(hasNestedProperty(testObj, 'nested.missing'), false);
    });

    it('should handle null/undefined object', () => {
      assert.strictEqual(hasNestedProperty(null, 'prop'), false);
      assert.strictEqual(hasNestedProperty(undefined, 'prop'), false);
    });

    it('should handle non-object values in path', () => {
      const obj = { nested: 'string' };
      assert.strictEqual(hasNestedProperty(obj, 'nested.prop'), false);
    });
  });

  describe('generateTip()', () => {
    it('should generate tip for string boolean values', () => {
      const rule = { type: 'boolean' };
      const tip1 = generateTip('false', rule);
      const tip2 = generateTip('true', rule);

      assert(tip1.includes('String "false" evaluates to true'));
      assert(tip2.includes('String "true" evaluates to true'));
    });

    it('should generate tip for string number values', () => {
      const rule = { type: 'number' };
      const tip = generateTip('42', rule);

      assert(tip.includes('String "42" should be a number'));
      assert(tip.includes('Remove quotes: 42'));
    });

    it('should generate tip for titleTag misspellings', () => {
      const rule = { enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] };
      const tip1 = generateTip('header', rule);
      const tip2 = generateTip('heading', rule);
      const tip3 = generateTip('title', rule);

      assert(tip1.includes('h1, h2, h3, h4, h5, or h6'));
      assert(tip2.includes('h1, h2, h3, h4, h5, or h6'));
      assert(tip3.includes('h1, h2, h3, h4, h5, or h6'));
    });

    it('should return null for no applicable tip', () => {
      const rule = { type: 'string' };
      const tip = generateTip('valid', rule);

      assert.strictEqual(tip, null);
    });

    it('should return null for non-string values with boolean rule', () => {
      const rule = { type: 'boolean' };
      const tip = generateTip(123, rule);

      assert.strictEqual(tip, null);
    });
  });

  describe('validateTypeConstraint()', () => {
    it('should pass for correct types', () => {
      assert.deepStrictEqual(validateTypeConstraint(true, { type: 'boolean' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateTypeConstraint('text', { type: 'string' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateTypeConstraint(42, { type: 'number' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateTypeConstraint([], { type: 'array' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateTypeConstraint({}, { type: 'object' }, 'test'), { valid: true });
    });

    it('should fail for incorrect types', () => {
      const result = validateTypeConstraint('false', { type: 'boolean' }, 'isAnimated');

      assert.strictEqual(result.valid, false);
      assert(result.error.includes('expected boolean, got string'));
      assert(result.error.includes('isAnimated'));
    });

    it('should pass when no type constraint specified', () => {
      const result = validateTypeConstraint('anything', {}, 'test');
      assert.deepStrictEqual(result, { valid: true });
    });
  });

  describe('validateConstConstraint()', () => {
    it('should pass for matching const value', () => {
      const result = validateConstConstraint('hero', { const: 'hero' }, 'sectionType');
      assert.deepStrictEqual(result, { valid: true });
    });

    it('should fail for non-matching const value', () => {
      const result = validateConstConstraint('banner', { const: 'hero' }, 'sectionType');
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('expected "hero", got "banner"'));
    });

    it('should pass when no const constraint specified', () => {
      const result = validateConstConstraint('anything', {}, 'test');
      assert.deepStrictEqual(result, { valid: true });
    });
  });

  describe('validateEnumConstraint()', () => {
    it('should pass for valid enum value', () => {
      const rule = { enum: ['h1', 'h2', 'h3'] };
      const result = validateEnumConstraint('h2', rule, 'titleTag');
      assert.deepStrictEqual(result, { valid: true });
    });

    it('should fail for invalid enum value', () => {
      const rule = { enum: ['h1', 'h2', 'h3'] };
      const result = validateEnumConstraint('header', rule, 'titleTag');

      assert.strictEqual(result.valid, false);
      assert(result.error.includes('"header" is invalid'));
      assert(result.error.includes('Must be one of: h1, h2, h3'));
    });

    it('should pass when no enum constraint specified', () => {
      const result = validateEnumConstraint('anything', {}, 'test');
      assert.deepStrictEqual(result, { valid: true });
    });
  });

  describe('validateArrayItems()', () => {
    it('should pass for valid array items with properties', () => {
      const rule = {
        type: 'array',
        items: {
          properties: {
            buttonStyle: { enum: ['primary', 'secondary'] }
          }
        }
      };

      const validArray = [{ buttonStyle: 'primary' }, { buttonStyle: 'secondary' }];
      const result = validateArrayItems(validArray, rule, 'ctas');
      assert.deepStrictEqual(result, { valid: true });
    });

    it('should fail for invalid array items', () => {
      const rule = {
        type: 'array',
        items: {
          properties: {
            buttonStyle: { enum: ['primary', 'secondary'] }
          }
        }
      };

      const invalidArray = [{ buttonStyle: 'invalid' }];
      const result = validateArrayItems(invalidArray, rule, 'ctas');

      assert.strictEqual(result.valid, false);
      assert(result.error.includes('ctas[0].buttonStyle'));
    });

    it('should validate array items with direct type rules', () => {
      const rule = {
        type: 'array',
        items: { type: 'string' }
      };

      assert.deepStrictEqual(validateArrayItems(['a', 'b'], rule, 'tags'), { valid: true });

      const result = validateArrayItems(['a', 123], rule, 'tags');
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('tags[1]'));
    });

    it('should pass for non-array types', () => {
      const rule = { type: 'string' };
      const result = validateArrayItems('not-array', rule, 'test');
      assert.deepStrictEqual(result, { valid: true });
    });

    it('should pass when no items constraint specified', () => {
      const rule = { type: 'array' };
      const result = validateArrayItems(['anything'], rule, 'test');
      assert.deepStrictEqual(result, { valid: true });
    });
  });

  describe('validateProperty()', () => {
    it('should pass validation for correct types', () => {
      assert.deepStrictEqual(validateProperty(true, { type: 'boolean' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateProperty('text', { type: 'string' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateProperty(42, { type: 'number' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateProperty([], { type: 'array' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateProperty({}, { type: 'object' }, 'test'), { valid: true });
    });

    it('should handle undefined/null values gracefully', () => {
      assert.deepStrictEqual(validateProperty(undefined, { type: 'string' }, 'test'), { valid: true });
      assert.deepStrictEqual(validateProperty(null, { type: 'string' }, 'test'), { valid: true });
    });

    it('should run all constraint validations', () => {
      const rule = {
        type: 'string',
        enum: ['h1', 'h2']
      };

      // Pass both constraints
      assert.deepStrictEqual(validateProperty('h1', rule, 'test'), { valid: true });

      // Fail type constraint
      const typeResult = validateProperty(123, rule, 'test');
      assert.strictEqual(typeResult.valid, false);

      // Fail enum constraint
      const enumResult = validateProperty('h3', rule, 'test');
      assert.strictEqual(enumResult.valid, false);
    });
  });

  describe('validateRequiredProperties()', () => {
    const obj = {
      simple: 'value',
      nested: {
        prop: 'value'
      }
    };

    it('should pass when all required properties exist', () => {
      const required = ['simple', 'nested.prop'];
      const result = validateRequiredProperties(obj, required);

      assert.deepStrictEqual(result, { valid: true });
    });

    it('should fail when required property is missing', () => {
      const required = ['missing'];
      const result = validateRequiredProperties(obj, required);

      assert.strictEqual(result.valid, false);
      assert(result.error.includes('missing: required property is missing'));
    });

    it('should fail when nested required property is missing', () => {
      const required = ['nested.missing'];
      const result = validateRequiredProperties(obj, required);

      assert.strictEqual(result.valid, false);
      assert(result.error.includes('nested.missing: required property is missing'));
    });
  });

  describe('validateObjectProperties()', () => {
    it('should validate object properties', () => {
      const obj = {
        isAnimated: true,
        titleTag: 'h2'
      };

      const properties = {
        isAnimated: { type: 'boolean' },
        titleTag: { enum: ['h1', 'h2', 'h3'] }
      };

      const result = validateObjectProperties(obj, properties);
      assert.deepStrictEqual(result, { valid: true });
    });

    it('should fail validation for invalid properties', () => {
      const obj = {
        isAnimated: 'false'
      };

      const properties = {
        isAnimated: { type: 'boolean' }
      };

      const result = validateObjectProperties(obj, properties);
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('isAnimated'));
    });

    it('should include base path in error messages', () => {
      const obj = { invalid: 'value' };
      const properties = { invalid: { type: 'number' } };

      const result = validateObjectProperties(obj, properties, 'ctas[0]');
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('ctas[0].invalid'));
    });
  });

  describe('validateSection()', () => {
    it('should validate section successfully', () => {
      const section = {
        sectionType: 'hero',
        isAnimated: true,
        titleTag: 'h2'
      };

      const validation = {
        required: ['sectionType'],
        properties: {
          sectionType: { const: 'hero' },
          isAnimated: { type: 'boolean' },
          titleTag: { enum: ['h1', 'h2', 'h3'] }
        }
      };

      const result = validateSection(section, validation);
      assert.deepStrictEqual(result, { valid: true });
    });

    it('should fail validation for missing required properties', () => {
      const section = {};
      const validation = {
        required: ['sectionType']
      };

      const result = validateSection(section, validation);
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('sectionType: required property is missing'));
    });

    it('should include context in error messages', () => {
      const section = { isAnimated: 'false' };
      const validation = {
        properties: {
          isAnimated: { type: 'boolean' }
        }
      };

      const result = validateSection(section, validation, 'Section 0 (hero) in src/index.md:');
      assert.strictEqual(result.valid, false);
      assert(result.error.includes('Section 0 (hero) in src/index.md:'));
    });

    it('should pass validation when no validation rules provided', () => {
      const section = { anything: 'goes' };

      assert.deepStrictEqual(validateSection(section, null), { valid: true });
      assert.deepStrictEqual(validateSection(section, undefined), { valid: true });
      assert.deepStrictEqual(validateSection(section, {}), { valid: true });
    });

    it('should pass when validation is not an object', () => {
      const section = { anything: 'goes' };
      assert.deepStrictEqual(validateSection(section, 'invalid'), { valid: true });
    });
  });

  describe('validateSections()', () => {
    const mockGetManifest = (sectionType) => {
      const manifests = {
        hero: {
          name: 'hero',
          validation: {
            required: ['sectionType'],
            properties: {
              sectionType: { const: 'hero' },
              isAnimated: { type: 'boolean' }
            }
          }
        },
        banner: {
          name: 'banner',
          validation: {
            properties: {
              titleTag: { enum: ['h1', 'h2', 'h3'] }
            }
          }
        },
        'no-validation': {
          name: 'no-validation'
        }
      };

      const manifest = manifests[sectionType];
      if (!manifest) {
        throw new Error(`Component "${sectionType}" not found`);
      }
      return manifest;
    };

    it('should validate all sections successfully', () => {
      const sections = [
        { sectionType: 'hero', isAnimated: true },
        { sectionType: 'banner', titleTag: 'h2' }
      ];

      const errors = validateSections(sections, mockGetManifest, 'test.md');
      assert.deepStrictEqual(errors, []);
    });

    it('should return validation errors', () => {
      const sections = [
        { sectionType: 'hero', isAnimated: 'false' },
        { sectionType: 'banner', titleTag: 'invalid' }
      ];

      const errors = validateSections(sections, mockGetManifest, 'test.md');
      assert.strictEqual(errors.length, 2);

      assert(errors[0].message.includes('isAnimated'));
      assert(errors[0].message.includes('test.md'));
      assert.strictEqual(errors[0].sectionType, 'hero');
      assert.strictEqual(errors[0].sectionIndex, 0);

      assert(errors[1].message.includes('titleTag'));
      assert.strictEqual(errors[1].sectionType, 'banner');
      assert.strictEqual(errors[1].sectionIndex, 1);
    });

    it('should skip sections without sectionType', () => {
      const sections = [{ noSectionType: true }, { sectionType: 'hero', isAnimated: true }];

      const errors = validateSections(sections, mockGetManifest);
      assert.deepStrictEqual(errors, []);
    });

    it('should skip sections without validation rules', () => {
      const sections = [{ sectionType: 'no-validation', anything: 'goes' }];

      const errors = validateSections(sections, mockGetManifest);
      assert.deepStrictEqual(errors, []);
    });

    it('should handle non-array sections', () => {
      const errors1 = validateSections(null, mockGetManifest);
      const errors2 = validateSections('not-array', mockGetManifest);
      const errors3 = validateSections({ notArray: true }, mockGetManifest);

      assert.deepStrictEqual(errors1, []);
      assert.deepStrictEqual(errors2, []);
      assert.deepStrictEqual(errors3, []);
    });

    it('should handle manifest loading errors gracefully', () => {
      const sections = [{ sectionType: 'unknown-component' }];

      const errors = validateSections(sections, mockGetManifest);
      assert.deepStrictEqual(errors, []);
    });

    it('should handle invalid section objects', () => {
      const sections = [null, 'not-object', { sectionType: 'hero', isAnimated: true }];

      const errors = validateSections(sections, mockGetManifest);
      assert.deepStrictEqual(errors, []);
    });

    it('should work without fileName context', () => {
      const sections = [{ sectionType: 'hero', isAnimated: 'false' }];

      const errors = validateSections(sections, mockGetManifest);
      assert.strictEqual(errors.length, 1);
      assert(errors[0].message.includes('Section 0 (hero):'));
    });
  });
});
