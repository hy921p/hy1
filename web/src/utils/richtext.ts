/**
 * AI 文本轻量排版（不引 markdown 依赖）
 * 模型回答里带 **加粗** / ### 标题 / - 列表 等 Markdown 记号，
 * 直接输出会把记号露给用户，这里转成安全的 HTML：先转义、再拼标签。
 * 仅用于展示，不参与任何逻辑判断。
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 行内记号：**加粗** / `代码` / 落单的 ** 与 *斜体* 记号去掉 */
function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*/g, '')
    .replace(/\*([^*\n]+)\*/g, '$1');
}

/** 纯文本预览：去掉记号，用于列表里的 2 行摘要 */
export function stripMd(raw?: string | null): string {
  return String(raw ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*·]\s+/gm, '')
    .trim();
}

/** 完整回答：段落 / 小标题 / 有序无序列表 → HTML 字符串（v-html 用） */
export function renderRichText(raw?: string | null): string {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n');
  if (!text.trim()) return '';

  const lines = text.split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }

    const heading = /^#{1,6}\s*(.+)$/.exec(t);
    if (heading) {
      closeList();
      out.push(`<div class="rt-h">${inline(heading[1])}</div>`);
      continue;
    }

    const ul = /^[-*·]\s+(.+)$/.exec(t);
    if (ul) {
      if (list !== 'ul') {
        closeList();
        out.push('<ul class="rt-list">');
        list = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = /^(\d+)[.、)）]\s*(.+)$/.exec(t);
    if (ol) {
      if (list !== 'ol') {
        closeList();
        out.push('<ol class="rt-list">');
        list = 'ol';
      }
      out.push(`<li>${inline(ol[2])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p class="rt-p">${inline(t)}</p>`);
  }
  closeList();
  return out.join('');
}
