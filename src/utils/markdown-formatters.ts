import TurndownService from 'turndown';

/**
 * Configures a Turndown service with custom rules for code blocks, tables, etc.
 * @returns A configured TurndownService instance
 */
export function configureTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    headingStyle: 'atx'
  });

  // Code blocks rule
  turndownService.addRule('codeBlocks', {
    filter: function (node) {
      return node.nodeName === 'PRE';
    },
    replacement: function (content, node) {
      // Cast node to HTMLElement to access getAttribute
      const htmlNode = node as HTMLElement;
      const code = htmlNode.querySelector('code');
      const language = code?.className?.match(/language-(\w+)/)?.[1] ||
                      htmlNode.getAttribute('data-language') ||
                      'yaml';

      const cleanContent = content
        .replace(/^\n+|\n+$/g, '')
        .replace(/\n\n+/g, '\n');

      return `\n\`\`\`${language}\n${cleanContent}\n\`\`\`\n`;
    }
  });

  // Table cell rule
  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function (content, node) {
      const htmlNode = node as HTMLElement;

      // Extract text from nested paragraph if present
      let cellContent = '';
      if (htmlNode.querySelector('p')) {
        cellContent = Array.from(htmlNode.querySelectorAll('p'))
          .map(p => p.textContent || '')
          .join(' ')
          .trim();
      } else {
        cellContent = content.trim();
      }

      return ` ${cellContent.replace(/\|/g, '\\|')} |`;
    }
  });

  // Table row rule
  turndownService.addRule('tableRow', {
    filter: 'tr',
    replacement: function (content, node) {
      const htmlNode = node as HTMLTableRowElement;
      const cells = Array.from(htmlNode.cells);
      const isHeader = htmlNode.parentNode?.nodeName === 'THEAD';

      let output = '|' + content.trimEnd();

      // If this is a header row, add the separator row without extra newline
      if (isHeader) {
        const separator = cells.map(() => '---').join(' | ');
        output += '\n|' + separator + '|';
      }

      // Only add newline if not a header row or if there's no next row
      if (!isHeader || !htmlNode.nextElementSibling) {
        output += '\n';
      }

      return output;
    }
  });

  // Table rule
  turndownService.addRule('table', {
    filter: 'table',
    replacement: function (content) {
      // Clean up any potential double newlines
      return '\n' + content.replace(/\n+/g, '\n').trim() + '\n';
    }
  });

  // Custom rule to preserve whitespace in table cells
  turndownService.addRule('preserveTableWhitespace', {
    filter: function (node) {
      return (
        (node.nodeName === 'TD' || node.nodeName === 'TH') &&
        node.textContent?.trim().length === 0
      );
    },
    replacement: function () {
      return ' |';
    }
  });

  return turndownService;
}