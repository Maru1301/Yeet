import mermaid from 'mermaid';

let mermaidInitialized = false;

export function initMermaid(options: Record<string, unknown> = {}): void {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: { useMaxWidth: false },
    sequence: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
    journey: { useMaxWidth: false },
    timeline: { useMaxWidth: false },
    class: { useMaxWidth: false },
    state: { useMaxWidth: false },
    er: { useMaxWidth: false },
    pie: { useMaxWidth: false },
    quadrantChart: { useMaxWidth: false },
    xyChart: { useMaxWidth: false },
    requirement: { useMaxWidth: false },
    architecture: { useMaxWidth: false },
    mindmap: { useMaxWidth: false },
    kanban: { useMaxWidth: false },
    gitGraph: { useMaxWidth: false },
    c4: { useMaxWidth: false },
    sankey: { useMaxWidth: false },
    packet: { useMaxWidth: false },
    block: { useMaxWidth: false },
    radar: { useMaxWidth: false },
    ...options,
  });
  mermaidInitialized = true;
}

const WRAP_CLASS = 'mermaid-wrap';
const VIRTUAL_ROOT_CLASS = 'mermaid-download-virtual-root';
const MENU_CLASS = 'mermaid-context-menu';
const MENU_ITEM_CLASS = 'mermaid-context-menu-item';
const TOOLTIP_CLASS = 'mermaid-tooltip';
const TOOLTIP_VISIBLE_CLASS = 'is-visible';
const DOWNLOAD_BTN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M5 20h14v-2H5v2zm7-14v8.17l-2.59-2.58L8 13l4 4 4-4-1.41-1.41L13 14.17V6h-1z"/></svg>`;

let contextMenuEl: HTMLElement | null = null;
let contextMenuBound = false;
let activeContext: { wrapper: HTMLElement; index: number; } | null = null;

function serializeSvg(svgNode: SVGElement): string {
  const svgClone = svgNode.cloneNode(true) as SVGElement;
  if (!svgClone.getAttribute('xmlns')) {
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!svgClone.getAttribute('xmlns:xlink')) {
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }
  const styles = window.getComputedStyle(svgNode);
  const styleStr = Array.from(styles).reduce((str, prop) => `${str}${prop}:${styles.getPropertyValue(prop)};`, '');
  if (styleStr) {
    svgClone.setAttribute('style', styleStr);
  }
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgClone);
  svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgString}`;
  return svgString;
}

async function renderMermaidToSvgString(source: string, _renderWidth: number): Promise<string | null> {
  if (!source) return null;
  initMermaid();

  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
  document.body.appendChild(offscreen);

  const safeSource = sanitizeMermaidSource(source);
  const id = `mermaid-render-${Date.now()}`;

  try {
    const { svg } = await mermaid.render(id, safeSource, offscreen);
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svg}`;
  } catch (err: any) {
    console.error('[Mermaid Re-render Error]', err);
    return null;
  } finally {
    document.body.removeChild(offscreen);
  }
}

function ensureWrapper(container: HTMLElement, svg: SVGElement): HTMLElement {
  let wrapper = svg.parentElement as HTMLElement;
  if (!wrapper || !wrapper.classList || !wrapper.classList.contains(WRAP_CLASS)) {
    wrapper = document.createElement('div');
    wrapper.className = WRAP_CLASS;
    wrapper.style.position = 'relative';
    container.insertBefore(wrapper, svg);
    wrapper.appendChild(svg);
  }
  return wrapper;
}

async function downloadSvgFromWrapper(wrapper: HTMLElement, index: number): Promise<void> {
  const mermaidContainer = wrapper.closest('.mermaid') as HTMLElement || wrapper.parentElement as HTMLElement;
  const source = (mermaidContainer as HTMLElement & { dataset: DOMStringMap; })?.dataset?.mermaidSource || '';
  const renderWidth = mermaidContainer?.clientWidth || window.innerWidth;
  let svgString = await renderMermaidToSvgString(source, renderWidth);
  if (!svgString) {
    const targetSvg = wrapper.querySelector(':scope > svg') as SVGElement || wrapper.querySelector('svg') as SVGElement;
    if (!targetSvg) return;
    svgString = serializeSvg(targetSvg);
  }
  if (!svgString) return;
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mermaid-diagram-${Date.now()}-${index}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ensureContextMenu(): HTMLElement {
  if (contextMenuEl) return contextMenuEl;
  const menu = document.createElement('div');
  menu.className = MENU_CLASS;
  menu.setAttribute('role', 'menu');
  menu.style.position = 'fixed';
  menu.style.display = 'none';
  menu.style.zIndex = '9999';
  const item = document.createElement('button');
  item.type = 'button';
  item.className = MENU_ITEM_CLASS;
  item.innerHTML = `${DOWNLOAD_BTN_ICON}<span>Download SVG</span>`;
  item.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (!activeContext?.wrapper) return;
    const { wrapper, index } = activeContext;
    hideContextMenu();
    await downloadSvgFromWrapper(wrapper, index);
  });
  menu.appendChild(item);
  document.body.appendChild(menu);
  contextMenuEl = menu;
  if (!contextMenuBound) {
    contextMenuBound = true;
    document.addEventListener('click', (event) => {
      if (!contextMenuEl || contextMenuEl.style.display === 'none') return;
      if (contextMenuEl.contains(event.target as Node)) return;
      hideContextMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideContextMenu();
    });
    window.addEventListener('resize', hideContextMenu);
    window.addEventListener('scroll', hideContextMenu, true);
  }
  return contextMenuEl;
}

