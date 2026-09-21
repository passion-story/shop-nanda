#!/usr/bin/env node
// 스마트스토어센터에서 내려받은 상품 목록(.xlsx 또는 .csv)을 data/products.json 으로 가져온다.
//
// 사용법:  npm run import [-- <상품목록.xlsx|csv>] [--dry-run] [--no-prune] [--force] [--sheet=1]
//   (파일 생략) data/source/ 폴더에서 가장 최근 .csv/.xlsx 를 사용한다
//   --no-prune  엑셀에 있는 상품만 추가/수정하고, 없는 기존 상품은 그대로 둔다 (일부 상품만 담은 엑셀용)
//   --force     '전체 교체'로 절반 넘는 상품이 삭제 처리되는 경우에도 진행
//   (기본)      엑셀에 없는 기존 상품은 DELETED 로 표시 — 전체 상품이 담긴 엑셀용
//
// 헤더(첫 행)의 한글 컬럼명을 아래 ALIASES 로 인식한다. 인식 못 한 컬럼은 목록으로 알려주므로,
// 실제 엑셀 헤더가 다르면 ALIASES 에 이름만 추가하면 된다.
import fs from 'node:fs';
import path from 'node:path';
import { readRows } from './lib/table.mjs';
import { ROOT, DATA_FILE, formatReport, hasChanges, loadDataset, mergeProducts, saveDataset, writeStepSummary } from './lib/dataset.mjs';

const ALIASES = {
  id: ['상품번호(스마트스토어)', '스마트스토어상품번호', '채널상품번호', '상품번호', '상품 번호', 'productNo', 'id'],
  // 스마트스토어에서 실제로 노출되는 이름. 있으면 상품명보다 우선한다.
  storeName: ['스마트스토어전용 상품명', '스마트스토어전용상품명'],
  name: ['상품명', '상품 이름', '상품이름', 'name'],
  price: ['판매가', '정가', '가격', '원판매가', 'price'],
  salePrice: ['할인가', '즉시할인가', '할인적용가', '할인 적용가', '판매가(할인적용)', '최종판매가', 'salePrice'],
  shippingFee: ['기본배송비', '기본 배송비', '배송비', 'shippingFee'],
  shippingType: ['배송비유형', '배송비 유형'],
  image: ['대표이미지', '대표 이미지', '대표이미지URL', '대표이미지 URL', '이미지', 'image'],
  images: ['추가이미지', '추가 이미지', '추가이미지URL', 'images'],
  tags: ['태그', '검색태그', '판매자태그', '판매자 태그', 'tags'],
  categoryHint: ['카테고리', '카테고리명', '전체카테고리', '전체 카테고리', '카테고리명(전체)', 'category'],
  status: ['판매상태', '상품상태', '상태', 'status'],
  display: ['전시상태', '전시 상태'],
  registeredAt: ['상품등록일', '등록일', '등록일시', '상품 등록일', 'registeredAt'],
  modifiedAt: ['최종수정일', '수정일', '최종 수정일', 'modifiedAt'],
  cat1: ['대분류'],
  cat2: ['중분류'],
  cat3: ['소분류'],
  cat4: ['세분류'],
  rating: ['평점', '평균평점', '리뷰평점', 'rating'],
  reviewCount: ['리뷰수', '리뷰 수', '리뷰개수', 'reviewCount'],
  salesCount: ['누적판매', '누적판매수', '누적 판매수', '판매수량', 'salesCount'],
  description: ['상품설명', '한줄설명', '상품 요약', 'description'],
};

const STATUS = [
  [/삭제|DELETE/i, 'DELETED'],
  [/품절|OUTOFSTOCK/i, 'OUTOFSTOCK'],
  [/중지|종료|SUSPENSION|CLOSE|숨김|대기/i, 'SUSPENSION'],
  [/판매중|판매 중|SALE|정상/i, 'SALE'],
];

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
// 파일을 생략하면 data/source/ 에서 가장 최근에 수정된 상품 파일을 사용한다.
function latestSourceFile() {
  const dir = path.join(ROOT, 'data', 'source');
  if (!fs.existsSync(dir)) return undefined;
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(csv|xlsx)$/i.test(f) && !f.startsWith('.'))
    .map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f;
}
const file = args.find((a) => !a.startsWith('--')) ?? latestSourceFile();
const sheetArg = args.find((a) => a.startsWith('--sheet='))?.split('=')[1];

if (!file) {
  console.error('가져올 파일이 없습니다. data/source/ 폴더에 상품 목록(.csv/.xlsx)을 넣거나 파일 경로를 지정하세요.');
  console.error('사용법: npm run import [-- <상품목록.xlsx|csv>] [--dry-run] [--no-prune] [--force] [--sheet=1]');
  process.exit(1);
}
console.log('사용 파일:', path.relative(ROOT, path.resolve(file)));

const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
const num = (v) => {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : undefined;
};
const list = (v) =>
  String(v ?? '')
    .split(/[\n,|;]+/)
    .map((s) => s.trim().replace(/^#/, ''))
    .filter(Boolean);
const dateStr = (v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v ?? '').match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : undefined;
};
const status = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  return STATUS.find(([re]) => re.test(s))?.[1];
};

const isHidden = (v) => {
  const s = String(v ?? '').trim();
  return s !== '' && !/^전시\s*중$|^DISPLAY|^ON$/i.test(s);
};

const sheet = sheetArg && /^\d+$/.test(sheetArg) ? Number(sheetArg) : sheetArg;
const rows = await readRows(file, sheet);

