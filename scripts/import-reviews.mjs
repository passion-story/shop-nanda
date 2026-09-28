#!/usr/bin/env node
// 스마트스토어센터 > 리뷰 관리에서 내려받은 리뷰 엑셀(.xlsx/.csv)을 data/store-reviews.json 으로 가져온다.
//
// 사용법:  npm run import:reviews [-- <리뷰.xlsx|csv>] [--sheet=1]
//   (파일 생략) data/source/ 에서 파일명에 '리뷰' 또는 'review' 가 들어간 가장 최근 파일을 사용한다
//
// 개인정보: 상품번호·평점·리뷰 내용·작성자(마스킹)·작성일만 저장한다. 주문번호·구매자명 등 나머지 컬럼은 버린다.
// 작성자가 마스킹되어 있지 않으면 앞부분만 남기고 가린다. 내용에 전화번호·이메일이 있는 리뷰는 제외한다.
import fs from 'node:fs';
import path from 'node:path';
import { readRows } from './lib/table.mjs';
import { ROOT } from './lib/dataset.mjs';

const OUT = path.join(ROOT, 'data', 'store-reviews.json');

const ALIASES = {
  productId: ['상품번호(스마트스토어)', '채널상품번호', '상품번호', '상품 번호'],
  text: ['리뷰내용', '리뷰 내용', '리뷰상세내용', '내용'],
  rating: ['구매자평점', '구매자 평점', '평점', '별점'],
  author: ['등록자', '작성자', '리뷰작성자', '구매자ID', '구매자 ID'],
  date: ['리뷰등록일', '리뷰 등록일', '등록일', '작성일', '등록일시'],
  display: ['전시상태', '전시 상태'],
  photo: ['포토/영상', '포토', '사진'],
};

const args = process.argv.slice(2);
const sheetArg = args.find((a) => a.startsWith('--sheet='))?.split('=')[1];
function latestReviewFile() {
  const dir = path.join(ROOT, 'data', 'source');
  if (!fs.existsSync(dir)) return undefined;
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(csv|xlsx)$/i.test(f) && /리뷰|review/i.test(f.normalize('NFC')))
    .map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f;
}
const file = args.find((a) => !a.startsWith('--')) ?? latestReviewFile();
if (!file) {
  console.error("가져올 리뷰 파일이 없습니다. data/source/ 에 파일명에 '리뷰'가 들어간 엑셀을 넣거나 경로를 지정하세요.");
  process.exit(1);
}
console.log('사용 파일:', path.relative(ROOT, path.resolve(file)));

const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
const rows = await readRows(file, sheetArg && /^\d+$/.test(sheetArg) ? Number(sheetArg) : sheetArg);

const has = (row, key) => row.some((c) => ALIASES[key].some((a) => norm(a) === norm(c)));
const headerIdx = rows.slice(0, 10).findIndex((r) => has(r, 'productId') && has(r, 'text'));
if (headerIdx < 0) {
  console.error('헤더 행을 찾지 못했습니다. (상품번호 + 리뷰내용 컬럼이 필요합니다)');
  console.error('첫 행 컬럼:', rows[0]?.filter(Boolean).join(' | '));
  process.exit(1);
}
const header = rows[headerIdx].map((c) => String(c ?? '').trim());
const col = {};
for (const [key, aliases] of Object.entries(ALIASES)) {
  for (const a of aliases) {
    const i = header.findIndex((h) => norm(h) === norm(a));
    if (i >= 0) {
      col[key] = i;
      break;
    }
  }
}
console.log('인식한 컬럼:', Object.entries(col).map(([k, i]) => `${k}←"${header[i]}"`).join(', '));

const dateStr = (v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v ?? '').match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : undefined;
};
const maskAuthor = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return '구매자';
  if (s.includes('*')) return s;
  const chars = Array.from(s);
  return chars.slice(0, Math.max(1, Math.floor(chars.length / 2))).join('') + '***';
};
const PERSONAL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?<!\d)01[016789][- ]?\d{3,4}[- ]?\d{4}(?!\d)/;

const get = (row, key) => (col[key] === undefined ? undefined : row[col[key]]);
const reviews = [];
let dropped = 0;
for (const row of rows.slice(headerIdx + 1)) {
  const productId = String(get(row, 'productId') ?? '').trim().replace(/\.0$/, '');
  if (!/^\d+$/.test(productId)) continue;
  // 스토어에서 숨겨진(블라인드 등) 리뷰는 제외
  const display = String(get(row, 'display') ?? '').trim();
  if (display && display !== '정상') continue;
  // 사용자 영역 문자(깨진 이모지 등, 화면에 □로 보임)는 지운다
  const text = String(get(row, 'text') ?? '').replace(/[\ue000-\uf8ff]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (PERSONAL.test(text)) {
    dropped++;
    continue;
  }
  const photo = String(get(row, 'photo') ?? '').match(/https:\/\/[a-z0-9.-]+\.pstatic\.net\/\S+?\.(?:jpe?g|png|gif|webp)/i)?.[0];
  const rating = Number(String(get(row, 'rating') ?? '').replace(/[^\d.]/g, ''));
  reviews.push({
    productId,
    ...(rating >= 1 && rating <= 5 ? { rating } : {}),
    text,
    author: maskAuthor(get(row, 'author')),
    // 리뷰 사진: 네이버 이미지 서버(https) 주소만 받는다
    ...(photo ? { photo } : {}),
    date: dateStr(get(row, 'date')) ?? '',
  });
}

// git diff 가 안정적이도록 상품번호 → 최신순 정렬
reviews.sort((a, b) => a.productId.localeCompare(b.productId) || b.date.localeCompare(a.date) || a.text.localeCompare(b.text));

const body = {
  _help: 'npm run import:reviews 로 생성되는 파일입니다. 직접 수정하지 마세요. (메인 화면 노출용 리뷰는 reviews.json)',
  importedAt: new Date().toISOString(),
  reviews,
};
fs.writeFileSync(OUT, JSON.stringify(body, null, 2) + '\n');
const products = new Set(reviews.map((r) => r.productId)).size;
console.log(`\n리뷰 ${reviews.length}건 (상품 ${products}개) 저장: ${path.relative(ROOT, OUT)}`);
if (dropped) console.log(`개인정보(전화번호·이메일)가 포함된 리뷰 ${dropped}건은 제외했습니다.`);
