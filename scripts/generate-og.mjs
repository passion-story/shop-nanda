#!/usr/bin/env node
/**
 * public/og-default.png (1200x630) 생성 스크립트.
 *
 * 카카오톡, 라인, 슬랙, 모바일 메신저 등에서 1:1(정사각형) 또는 4:3 비율로
 * 중앙 크롭되더라도 브랜드명('샵난다')과 주요 슬로건이 잘리지 않도록
 * Safe Zone(중앙 630x630 안전 영역) 기준 중앙 정렬 및 대각선 코너 그래픽으로 렌더링합니다.
 *
 * 사용법:
 *   node scripts/generate-og.mjs
 *   node scripts/generate-og.mjs --preview   # 1:1 정사각형 및 4:3 크롭 미리보기 함께 생성
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const targetOgPath = path.resolve(rootDir, 'public', 'og-default.png');
const withPreview = process.argv.includes('--preview');

// 브라우저 실행 파일 탐색
function findBrowser() {
  const candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (const bin of candidates) {
    try {
      execFileSync('which', [bin], { stdio: 'pipe' });
      return bin;
    } catch {
      // 다음 후보 확인
    }
  }
  throw new Error('Chrome 또는 Chromium 브라우저를 찾을 수 없습니다.');
}

const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'NanumSquare';
  src: url('file:///usr/share/fonts/truetype/nanum/NanumSquareEB.ttf'),
       local('NanumSquare ExtraBold'), local('NanumSquare-ExtraBold');
  font-weight: 800;
}
@font-face {
  font-family: 'NanumSquare';
  src: url('file:///usr/share/fonts/truetype/nanum/NanumSquareB.ttf'),
       local('NanumSquare Bold'), local('NanumSquare-Bold');
  font-weight: 700;
}
@font-face {
  font-family: 'NanumSquare';
  src: url('file:///usr/share/fonts/truetype/nanum/NanumSquareR.ttf'),
       local('NanumSquare Regular'), local('NanumSquare-Regular');
  font-weight: 400;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1200px;
  height: 630px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #fdf1f4 0%, #fef3ee 50%, #fff1e3 100%);
  font-family: 'NanumSquare', 'Pretendard Variable', Pretendard, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
/* 우상단 포인트 원형 (자주/로즈): 중심=(1030, 70), 반지름=230 */
.circle-tr {
  position: absolute;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: #c85378;
  top: -160px;
  right: -60px;
}
/* 좌하단 포인트 원형 (웜 앰버/오렌지): 중심=(170, 560), 반지름=230 */
.circle-bl {
  position: absolute;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: #e9993c;
  bottom: -160px;
  left: -60px;
}
/* 중앙 콘텐츠 (1:1 크롭 영역 [x:285~915] 내 완전 보호) */
.content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.title {
  font-size: 96px;
  font-weight: 800;
  color: #c2416c;
  letter-spacing: -0.025em;
  line-height: 1;
}
.sub1 {
  font-size: 29px;
  font-weight: 700;
  color: #1f1b1a;
  margin-top: 24px;
  letter-spacing: -0.015em;
  white-space: nowrap;
}
.sub2 {
  font-size: 21px;
  font-weight: 400;
  color: #6d625d;
  margin-top: 14px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
</style>
</head>
<body>
  <div class="circle-tr"></div>
  <div class="circle-bl"></div>
  <div class="content">
    <h1 class="title">샵난다</h1>
    <p class="sub1">패션 잡화 · 헤어 액세서리 셀렉트샵</p>
    <p class="sub2">가발 · 헤어핀 · 헤어끈 · 헤어밴드 · 뷰티소품</p>
  </div>
</body>
</html>`;

const tempHtml = path.join(os.tmpdir(), `shopnanda-og-${Date.now()}.html`);
fs.writeFileSync(tempHtml, htmlContent, 'utf8');

try {
  const browser = findBrowser();
  execFileSync(browser, [
    '--headless',
    `--screenshot=${targetOgPath}`,
    '--window-size=1200,630',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-sandbox',
    tempHtml,
  ]);

  console.log(`✓ OG 이미지 생성 완료: ${path.relative(rootDir, targetOgPath)}`);

  if (withPreview) {
    const squarePreview = path.resolve(rootDir, 'public', 'og-preview-square.png');
    const fourThreePreview = path.resolve(rootDir, 'public', 'og-preview-4-3.png');
    try {
      execFileSync('convert', [targetOgPath, '-crop', '630x630+285+0', '+repage', squarePreview]);
      execFileSync('convert', [targetOgPath, '-crop', '840x630+180+0', '+repage', fourThreePreview]);
      console.log(`✓ 1:1 크롭 미리보기 생성: ${path.relative(rootDir, squarePreview)}`);
      console.log(`✓ 4:3 크롭 미리보기 생성: ${path.relative(rootDir, fourThreePreview)}`);
    } catch {
      // ImageMagick 이 없으면 건너뜀
    }
  }
} finally {
  try {
    fs.unlinkSync(tempHtml);
  } catch {
    // 무시
  }
}
