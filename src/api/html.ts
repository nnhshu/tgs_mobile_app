/** Xử lý HTML mô tả sản phẩm từ WordPress thành dữ liệu hiển thị native (không cần WebView). */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

export const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);

/** HTML → text: giữ xuống dòng cho <br>, <p>, <li>, heading; bỏ các thẻ còn lại. */
export const htmlToText = (html: string) =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/(p|div|h[1-6]|li|tr|ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export type SpecRow = { label: string; value: string };
export type DescSection = { title: string; body: string };

/** Bảng thông số <table class="tgs-spec-table"><tr><th>Nhãn</th><td>Giá trị</td></tr>. */
export function parseSpecTable(html: string): SpecRow[] {
  const table = html.match(/<table[^>]*tgs-spec-table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return [];
  const rows: SpecRow[] = [];
  for (const m of table.matchAll(/<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    const label = htmlToText(m[1]);
    const value = htmlToText(m[2]);
    if (label && value) rows.push({ label, value });
  }
  return rows;
}

/**
 * Các khối nội dung sau bảng thông số: khối thu gọn (.tgs-collapsible-btn / -content)
 * và các tiêu đề <h2>/<h3> (vd "Hướng dẫn sử dụng").
 */
export function parseSections(html: string): DescSection[] {
  const rest = html.replace(/<table[^>]*tgs-spec-table[\s\S]*?<\/table>/i, '');
  const sections: DescSection[] = [];

  const withoutCollapsibles = rest.replace(
    /<div[^>]*tgs-collapsible-btn[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*tgs-collapsible-content[^>]*>([\s\S]*?)<\/div>/gi,
    (_, title: string, body: string) => {
      sections.push({ title: htmlToText(title.replace(/<span[^>]*tgs-plus-icon[^>]*>[\s\S]*?<\/span>/gi, '')), body: htmlToText(body) });
      return '';
    },
  );

  const parts = withoutCollapsibles.split(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
  const intro = htmlToText(parts[0] ?? '');
  if (intro) sections.unshift({ title: 'Mô tả sản phẩm', body: intro });
  for (let i = 1; i < parts.length; i += 2) {
    const title = htmlToText(parts[i]);
    const body = htmlToText(parts[i + 1] ?? '');
    if (title && body) sections.push({ title, body });
  }
  return sections.map((s) => ({ ...s, title: capitalize(s.title) }));
}

const capitalize = (s: string) => {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
