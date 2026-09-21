# 샵난다

[샵난다](https://smartstore.naver.com/shopnanda) 상품 소개 웹사이트 
<!-- — https://passion-story.github.io/shop-nanda -->

[Astro](https://astro.build) 기반 정적 사이트입니다.

## 개발

Node.js 22 이상

```bash
npm install
npm run dev     # 개발 서버 (http://localhost:4321)
npm run build   # dist/ 생성
npm run check   # 타입 검사
```

## 배포와 도메인

GitHub Actions(`.github/workflows/deploy.yml`)가 `main` 푸시 시 GitHub Pages로 배포합니다.
도메인과 base 경로는 `astro.config.mjs` 기본값(`https://passion-story.github.io` + `/shop-nanda`)을 쓰며,
저장소 **Settings > Secrets and variables > Actions > Variables** 의 `SITE_URL`, `BASE_PATH` 로 코드 수정 없이 덮어쓸 수 있습니다.

### 커스텀 도메인(www.shopnanda.com) 연결 절차

순서를 지키지 않으면 CSS/이미지 경로가 깨집니다.

1. **DNS (가비아 > DNS 관리)**
   - `www` CNAME → `passion-story.github.io`
   - (선택) apex `shopnanda.com` A 레코드 → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` — 등록하면 GitHub 가 `shopnanda.com` 을 `www.shopnanda.com` 으로 리다이렉트합니다.
2. **Settings > Pages > Custom domain** 에 `www.shopnanda.com` 저장 (DNS 검사 통과 후)
3. **Variables** 에 `SITE_URL=https://www.shopnanda.com`, `BASE_PATH=/` 등록
4. **Actions > Deploy to GitHub Pages > Run workflow** 로 재배포
5. 인증서 발급 후 **Enforce HTTPS** 활성화

Custom domain 을 저장하면 `passion-story.github.io/shop-nanda` 는 새 도메인으로 자동 리다이렉트됩니다.
Actions 배포에서는 `CNAME` 파일이 필요 없습니다(무시됨).
