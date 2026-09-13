// Flattens a Jira "Atlassian Document Format" node tree (the shape of a Jira
// Cloud issue's `description` field) into plain text, so it's cheap and clean
// to hand to a model instead of a raw ADF JSON blob.
//
// Only handles the node types that actually show up in hand-written ticket
// descriptions/acceptance criteria (paragraphs, headings, lists, code blocks,
// blockquotes, hard breaks). Anything else falls back to just walking its
// `content` children, so unrecognized nodes never crash the conversion — they
// just contribute whatever text their children hold.

function adfToText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';

  const children = (node.content || []).map(adfToText);

  switch (node.type) {
    case 'doc':
      return children.join('\n\n');
    case 'paragraph':
      return children.join('');
    case 'heading':
      return children.join('');
    case 'hardBreak':
      return '\n';
    case 'bulletList':
    case 'orderedList':
      return children.join('\n');
    case 'listItem':
      return `- ${children.join('')}`;
    case 'codeBlock':
      return `\`\`\`\n${children.join('')}\n\`\`\``;
    case 'blockquote':
      return children.map((c) => `> ${c}`).join('\n');
    default:
      return children.join('');
  }
}

module.exports = { adfToText };