function hideContextMenu(): void {
  if (!contextMenuEl) return;
  contextMenuEl.style.display = 'none';
  contextMenuEl.setAttribute('aria-hidden', 'true');
  activeContext = null;
}

function showContextMenu({ x, y, wrapper, index }: { x: number; y: number; wrapper: HTMLElement; index: number; }): void {
  const menu = ensureContextMenu();
  activeContext = { wrapper, index };
  menu.style.display = 'block';
  menu.setAttribute('aria-hidden', 'false');
  let left = x;
  let top = y;
  const rect = menu.getBoundingClientRect();
  const padding = 8;
  if (left + rect.width > window.innerWidth) {
    left = window.innerWidth - rect.width - padding;
  }
  if (top + rect.height > window.innerHeight) {
    top = window.innerHeight - rect.height - padding;
  }
  menu.style.left = `${Math.max(padding, left)}px`;
  menu.style.top = `${Math.max(padding, top)}px`;
}

function bindContextMenu(wrapper: HTMLElement, index: number): void {
  if ((wrapper as any).dataset.mermaidContextMenu === 'true') return;
  (wrapper as any).dataset.mermaidContextMenu = 'true';
  wrapper.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideTooltip(wrapper);
    showContextMenu({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY, wrapper, index });
  });
}

function ensureTooltip(wrapper: HTMLElement, index: number): HTMLElement {
  const existing = wrapper.querySelector(`:scope > .${TOOLTIP_CLASS}`) as HTMLElement;
  if (existing) return existing;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = TOOLTIP_CLASS;
  btn.setAttribute('aria-label', 'Download SVG');
  btn.innerHTML = `${DOWNLOAD_BTN_ICON}<span>Download SVG</span>`;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    hideTooltip(wrapper);
    await downloadSvgFromWrapper(wrapper, index);
  });
  wrapper.appendChild(btn);
  return btn;
}

function hideTooltip(wrapper: HTMLElement): void {
  const tooltip = wrapper.querySelector(`:scope > .${TOOLTIP_CLASS}`) as HTMLElement;
  if (!tooltip) return;
  tooltip.classList.remove(TOOLTIP_VISIBLE_CLASS);
  tooltip.setAttribute('aria-hidden', 'true');
}

function bindTooltip(wrapper: HTMLElement, index: number): void {
  if ((wrapper as any).dataset.mermaidTooltip === 'true') return;
  (wrapper as any).dataset.mermaidTooltip = 'true';
  const btn = ensureTooltip(wrapper, index);
  wrapper.addEventListener('mouseenter', () => {
    btn.classList.add(TOOLTIP_VISIBLE_CLASS);
    btn.setAttribute('aria-hidden', 'false');
  });
  wrapper.addEventListener('mouseleave', () => {
    hideTooltip(wrapper);
  });
}

export function bindMermaidInteractions(querySelector: string): void {
  const nodes = Array.from(document.querySelectorAll(querySelector) as NodeListOf<HTMLElement>);
  nodes.forEach((node, index) => {
    const svg = node.querySelector(':scope > svg') as SVGElement ?? node.querySelector('svg') as SVGElement;
    if (!svg) return;
    const wrapper = ensureWrapper(node, svg);
    bindContextMenu(wrapper, index);
    bindTooltip(wrapper, index);
  });
}

