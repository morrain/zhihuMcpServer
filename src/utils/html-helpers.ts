/**
 * Recursively marks parent elements of code blocks to ensure they're preserved
 * @param node The DOM node to check and mark
 */
export function markCodeParents(node: Element | null) {
    if (!node) return;
  
    // If the node contains a <pre> or <code>, mark it
    if (node.querySelector('pre, code')) {
      node.classList.add('article-content');
      node.setAttribute('data-readable-content-score', '100');
    }
  
    // Recursively mark parents
    markCodeParents(node.parentElement);
  }