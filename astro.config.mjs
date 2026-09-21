import { defineConfig } from 'astro/config';

// 도메인은 이 한 곳에서만 관리한다. (커스텀 도메인으로 옮길 때: SITE_URL 환경변수 또는 아래 값만 수정)
// - 기본값은 github.io 프로젝트 사이트(passion-story.github.io/shop-nanda)이며 base 는 '/shop-nanda' 이다.
// - 커스텀 도메인(shopnanda.co.kr) 연결이 끝나면 저장소 Variables 에 SITE_URL=https://shopnanda.co.kr, BASE_PATH=/ 를 등록하고 재배포한다.
//   (코드 수정 불필요. 도메인 연결 전에 등록하면 github.io 주소에서 CSS/이미지 경로가 깨진다.)
// sitemap.xml / robots.txt 는 src/pages 의 엔드포인트가 이 값을 사용해 생성한다.
const SITE_URL = process.env.SITE_URL || 'https://passion-story.github.io';
const BASE_PATH = process.env.BASE_PATH || '/shop-nanda';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
});
