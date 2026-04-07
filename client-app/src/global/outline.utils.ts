/**
 * deriveLabel — extract a short label from message content.
 *
 * Rules (mirrors Go deriveLabel in main.go):
 * 1. Strip leading/trailing whitespace.
 * 2. If content starts with a code fence (``` or ~~~), skip to first non-fence line.
 * 3. Split on whitespace; take first 8 tokens.
 * 4. Join with single space.
 * 5. If result exceeds 60 bytes (UTF-8), trim to last full word within 60 bytes and append "…".
 * 6. If result is empty, return "[media]".
 */
export function deriveLabel(content: string): string {
  content = content.trim();
  if (!content) return '[media]';

  // Skip leading code-fence: extract only lines inside the fence block
  const lines = content.split('\n');
  let selectedLines: string[];
  if (lines[0].startsWith('```') || lines[0].startsWith('~~~')) {
    const inner: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('```') || lines[i].startsWith('~~~')) break;
      inner.push(lines[i]);
    }
    selectedLines = inner;
  } else {
    selectedLines = lines;
  }

  const text = selectedLines.join(' ').trim();
  if (!text) return '[media]';

  const words = text.split(/\s+/).filter(Boolean).slice(0, 8);
  let label = words.join(' ');

  // Trim to last full word within 60 UTF-8 bytes
  const encoder = new TextEncoder();
  if (encoder.encode(label).length > 60) {
    // Walk back word by word until it fits
    while (words.length > 0 && encoder.encode(words.join(' ')).length > 60) {
      words.pop();
    }
    label = words.join(' ');
    return label + '…';
  }

  return label || '[media]';
}
