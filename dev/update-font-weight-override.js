import fs from 'node:fs/promises';
import cssParser from 'css';

try {
  const fontWeight350Rules = [];

  const sw = await fetch('https://www.tumblr.com/sw.js').then((result) => result.text());
  const urls = sw.match(/https:\/\/assets\.tumblr\.com\/pop\/[a-z0-9-]+\.css/g);
  for (const url of urls) {
    console.log('downloading', url);
    const cssText = await fetch(url).then((response) => response.text());

    const ast = cssParser.parse(cssText);
    const rules = ast.stylesheet.rules
      .flatMap((rule) => rule.rules ?? [rule])
      .filter((rule) => rule.type === 'rule');

    fontWeight350Rules.push(...rules.filter(
      ({ declarations }) =>
        declarations.find(({ property, value }) => property === 'font-family' && value === 'var(--font-family-modern)') &&
        declarations.find(({ property, value }) => property === 'font-weight' && value === '350')
    ));
  }

  const selectorSets = [...new Set(fontWeight350Rules.map(({ selectors }) => selectors.join(', ')))];

  const override = `/*
Tumblr uses an unusual font weight of 350 on most --font-family-modern (Favorit Modern)
text, which may result in thin text when overriding the --font-family-modern variable.

This file is automatically generated by dev/update-font-weight-override.js and contains
the selectors of all native Tumblr rules which set font-family: var(--font-family-modern)
and font-weight: 350.
*/
${selectorSets.join(',\n')} {
  font-weight: normal;
}\n`;

  await fs.writeFile('src/fontWeightOverride.css', override, { encoding: 'utf8', flag: 'w+' });
  console.log(`wrote ${selectorSets.length} selector sets`);
} catch (e) {
  console.log(e);
}
