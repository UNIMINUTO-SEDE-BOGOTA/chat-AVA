// ============================================================
// core/utils/formatMessage.ts
// Convierte texto plano / markdown ligero a HTML seguro.
// ============================================================

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMessage(text: string): string {
  const raw = String(text ?? '');
  const codeBlocks: string[] = [];

  // Extract fenced code blocks before escaping
  const withoutCode = raw.replace(/```([\s\S]*?)```/g, (_, code: string) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return token;
  });

  let html = escapeHtml(withoutCode)
    .replace(/^### (.+)$/gm, '<h3 class="msg-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="msg-h2">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/(https?:\/\/[^\s<]+)/g, (url: string) => {
      const clean = url.replace(/[),.;]$/, '');
      const trailing = url.slice(clean.length);
      const isDoc = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(clean);
      const cls = isDoc ? ' class="doc-link"' : '';
      return `<a href="${clean}" target="_blank" rel="noopener noreferrer"${cls}>${isDoc ? '📄 ' : ''}${clean}</a>${trailing}`;
    })
    .replace(/\n/g, '<br>');

  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block);
  });

  return html;
}