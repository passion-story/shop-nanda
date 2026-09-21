import { href } from './urls';

/**
 * 스마트스토어 이미지 URL 처리.
 * - 엑셀/CSV 에는 `http://shop1.phinf.naver.net/...` 형태가 들어오는데, 이 호스트는 https 인증서가 맞지 않아
 *   https 사이트에서 차단된다. 같은 경로가 `https://shop-phinf.pstatic.net` 에서 제공되므로 호스트를 바꾼다.
 * - 원본은 1100px/800KB 수준이라, 용도별로 네이버 이미지 서버의 리사이즈 프리셋(?type=)을 사용한다.
 *   (허용된 프리셋만 동작한다: f120_120, f300_300, f640_640, m510, m1000 …  임의 크기는 실패)
 */
const LEGACY_HOST = /^https?:\/\/shop\d*\.phinf\.naver\.net/i;
const CDN = 'https://shop-phinf.pstatic.net';

const isNaverCdn = (u: string) => u.startsWith(CDN + '/');

export function secureImage(url: string): string {
  if (url.startsWith('/')) return href(url); // 사이트 내부 파일(샘플 이미지)
  return url.replace(LEGACY_HOST, CDN).replace(/^http:\/\//i, 'https://');
}

const withType = (u: string, type: string) => `${u}${u.includes('?') ? '&' : '?'}type=${type}`;

/** 원본 (구조화 데이터 등) */
export const imageFull = secureImage;

/** 크기 프리셋 적용 (네이버 CDN 이미지에만 적용) */
export function imageSized(url: string, type: 'f120_120' | 'f300_300' | 'f640_640' | 'm510' | 'm1000'): string {
  const u = secureImage(url);
  return isNaverCdn(u) ? withType(u, type) : u;
}

/** 상품 카드용 srcset (화면 밀도에 따라 300px / 640px 선택) */
export function cardImage(url: string): { src: string; srcset?: string } {
  const u = secureImage(url);
  if (!isNaverCdn(u)) return { src: u };
  return { src: withType(u, 'f300_300'), srcset: `${withType(u, 'f300_300')} 300w, ${withType(u, 'f640_640')} 640w` };
}

export const CARD_SIZES = '(max-width: 640px) 50vw, (max-width: 960px) 33vw, 280px';
