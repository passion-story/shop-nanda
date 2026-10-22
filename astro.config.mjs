import { defineConfig } from 'astro/config';

// 도메인은 이 한 곳에서만 관리한다. (커스텀 도메인으로 옮길 때: SITE_URL 환경변수 또는 아래 값만 수정)
// - 기본값은 github.io 프로젝트 사이트(passion-story.github.io/shop-nanda)이며 base 는 '/shop-nanda' 이다.
// - 커스텀 도메인(www.shopnanda.com) 연결이 끝나면 저장소 Variables 에 SITE_URL=https://www.shopnanda.com, BASE_PATH=/ 를 등록하고 재배포한다.
//   (코드 수정 불필요. 도메인 연결 전에 등록하면 github.io 주소에서 CSS/이미지 경로가 깨진다.)
// sitemap.xml / robots.txt 는 src/pages 의 엔드포인트가 이 값을 사용해 생성한다.
const SITE_URL = process.env.SITE_URL || 'https://passion-story.github.io';
const BASE_PATH = process.env.BASE_PATH || '/shop-nanda';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // GitHub Pages 는 응답 헤더를 바꿀 수 없어, 빌드 시 인라인 스크립트·스타일 해시로 만든 CSP 를 <meta> 로 넣는다.
  // 외부 리소스를 새로 쓰면(이미지 호스트, 분석 도구 등) 아래 목록에 추가해야 차단되지 않는다.
  security: {
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: { resources: ["'self'", 'https://www.googletagmanager.com'] },
      styleDirective: { resources: ["'self'", 'https://cdn.jsdelivr.net'] },
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://shop-phinf.pstatic.net https://phinf.pstatic.net https://www.googletagmanager.com https://*.google-analytics.com",
        "font-src 'self' https://cdn.jsdelivr.net",
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ],
    },
  },
});
