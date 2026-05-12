#!/usr/bin/env node
/**
 * Validador de professions.json
 * Verifica schema, tipos, rangos y formatos antes de generar HTMLs
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PROFS_FILE = path.join(ROOT, 'professions.json');

const REQUIRED_FIELDS = ['label', 'icon', 'color', 'query', 'multiplier', 'sources', 'services'];
const MULTIPLIER_MIN = 1.0;
const MULTIPLIER_MAX = 2.0;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const KEY_REGEX = /^[a-z0-9_]+$/;

let errors = [];
let warnings = [];

function isValidEmoji(str) {
  // Simple check: must be non-empty and contain non-ASCII characters (emoji)
  return str.length > 0 && /[^\x00-\x7F]/.test(str);
}

function validateColor(color) {
  return HEX_COLOR_REGEX.test(color);
}

function validateMultiplier(multiplier) {
  const num = parseFloat(multiplier);
  return !isNaN(num) && num >= MULTIPLIER_MIN && num <= MULTIPLIER_MAX;
}

function validateKey(key) {
  return KEY_REGEX.test(key);
}

function validateProfession(key, prof) {
  const path = `"${key}"`;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in prof)) {
      errors.push(`${path}: Missing required field "${field}"`);
    }
  }

  // Validate label (non-empty string)
  if (prof.label && typeof prof.label !== 'string') {
    errors.push(`${path}.label: Must be a string, got ${typeof prof.label}`);
  } else if (!prof.label || prof.label.trim() === '') {
    errors.push(`${path}.label: Must not be empty`);
  }

  // Validate icon (emoji)
  if (prof.icon) {
    if (typeof prof.icon !== 'string') {
      errors.push(`${path}.icon: Must be a string, got ${typeof prof.icon}`);
    } else if (!isValidEmoji(prof.icon)) {
      warnings.push(`${path}.icon: "${prof.icon}" may not be a valid emoji`);
    }
  }

  // Validate color (#RRGGBB)
  if (prof.color) {
    if (typeof prof.color !== 'string') {
      errors.push(`${path}.color: Must be a string, got ${typeof prof.color}`);
    } else if (!validateColor(prof.color)) {
      errors.push(`${path}.color: Must be valid hex color (#RRGGBB), got "${prof.color}"`);
    }
  }

  // Validate query (non-empty string)
  if (prof.query && typeof prof.query !== 'string') {
    errors.push(`${path}.query: Must be a string, got ${typeof prof.query}`);
  } else if (!prof.query || prof.query.trim() === '') {
    errors.push(`${path}.query: Must not be empty`);
  }

  // Validate multiplier (number in range)
  if (prof.multiplier !== undefined) {
    if (typeof prof.multiplier !== 'number') {
      errors.push(`${path}.multiplier: Must be a number, got ${typeof prof.multiplier}`);
    } else if (!validateMultiplier(prof.multiplier)) {
      errors.push(`${path}.multiplier: Must be between ${MULTIPLIER_MIN} and ${MULTIPLIER_MAX}, got ${prof.multiplier}`);
    }
  }

  // Validate sources (array of strings or empty)
  if (prof.sources) {
    if (!Array.isArray(prof.sources)) {
      errors.push(`${path}.sources: Must be an array, got ${typeof prof.sources}`);
    } else {
      prof.sources.forEach((src, idx) => {
        if (typeof src !== 'string') {
          errors.push(`${path}.sources[${idx}]: Must be a string, got ${typeof src}`);
        }
      });
    }
  }

  // Validate services (non-empty array of strings)
  if (prof.services) {
    if (!Array.isArray(prof.services)) {
      errors.push(`${path}.services: Must be an array, got ${typeof prof.services}`);
    } else if (prof.services.length === 0) {
      errors.push(`${path}.services: Array must not be empty`);
    } else {
      prof.services.forEach((svc, idx) => {
        if (typeof svc !== 'string') {
          errors.push(`${path}.services[${idx}]: Must be a string, got ${typeof svc}`);
        } else if (svc.trim() === '') {
          errors.push(`${path}.services[${idx}]: Must not be empty`);
        }
      });
    }
  }
}

function validate() {
  let profs;

  try {
    const content = fs.readFileSync(PROFS_FILE, 'utf8');
    profs = JSON.parse(content);
  } catch (e) {
    console.error(`❌ Failed to read/parse ${PROFS_FILE}`);
    console.error(`   ${e.message}`);
    process.exit(1);
  }

  if (!profs || typeof profs !== 'object') {
    console.error(`❌ professions.json must be an object`);
    process.exit(1);
  }

  const keys = Object.keys(profs);
  const seenKeys = new Set();

  if (keys.length === 0) {
    console.error(`❌ professions.json must contain at least one profession`);
    process.exit(1);
  }

  for (const key of keys) {
    // Validate key format
    if (!validateKey(key)) {
      errors.push(`Key "${key}" must be lowercase alphanumeric with underscores only`);
    }

    // Check for duplicates (case-insensitive)
    const lowerKey = key.toLowerCase();
    if (seenKeys.has(lowerKey)) {
      errors.push(`Duplicate key (case-insensitive): "${key}"`);
    }
    seenKeys.add(lowerKey);

    validateProfession(key, profs[key]);
  }

  // Print results
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`✅ ${keys.length} professions validated successfully`);
    return true;
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`   ${w}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(e => console.log(`   ${e}`));
    process.exit(1);
  }
}

validate();
