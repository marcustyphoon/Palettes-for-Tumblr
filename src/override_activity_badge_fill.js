import { svg, use } from './dom.js';

await new Promise((resolve) =>
  document.readyState === 'loading'
    ? document.addEventListener('readystatechange', resolve, { once: true })
    : resolve()
);

// Wait for full managed icon list to be fetched.
const managedIconRepository = document.getElementById('managed-icon-repository');
await new Promise((resolve) =>
  new MutationObserver(() => managedIconRepository.childElementCount > 500 && resolve())
    .observe(managedIconRepository, { childList: true })
);

const replacableBadgeTypes = [...managedIconRepository.querySelectorAll(':scope > svg[id^="managed-icon__badge-"]')]
  .map(element => element.id.replace('managed-icon__badge-', ''));

const processBadgeElements = badgeElements => badgeElements
  .forEach(badgeElement => {
    const type = replacableBadgeTypes.find(type => badgeElement.style.backgroundImage.includes(type));
    type &&
      badgeElement.append(
        svg({ 'data-palettes-for-tumblr': '' }, [
          use({ href: `#managed-icon__badge-${type}` })
        ])
      );
  });

const selector = 'div[role="presentation"][style*="https://assets.tumblr.com/images/activity/badge_"][style*=".svg"]';

/**
 * see src/utils/mutations.js in XKit Rewritten
 */

const rootNode = document.getElementById('root');
const addedNodesPool = [];
let repaintQueued = false;

const onBeforeRepaint = () => {
  repaintQueued = false;

  const addedNodes = addedNodesPool
    .splice(0)
    .filter(addedNode => addedNode.isConnected);

  if (addedNodes.length === 0) return;

  const matchingElements = [
    ...addedNodes.filter(addedNode => addedNode.matches(selector)),
    ...addedNodes.flatMap(addedNode => [...addedNode.querySelectorAll(selector)]),
  ].filter((value, index, array) => index === array.indexOf(value));

  if (matchingElements.length !== 0) {
    processBadgeElements(matchingElements);
  }
};

const observer = new MutationObserver(mutations => {
  const addedNodes = mutations
    .flatMap(({ addedNodes }) => [...addedNodes])
    .filter(addedNode => addedNode instanceof Element);

  addedNodesPool.push(...addedNodes);

  if (repaintQueued === false) {
    requestAnimationFrame(onBeforeRepaint);
    repaintQueued = true;
  }
});

observer.observe(rootNode, { childList: true, subtree: true });
processBadgeElements([...document.querySelectorAll(selector)]);
