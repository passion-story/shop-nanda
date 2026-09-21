import { defineConfig } from 'astro/config';

// 도메인은 이 한 곳에서만 관리한다. (커스텀 도메인으로 옮길 때: SITE_URL 환경변수 또는 아래 값만 수정)
// - 커스텀 도메인(shopnanda.co.kr)은 루트 경로에서 서비스되므로 base 는 '/' 이다.
// - github.io 프로젝트 사이트(passion-story.github.io/shop-nanda)로 되돌리려면 SITE_URL=https://passion-story.github.io, BASE_PATH=/shop-nanda 를 지정한다.
// sitemap.xml / robots.txt 는 src/pages 의 엔드포인트가 이 값을 사용해 생성한다.
const SITE_URL = process.env.SITE_URL || 'https://shopnanda.co.kr';
const BASE_PATH = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
});
