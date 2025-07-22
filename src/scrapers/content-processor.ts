import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import sanitizeHtml from 'sanitize-html';
import { configureTurndownService } from '../utils/markdown-formatters.js';
import { markCodeParents } from '../utils/html-helpers.js';

/**
 * Processes HTML content to extract the main content and convert it to Markdown
 * @param htmlContent The raw HTML content to process
 * @returns Markdown formatted content
 */
export async function processHtmlContent(htmlContent: string): Promise<string> {
  // Create DOM
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Mark code blocks to influence Readability scoring
  const preElements = document.querySelectorAll('pre');
  preElements.forEach(pre => {
    // Add classes that Readability considers as content
    pre.classList.add('article-content');
    // Set a very high readable score
    pre.setAttribute('data-readable-content-score', '100');
    // Make parent more likely to be kept
    if (pre.parentElement) {
      pre.parentElement.classList.add('article-content');
    }
  });

  document.querySelectorAll('pre, code').forEach(pre => {
    markCodeParents(pre.parentElement);
  });

  // Modify Readability options to be more lenient
  const readerOptions = {
    charThreshold: 20,
    classesToPreserve: ['article-content'],
  };

  // Now run Readability
  const reader = new Readability(document, readerOptions);
  const article = reader.parse();

  // Continue with sanitization and markdown conversion
  if (!article) {
    throw new Error('Failed to parse the article content.');
  }
  
  const cleanHtml = sanitizeHtml(article.content, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol',
      'li', 'b', 'i', 'strong', 'em', 'code', 'pre',
      'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      'a': ['href'],
      'pre': ['class', 'data-language'],
      'code': ['class', 'data-language'],
      'div': ['class'],
      'span': ['class']
    }
  });

  const turndownService = configureTurndownService();
  const markdown = turndownService.turndown(cleanHtml);
  
  return markdown;
}