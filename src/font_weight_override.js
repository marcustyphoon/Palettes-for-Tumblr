const styleElement = Object.assign(document.createElement('style'), {
  id: 'palettes-for-tumblr-override'
});
document.getElementById('palettes-for-tumblr-override')?.remove();
document.documentElement.append(styleElement);

const styleSheets = new Set();
const selectors = new Set();

setInterval(() => {
  const timer = performance.now();

  const newStyleSheets = [...document.styleSheets].filter(sheet => !styleSheets.has(sheet));
  newStyleSheets.forEach(sheet => styleSheets.add(sheet));

  if (newStyleSheets.length) {
    console.log(newStyleSheets);
    let updated = false;

    const allCssStyleRules = newStyleSheets
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch (e) {
          console.log(sheet);
          console.log(e);
          return [];
        }
      })
      .flatMap((rule) => (rule instanceof CSSMediaRule ? [...rule.cssRules] : [rule]))
      .filter((rule) => rule instanceof CSSStyleRule && rule.style)
      .flatMap(({ selectorText, style }) => ({
        selectorText,
        rules: Object.fromEntries([...style].map((key) => [key, style.getPropertyValue(key)]))
      }));

    allCssStyleRules
      .filter(
        ({ rules }) =>
          rules['font-family'] === 'var(--font-family-modern)' &&
          rules['font-weight'] === '350'
      )
      .forEach(({ selectorText }) => {
        if (!selectors.has(selectorText)) {
          updated = true;
          selectors.add(selectorText);
        }
      });

    if (updated) {
      styleElement.textContent = `
        body.override-font-family-modern-weight :is(${[...selectors].join(', ')}) {
          font-weight: normal;
        }
      `;
    }
    console.log('processed in', performance.now() - timer, 'ms');
  }
}, 100);
