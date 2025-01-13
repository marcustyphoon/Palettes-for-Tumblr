/* eslint-disable comma-dangle */
import fs from 'node:fs';

const paletteData = JSON.parse(fs.readFileSync('src/paletteData.json', 'utf8'));
const nativePaletteSystemData = JSON.parse(fs.readFileSync('src/paletteSystemData.json', 'utf8'));
const designTokenData = (await import('./designTokens.js')).default;

// processes e.g. 'rgb(128, 128, 128, 1)' and '128, 128, 128' identically
const processRgba = (value) => {
  const res =
    /^(?:rgba\()?(?:([\d.]+),? ?)(?:([\d.]+),? ?)(?:([\d.]+),? ?)(?:([\d.]+),? ?)?\)?$/.exec(value);
  return { r: Number(res[1]), g: Number(res[2]), b: Number(res[3]), a: Number(res[4] ?? 1) };
};

const designTokenLookup = [];
for (const [key, value] of Object.entries(designTokenData)) {
  designTokenLookup.push({ token: key.replace(/^color/, ''), ...processRgba(value) });
}

const nativePaletteNames = Object.keys(nativePaletteSystemData);

const data = {};

const LEFT_COLUMN_WIDTH = 25;
const COLUMN_WIDTH = 12;
const COLUMN_WIDTH_EXPANDED = 18;

for (const paletteName of nativePaletteNames) {
  let currentPaletteData = paletteData[paletteName];
  if (currentPaletteData.accent && !currentPaletteData['deprecated-accent']) {
    currentPaletteData = {
      ...currentPaletteData,
      'deprecated-accent': currentPaletteData.accent
    };
    delete currentPaletteData.accent;
  }
  const palette = { ...currentPaletteData, ...nativePaletteSystemData[paletteName] };

  /**
   * match design tokens to palette colors
   */

  // for some reason some colors are slightly off; allow this
  const MAX_ALLOWED_RGB_DEVIATION = 2;
  const MAX_ALLOWED_ALPHA_DEVIATION = 0.01;

  console.log(`${paletteName}:`);
  data[paletteName] = {};

  for (const [key, value] of Object.entries(palette)) {
    const processedCurrent = processRgba(value);
    const designToken =
      designTokenLookup.find((processed) =>
        ['r', 'g', 'b'].every((key) =>
          Math.abs(processed[key] - processedCurrent[key]) <= MAX_ALLOWED_RGB_DEVIATION) &&
          Math.abs(processed.a - processedCurrent.a) <= MAX_ALLOWED_ALPHA_DEVIATION
      )?.token ?? `${value}`.replaceAll(' ', '');

    console.log(key.padStart(LEFT_COLUMN_WIDTH), designToken);
    data[paletteName][key] = designToken;
  }
  console.log('');
}

/**
 * log all values in table form
 */

const keys = Object.keys(data.trueBlue);

console.log('------'.padEnd(LEFT_COLUMN_WIDTH), ...nativePaletteNames.map(name => name.slice(0, COLUMN_WIDTH).padStart(COLUMN_WIDTH)));
for (const key of keys) {
  console.log(key.padStart(LEFT_COLUMN_WIDTH), ...nativePaletteNames.map(name => data[name][key].padStart(COLUMN_WIDTH)));
}

console.log('');

/**
 * log all values in table form, sorted
 */

// const arrangedKeys = [];
// for (const key of keys) {
//   (() => {
//     for (let i = 0; i < arrangedKeys.length; i++) {
//       if (JSON.stringify(nativePaletteNames.map((name) => data[name][key])) ===
//       JSON.stringify(nativePaletteNames.map((name) => data[name][arrangedKeys[i]]))) {
//         arrangedKeys.splice(i, 0, key);
//         return;
//       }
//     }
//     arrangedKeys.push(key);
//   })();
// }

const arrangedKeys = Object.values(
  Object.groupBy(keys, (key) => JSON.stringify(nativePaletteNames.filter(name => name !== 'trueBlue').map((name) => data[name][key]))),
)
  .toSorted((a, b) => a.length - b.length)
  .flat();

console.log('------'.padEnd(LEFT_COLUMN_WIDTH), ...nativePaletteNames.map(name => name.slice(0, COLUMN_WIDTH).padStart(COLUMN_WIDTH)));
for (const key of arrangedKeys) {
  const isTheSame = nativePaletteNames.every(name => data[name][key] === data.trueBlue[key]);
  if (isTheSame) {
    console.log(key.padStart(LEFT_COLUMN_WIDTH), data.trueBlue[key].padStart(COLUMN_WIDTH));
  } else {
    console.log(key.padStart(LEFT_COLUMN_WIDTH), ...nativePaletteNames.map(name => data[name][key].padStart(COLUMN_WIDTH)));
  }
}

console.log('');

/**
 * use rules to generate reasonable match for colors
 */

const generatedData = {};

// ([^ ]+)
// '$1',
const manualData = {
  accentTint: ['Blue', 'Blue', 'Blue', 'Navy', 'Green', 'Orange', 'Blue', 'Red', 'Purple', 'Navy', 'Purple', 'Yellow'],
  panel: ['Navy95', 'Gray90', 'Navy85', 'Navy5', 'Gray90', 'Yellow10', 'Navy3', 'Gray90', 'Gray90', 'White', 'Gray95', 'BlackTint10'],
  'chrome-tint': ['White', 'White', 'White', 'Navy', 'Green', 'Black', 'Navy', 'White', 'Orange', 'Navy', 'White', 'Black'],
  accent: ['Blue', 'Blue', 'Blue', 'Navy60', 'Green', 'Orange', 'Blue', 'Red', 'Purple', 'Black', 'Purple', 'Yellow'],
  chrome: ['Navy', 'Gray95', 'Navy90', 'White', 'Gray95', 'Yellow5', 'White', 'Gray95', 'Gray95', 'White', 'Black', 'Pink']
};

