#!/usr/bin/env node
/**
 * Tests básicos para validación y generación
 * Uso: npm test o node test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function test(name, fn) {
  console.log(`\n📋 ${name}`);
  try {
    fn();
  } catch (e) {
    console.log(`  ✗ Test threw error: ${e.message}`);
    failed++;
  }
}

// Test htmlEscape function
test('htmlEscape() escapes HTML entities', () => {
  const htmlEscape = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  assert(htmlEscape('hello') === 'hello', 'Plain text unchanged');
  assert(htmlEscape('<script>') === '&lt;script&gt;', 'Tags escaped');
  assert(htmlEscape('alert("xss")') === 'alert(&quot;xss&quot;)', 'Double quotes escaped');
  assert(htmlEscape("it's") === "it&#39;s", 'Single quotes escaped');
  assert(htmlEscape('a&b') === 'a&amp;b', 'Ampersand escaped');
  assert(htmlEscape('<img src=x onerror="alert(1)">') === '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;', 'Complex XSS vector escaped');
});

// Test professions.json structure
test('professions.json is valid JSON', () => {
  const profPath = path.join(ROOT, 'professions.json');
  const content = fs.readFileSync(profPath, 'utf8');
  let profs;

  try {
    profs = JSON.parse(content);
    assert(true, 'JSON parses without errors');
  } catch (e) {
    assert(false, `JSON parse error: ${e.message}`);
    return;
  }

  assert(typeof profs === 'object' && !Array.isArray(profs), 'Root is an object (not array)');
  assert(Object.keys(profs).length > 0, `Contains professions (${Object.keys(profs).length})`);
});

// Test professions.json required fields
test('professions.json has all required fields', () => {
  const profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'professions.json'), 'utf8'));
  const REQUIRED = ['label', 'icon', 'color', 'query', 'multiplier', 'sources', 'services'];
  let allValid = true;

  for (const [key, prof] of Object.entries(profs)) {
    for (const field of REQUIRED) {
      if (!(field in prof)) {
        console.log(`  ✗ ${key} missing field: ${field}`);
        allValid = false;
        failed++;
      }
    }
  }

  if (allValid) {
    console.log(`  ✓ All ${Object.keys(profs).length} professions have required fields`);
    passed++;
  }
});

// Test multiplier ranges
test('multiplier values are in valid range (1.0-2.0)', () => {
  const profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'professions.json'), 'utf8'));
  let allValid = true;

  for (const [key, prof] of Object.entries(profs)) {
    const mult = prof.multiplier;
    if (typeof mult !== 'number' || mult < 1.0 || mult > 2.0) {
      console.log(`  ✗ ${key} has invalid multiplier: ${mult}`);
      allValid = false;
      failed++;
    }
  }

  if (allValid) {
    console.log(`  ✓ All multipliers in valid range`);
    passed++;
  }
});

// Test color format
test('color values are valid hex codes (#RRGGBB)', () => {
  const profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'professions.json'), 'utf8'));
  const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
  let allValid = true;

  for (const [key, prof] of Object.entries(profs)) {
    if (!HEX_REGEX.test(prof.color)) {
      console.log(`  ✗ ${key} has invalid color: ${prof.color}`);
      allValid = false;
      failed++;
    }
  }

  if (allValid) {
    console.log(`  ✓ All colors are valid hex codes`);
    passed++;
  }
});

// Test services are non-empty
test('services arrays are non-empty', () => {
  const profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'professions.json'), 'utf8'));
  let allValid = true;

  for (const [key, prof] of Object.entries(profs)) {
    if (!Array.isArray(prof.services) || prof.services.length === 0) {
      console.log(`  ✗ ${key} has empty or invalid services`);
      allValid = false;
      failed++;
    }
  }

  if (allValid) {
    console.log(`  ✓ All professions have services`);
    passed++;
  }
});

// Test generated files exist
test('Generated HTML files exist', () => {
  const profs = JSON.parse(fs.readFileSync(path.join(ROOT, 'professions.json'), 'utf8'));
  let allExist = true;

  for (const key of Object.keys(profs)) {
    const filePath = path.join(ROOT, `radar-${key}.html`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ✗ Missing: radar-${key}.html`);
      allExist = false;
      failed++;
    }
  }

  if (allExist) {
    console.log(`  ✓ All ${Object.keys(profs).length} radar HTML files exist`);
    passed++;
  }
});

// Test index.html exists
test('index.html is generated', () => {
  const indexPath = path.join(ROOT, 'index.html');
  assert(fs.existsSync(indexPath), 'index.html exists');

  const content = fs.readFileSync(indexPath, 'utf8');
  assert(content.includes('<title>'), 'index.html contains title');
  assert(content.includes('class="grid"'), 'index.html has grid layout');
  assert(content.includes('class="card"'), 'index.html has cards');
});

// Test styles.css exists
test('styles.css is present', () => {
  const stylePath = path.join(ROOT, 'styles.css');
  assert(fs.existsSync(stylePath), 'styles.css exists');

  const content = fs.readFileSync(stylePath, 'utf8');
  assert(content.length > 1000, 'styles.css has substantial content (>1KB)');
  assert(content.includes(':root'), 'styles.css defines CSS variables');
});

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
console.log(`Success rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

if (failed > 0) {
  process.exit(1);
}
