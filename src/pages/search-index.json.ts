import type { APIRoute } from 'astro';
import { getListed } from '../lib/products';
import { href } from '../lib/urls';
import { imageSized } from '../lib/images';

// 클라이언트 검색용 경량 인덱스 (n: 이름, t: 태그, c: 카테고리, p: 판매가, r: 할인율, i: 이미지, u: URL)
export const GET: APIRoute = () => {
  const items = getListed().map((p) => ({
    n: p.name,
    t: p.tags,
    c: p.category.name,
    p: p.salePrice,
    r: p.discountRate,
    i: p.image ? imageSized(p.image, 'f300_300') : null,
    u: href(p.path),
  }));
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
