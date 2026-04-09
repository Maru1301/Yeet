import markdownit from 'markdown-it';
import hljs from 'highlight.js';

export const md = (() => {
  const mdInstance = markdownit({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true,
    highlight(str: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code class="hljs">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch (__) { /* ignore */ }
      }
      return `<pre><code class="hljs">${markdownit().utils.escapeHtml(str)}</code></pre>`;
    },
  });
  const fence = mdInstance.renderer.rules.fence;
  mdInstance.renderer.rules.fence = function (tokens: any, idx: number, options: any, env: any, self: any) {
    const info = (tokens[idx].info || '').trim().toLowerCase();
    if (info === 'mermaid' || info === '{mermaid}') {
      return `<div class="mermaid">${tokens[idx].content}</div>`;
    }
    return fence ? fence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };
  return mdInstance;
})();

export const mdUser = markdownit({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
});

export function toHtml(text: string, mdInstance = md): string {
  return mdInstance.render(text).replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
}

export function parseStreamBuffer(buffer: string): string {
  let text = '';
  const events = buffer.split('\n\n');
  events.forEach((chunk) => {
    const match = chunk.trim().match(/\{.*"[ve]"\s*:\s*".*?"\s*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.v) text += parsed.v;
        if (parsed.e) console.error('Error Stream Buffer:', parsed.e);
      } catch (e) {
        console.error('Error Stream Buffer:', e);
      }
    }
  });
  return text;
}

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

export function bindCodeCopyButtons(querySelector: string): void {
  document.querySelectorAll(querySelector).forEach(container => {
    container.querySelectorAll<HTMLElement>('pre').forEach(pre => {
      if (pre.dataset.copyBound === 'true') return;
      pre.dataset.copyBound = 'true';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = COPY_ICON;

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = pre.querySelector('code')?.textContent ?? '';
        await navigator.clipboard.writeText(text);
        btn.innerHTML = CHECK_ICON;
        btn.classList.add('code-copy-btn--copied');
        setTimeout(() => {
          btn.innerHTML = COPY_ICON;
          btn.classList.remove('code-copy-btn--copied');
        }, 2000);
      });

      pre.appendChild(btn);
    });
  });
}