export async function renderMermaidWithDownloads(querySelector: string): Promise<void> {
  initMermaid();

  const nodes = Array.from(document.querySelectorAll(querySelector) as NodeListOf<HTMLElement>)
    .filter(node => !node.hasAttribute('data-rendered'));
  if (!nodes.length) return;

  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
  document.body.appendChild(offscreen);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const rawSource = node.textContent?.trim() ?? '';
    if (!rawSource) continue;

    // 1. 語法預處理
    const safeSource = sanitizeMermaidSource(rawSource);
    const id = `mermaid-svg-${Date.now()}-${i}`;

    try {
      // 2. 執行渲染
      const { svg } = await mermaid.render(id, safeSource, offscreen);

      // 3. 注入渲染後的 SVG
      node.innerHTML = svg;
      const svgEl = node.querySelector('svg') as SVGElement;
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
      }

      // 4. 保存原始源碼供下載功能使用 (重要)
      node.dataset.mermaidSource = rawSource;
      node.setAttribute('data-rendered', 'true');

      // 5. 綁定下載工具 (Tooltip & ContextMenu)
      const wrapper = ensureWrapper(node, svgEl);
      bindContextMenu(wrapper, i);
      bindTooltip(wrapper, i);

    } catch (err: any) {
      console.warn('[Mermaid Render Error]', err?.message || err);
      node.setAttribute('data-rendered', 'error');
      // 發生錯誤時的降級顯示
      node.innerHTML = `<div style="color: #ff4d4f; padding: 10px; border: 1px dashed;">
        ⚠️ Diagram Render Error. 
        <details><summary>View Source</summary><pre>${rawSource}</pre></details>
      </div>`;
    }
  }

  document.body.removeChild(offscreen);
}

function sanitizeMermaidSource(source: string): string {

  source = source.replace(/[–]/g, '--');

  // 找出節點的完整括號範圍（支援巢狀）
  function extractNodeContent(str: string, startIdx: number): { content: string, endIdx: number; } | null {
    // 判斷起始括號類型
    const openers: Record<string, string> = {
      '[': ']', '(': ')', '{': '}'
    };

    let i = startIdx;
    let open = str[i];
    let close = openers[open];
    if (!close) return null;

    // 處理雙重起始括號 [[ (( {{ [(
    let openSeq = open;
    let closeSeq = close;
    if (str[i + 1] === open || (open === '[' && str[i + 1] === '(')) {
      openSeq = str[i] + str[i + 1];
      closeSeq = open === '[' && str[i + 1] === '(' ? ')]' : close + close;
      i += 2;
    } else {
      i += 1;
    }

    // 逐字元掃描，追蹤深度
    let depth = 1;
    let content = '';
    while (i < str.length) {
      // 嘗試匹配結束序列
      if (str.slice(i, i + closeSeq.length) === closeSeq && depth === 1) {
        return { content, endIdx: i + closeSeq.length - 1 };
      }
      // 遇到同類開括號，深度+1
      if (str[i] === open) depth++;
      // 遇到對應閉括號，深度-1
      if (str[i] === close) depth--;
      content += str[i];
      i++;
    }
    return null; // 括號不匹配
  }

  const sanitizeContent = (content: string, openSeq: string, closeSeq: string): string => {
    const clean = content.trim().replace(/^"(.*)"$/, '$1');
    // 將內容中的括號換成全形，避免 Mermaid 解析誤判
    const escaped = clean.replace(/\(/g, '（').replace(/\)/g, '）')
      .replace(/\[/g, '【').replace(/\]/g, '】');
    return `${openSeq}"${escaped}"${closeSeq}`;
  };

  // 修正單個 % 註解
  let result = source.replace(/^%(?!%)/gm, '%%');

  // 掃描所有節點 ID + 括號組合
  result = result.replace(/(\w+)(?=[\[\(\{])/g, (match, id, offset) => {
    const afterId = offset + id.length;
    const extracted = extractNodeContent(result, afterId);
    // 僅標記位置，實際替換在下方逐位處理
    return match;
  });

  // 改用逐字元處理，找出 word+ 括號 的組合
  let output = '';
  let i = 0;
  while (i < result.length) {
    // 嘗試匹配節點 ID
    const idMatch = result.slice(i).match(/^(\w+)([\[\(\{])/);
    if (idMatch) {
      const id = idMatch[1];
      const startBracket = i + id.length;

      const openers: Record<string, string> = { '[': ']', '(': ')', '{': '}' };
      const openChar = result[startBracket];
      const closeChar = openers[openChar];

      if (closeChar) {
        // 判斷是否雙重括號
        const nextChar = result[startBracket + 1];
        const isDouble = nextChar === openChar || (openChar === '[' && nextChar === '(');
        const openSeq = isDouble ? openChar + nextChar : openChar;
        const closeSeq = openChar === '[' && nextChar === '(' ? ')]'
          : isDouble ? closeChar + closeChar
            : closeChar;

        // 從內容起點開始掃描
        let j = startBracket + openSeq.length;
        let depth = 1;
        let content = '';
        let found = false;

        while (j < result.length) {
          const slice = result.slice(j, j + closeSeq.length);
          if (slice === closeSeq && depth === 1) {
            // 找到對應結尾
            output += id + sanitizeContent(content, openSeq, closeSeq);
            i = j + closeSeq.length;
            found = true;
            break;
          }
          if (result[j] === openChar) depth++;
          if (result[j] === closeChar) depth--;
          content += result[j];
          j++;
        }

        if (found) continue;
      }
    }

    output += result[i];
    i++;
  }

  return output;
}