// 헤더 행 찾기: 앞 10행 중 '상품명'과 '상품번호' 계열 컬럼이 함께 있는 행
const aliasSet = (key) => new Set(ALIASES[key].map(norm));
let headerIdx = rows.slice(0, 10).findIndex((r) => r.some((c) => aliasSet('name').has(norm(c))) && r.some((c) => aliasSet('id').has(norm(c))));
if (headerIdx < 0) {
  console.error('헤더 행을 찾지 못했습니다. (상품명 + 상품번호 컬럼이 필요합니다)');
  console.error('첫 행 컬럼:', rows[0]?.filter(Boolean).join(' | '));
  console.error('→ 엑셀에 상품번호(스마트스토어) 컬럼이 없다면 알려주세요. 상품 URL·구매 링크에 이 번호가 필요합니다.');
  process.exit(1);
}

const header = rows[headerIdx].map((c) => String(c ?? '').trim());
const col = {};
const used = new Set();
for (const key of Object.keys(ALIASES)) {
  const set = aliasSet(key);
  // 배열 앞쪽 별칭이 우선(더 구체적인 이름 우선)
  for (const alias of ALIASES[key]) {
    const i = header.findIndex((h, idx) => !used.has(idx) && norm(h) === norm(alias));
    if (i >= 0) {
      col[key] = i;
      used.add(i);
      break;
    }
  }
}

console.log('인식한 컬럼:', Object.entries(col).map(([k, i]) => `${k}←"${header[i]}"`).join(', '));
const unmapped = header.filter((h, i) => h && !used.has(i));
if (unmapped.length) console.log('사용하지 않은 컬럼:', unmapped.join(', '));

const get = (row, key) => (col[key] === undefined ? undefined : row[col[key]]);
const incoming = [];
let skipped = 0;
for (const row of rows.slice(headerIdx + 1)) {
  const id = String(get(row, 'id') ?? '').trim().replace(/\.0$/, '');
  // 스마트스토어 노출명(전용 상품명)이 있으면 그것을, 없으면 상품명을 사용한다.
  const name = String(get(row, 'storeName') ?? '').trim() || String(get(row, 'name') ?? '').trim();
  if (!id || !name) {
    skipped++;
    continue;
  }
  const price = num(get(row, 'price'));
  const salePrice = num(get(row, 'salePrice')) ?? price;
  if (salePrice === undefined) {
    skipped++;
    continue;
  }
  const extraImages = list(get(row, 'images'));
  const image = String(get(row, 'image') ?? '').trim() || undefined;
  incoming.push({
    id,
    name,
    price: price ?? salePrice,
    salePrice,
    shippingFee: num(get(row, 'shippingFee')),
    image,
    images: [image, ...extraImages].filter(Boolean),
    tags: list(get(row, 'tags')),
    // 대분류>중분류>소분류>세분류 (없으면 '카테고리' 컬럼 값)
    categoryHint:
      ['cat1', 'cat2', 'cat3', 'cat4']
        .map((k) => String(get(row, k) ?? '').trim())
        .filter(Boolean)
        .join('>') ||
      String(get(row, 'categoryHint') ?? '').trim() ||
      undefined,
    shippingType: String(get(row, 'shippingType') ?? '').trim() || undefined,
    // 전시중이 아닌 상품(전시중지 등)은 스토어에 노출되지 않으므로 판매중지로 취급한다.
    status: isHidden(get(row, 'display')) ? 'SUSPENSION' : status(get(row, 'status')),
    registeredAt: dateStr(get(row, 'registeredAt')),
    modifiedAt: dateStr(get(row, 'modifiedAt')),
    rating: num(get(row, 'rating')),
    reviewCount: num(get(row, 'reviewCount')),
    salesCount: num(get(row, 'salesCount')),
    description: String(get(row, 'description') ?? '').trim() || undefined,
  });
}

if (!incoming.length) {
  console.error('가져올 상품이 없습니다. 컬럼 인식 결과를 확인해 주세요.');
  process.exit(1);
}

const existing = loadDataset()?.products ?? [];
const prune = !flags.has('--no-prune');
const { products, report } = mergeProducts(existing, incoming, { prune });
console.log(`\n읽은 상품 ${incoming.length}개 (건너뜀 ${skipped}행)\n`);
const summary = formatReport(report, products.length);
console.log(summary);
writeStepSummary(summary);

// 안전장치: 일부 상품만 담긴 엑셀을 '전체 교체'로 올려 대량의 상품이 삭제 처리되는 사고를 막는다.
const live = existing.filter((p) => p.status !== 'DELETED').length;
if (prune && !flags.has('--force') && live >= 10 && report.removed.length > live / 2) {
  const msg = `중단: 이 엑셀에 없는 상품이 ${report.removed.length}개입니다 (기존 ${live}개 중 절반 초과). 저장하지 않았습니다.\n→ 신규/일부 상품만 담은 파일이라면 '추가·수정 전용'(--no-prune)으로 가져오세요.\n→ 정말 전체 교체라면 --force 를 붙여 실행하세요.`;
  console.error('\n' + msg);
  writeStepSummary('\n> ⚠ ' + msg.replaceAll('\n', '\n> '));
  process.exit(1);
}

if (flags.has('--dry-run')) {
  console.log('\n--dry-run: 파일을 쓰지 않았습니다.');
} else if (!hasChanges(report) && existing.length) {
  console.log('\n변경사항이 없습니다.');
} else {
  saveDataset('excel', products);
  console.log(`\n저장 완료: ${DATA_FILE}`);
}
