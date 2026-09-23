import type { APIRoute } from 'astro';
import { abs } from '../lib/urls';
import { isSampleData } from '../lib/products';

// 허용할 검색엔진 수집기만 이름으로 명시하고, 그 외 모든 크롤러(User-agent: *)는 차단한다.
// - Googlebot: 구글 검색 (Googlebot-Image 등 세부 수집기는 별도 그룹이 없으면 이 규칙을 그대로 따른다)
// - Yeti: 네이버 검색
// ⚠ robots.txt는 '요청'일 뿐 강제력이 없다. 표준을 지키는 수집기(구글·네이버 등)에는 효과가 있지만,
//   이를 무시하는 스크래퍼·일부 AI 학습용 크롤러까지 완전히 차단하지는 못한다(정적 호스팅이라 서버 단 차단 불가).
const ALLOWED_BOTS = ['Googlebot', 'Yeti'];

export const GET: APIRoute = () => {
  // 샘플 데이터 빌드는 전체 차단
  if (isSampleData()) {
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const lines = [
    ...ALLOWED_BOTS.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', 'Disallow: /search/', '']),
    'User-agent: *',
    'Disallow: /',
    '',
    `Sitemap: ${abs('/sitemap.xml')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
