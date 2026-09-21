import type { APIRoute } from 'astro';
import { CATEGORIES } from '../config/categories';
import { getByCategory, getListed, syncedAt } from '../lib/products';
import { abs } from '../lib/urls';

// 색인 대상(noindex 아닌 페이지)만 정확히 담기 위해 직접 생성한다.
// 삭제/판매중지 상품과 상품이 없는 카테고리는 제외된다.
export const GET: APIRoute = () => {
  const day = (d?: string | Date) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
  const dataDate = day(syncedAt()) ?? day(new Date());

  const urls: { path: string; lastmod?: string }[] = [
    { path: '/', lastmod: dataDate },
    { path: '/best/', lastmod: dataDate },
    { path: '/new/', lastmod: dataDate },
    { path: '/products/', lastmod: dataDate },
    ...CATEGORIES.filter((c) => getByCategory(c.slug).length > 0).map((c) => ({ path: `/category/${c.slug}/`, lastmod: dataDate })),
    ...getListed().map((p) => ({ path: p.path, lastmod: day(p.modifiedAt) ?? dataDate })),
    { path: '/about/' },
    { path: '/shipping/' },
    { path: '/faq/' },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${abs(u.path)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
