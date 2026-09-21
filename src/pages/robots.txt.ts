import type { APIRoute } from 'astro';
import { abs } from '../lib/urls';
import { isSampleData } from '../lib/products';

export const GET: APIRoute = () => {
  // 샘플 데이터 빌드는 전체 차단, 실데이터 빌드는 검색 결과 페이지만 제외
  const body = isSampleData()
    ? 'User-agent: *\nDisallow: /\n'
    : ['User-agent: *', 'Allow: /', 'Disallow: /search/', '', `Sitemap: ${abs('/sitemap.xml')}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