for (const [i, paletteName] of Object.entries(nativePaletteNames)) {
  generatedData[paletteName] = {};
  for (const key of Object.keys(paletteData.trueBlue).map(key => key === 'accent' ? 'deprecated-accent' : key)) {
    generatedData[paletteName][key] = data[paletteName][key];
  }

  for (const color of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']) {
    const generatedValues = {
      [`brand-${color}`]: `${generatedData[paletteName][color]}`,
      [`brand-${color}-hover`]: `${generatedData[paletteName][color]}40`,
      [`brand-${color}-pressed`]: `${generatedData[paletteName][color]}30`,
      [`brand-${color}-tint`]: `${generatedData[paletteName][color]}Tint10`,
      [`brand-${color}-tint-strong`]: `${generatedData[paletteName][color]}Tint20`,
      [`brand-${color}-tint-heavy`]: `${generatedData[paletteName][color]}Tint30`,

      [`chrome-${color}`]: `${generatedData[paletteName][color]}30`,
    };
    generatedData[paletteName] = { ...generatedData[paletteName], ...generatedValues };
  }

  // ([^ ]+)\s+([^ ]+)
  // '$1': '$2',
  const generatedValues = {
    // not very consistent
    'chrome-panel': manualData.panel[i],
    'content-panel': manualData.panel[i],
    'chrome-mobile': manualData.panel[i],
    modal: manualData.panel[i],

    'chrome-tint': `${manualData['chrome-tint'][i]}Tint5`,
    'chrome-tint-strong': `${manualData['chrome-tint'][i]}Tint10`,
    'chrome-tint-heavy': `${manualData['chrome-tint'][i]}Tint15`,

    // mostly consistent
    'accent-fg-light': 'White',
    'accent-fg': 'Black',
    'badge-text': 'Black',
    'chrome-ui-fg': 'Black',
    'chrome-ui-fg-secondary': 'BlackTint80',
    'chrome-ui-fg-tertiary': 'BlackTint60',
    'accent-tint': `${manualData.accentTint[i]}Tint10`,
    'accent-tint-strong': `${manualData.accentTint[i]}Tint20`,
    'accent-tint-heavy': `${manualData.accentTint[i]}Tint30`,

    'accent-hover': `${manualData.accent[i]}40`,
    'chrome-ui-hover': `${manualData.accent[i]}40`,
    'accent-pressed': `${manualData.accent[i]}30`,
    'chrome-ui-pressed': `${manualData.accent[i]}30`,

    // completely consistent
    accent: `${manualData.accent[i]}`,
    'chrome-ui': `${manualData.accent[i]}`,
    'chrome-ui-focus': `${manualData.accent[i]}`,

    chrome: `${manualData.chrome[i]}`,
    'top-menu': `${manualData.chrome[i]}`,

    'color-tint': 'BlackTint10',
    'color-tint-strong': 'BlackTint15',
    'color-tint-heavy': 'BlackTint20',
    'color-fg-tertiary': 'BlackTint60',
    'color-ui-hover': 'BlackTint90',
    'image-ui-hover': 'WhiteTint90',
    'danger-tint': 'RedTint10',
    'danger-tint-strong': 'RedTint20',
    'danger-tint-heavy': 'RedTint30',
    success: 'Green',
    'success-hover': 'Green40',
    'success-pressed': 'Green30',
    'success-tint': 'GreenTint10',
    'success-tint-strong': 'GreenTint20',
    'success-tint-heavy': 'GreenTint30',
    education: 'Purple',
    'education-hover': 'Purple40',
    'education-pressed': 'Purple30',
    'education-tint': 'PurpleTint10',
    'education-tint-strong': 'PurpleTint20',
    'education-tint-heavy': 'PurpleTint30',
    'color-fg-secondary': 'BlackTint80',
    'color-ui-pressed': 'BlackTint80',
    'color-fg-light-tertiary': 'WhiteTint60',
    'image-fg-tertiary': 'WhiteTint60',
    'color-fg-light-secondary': 'WhiteTint80',
    'image-fg-secondary': 'WhiteTint80',
    'image-ui-pressed': 'WhiteTint80',
    'color-fg': 'Black',
    'image-bg': 'Black',
    'color-ui': 'Black',
    'color-ui-focus': 'Black',
    'image-ui-fg': 'Black',
    'color-fg-light': 'White',
    'image-fg': 'White',
    'badge-icon': 'White',
    'chrome-ui-toggle': 'White',
    'content-ui-toggle': 'White',
    'color-ui-fg': 'White',
    'color-ui-toggle': 'White',
    'image-ui': 'White',
    'image-ui-accent': 'White',
    'image-ui-toggle': 'White',
  };

  generatedData[paletteName] = { ...generatedData[paletteName], ...generatedValues };
}

console.log('------'.padEnd(LEFT_COLUMN_WIDTH), ...nativePaletteNames.map(name => `${name.slice(0, COLUMN_WIDTH).padStart(COLUMN_WIDTH)} ❔ ${'generated'.padEnd(COLUMN_WIDTH_EXPANDED)}`));

for (const key of keys) {
  console.log(
    key.padStart(LEFT_COLUMN_WIDTH),
    ...nativePaletteNames.map(
      (name) =>
        data[name][key].padStart(COLUMN_WIDTH) +
        ` ${generatedData[name][key] ? (data[name][key] === generatedData[name][key] ? '✅' : '❌') : '❔'} ` +
        (generatedData[name][key] ?? '').padEnd(COLUMN_WIDTH_EXPANDED),
    ),
  );
}
