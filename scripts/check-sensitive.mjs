#!/usr/bin/env node
// 커밋 전 개인정보·민감 정보 점검. .gitignore 를 `git add -f` 로 우회하거나, 파일 '안에' 섞여 들어간 값을 잡는다.
//
// 사용법:  npm run check:sensitive           스테이징된 파일만 검사
//          npm run check:sensitive -- --all  git 이 추적하거나 추적 가능한(무시되지 않은) 모든 파일 검사
//
// 위반이 있으면 종료 코드 1 로 끝난다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const all = process.argv.includes('--all');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let files;
try {
  files = (all ? git('ls-files', '-co', '--exclude-standard', '-z') : git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'))
    .split('\0')
    .filter(Boolean);
} catch {
  console.error('git 저장소가 아닙니다. (git init 후 실행하세요)');
  process.exit(2);
}

// ---- 1) 경로 차단: 커밋되면 안 되는 종류의 파일 ----
const BLOCKED_PATHS = [
  [/\.(csv|tsv|xls|xlsx|xlsm|xlsb|ods|numbers)$/i, '상품/주문/고객 데이터 파일 (재고·판매자코드·개인정보 포함 가능)'],
  [/(^|\/)\.env(\.(?!example$).+)?$/i, '환경변수 파일'],
  [/\.(pem|key|p12|pfx|jks|keystore|ppk)$/i, '비밀키/인증서'],
  [/(^|\/)(id_rsa|id_ed25519|id_ecdsa)/i, 'SSH 키'],
  [/(^|\/)(\.npmrc|\.netrc)$/i, '인증 토큰이 들어갈 수 있는 설정'],
  [/(^|\/)(credentials|service-account|client_secret)[^/]*\.json$/i, '자격증명 JSON'],
  [/(^|\/)(data\/source|reference|docs-internal|\.claude)\//, '커밋 금지 폴더'],
];

// ---- 2) 내용 차단 ----
const CONTENT_RULES = [
  ['이메일', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => /noreply|example\.(com|org)$/i.test(m)],
  ['전화번호', /(?<!\d)(01[016789][- ]?\d{3,4}[- ]?\d{4}|0[2-6]\d?[- ]\d{3,4}[- ]\d{4})(?!\d)/g],
  ['주민등록번호 형태', /(?<!\d)\d{6}-[1-4]\d{6}(?!\d)/g],
  ['개인 PC 경로', /\/home\/[a-z0-9_-]+\/|\/Users\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\/g],
  ['비밀키/토큰', /BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}/g],
];
// 법적으로 사이트에 공개해야 하는 사업자 정보(이메일·전화)는 이 파일에서만 허용한다.
const PUBLIC_BUSINESS_INFO_FILES = new Set(['src/config/site.ts']);
const PUBLIC_ONLY_RULES = new Set(['이메일', '전화번호']);

// ---- 3) data/products.json: 사이트에 필요한 필드만 허용 (원본의 비공개 컬럼이 섞이는 것을 차단) ----
const PRODUCT_TOP_KEYS = new Set(['source', 'syncedAt', 'note', 'products']);
const PRODUCT_KEYS = new Set([
  'id', 'name', 'price', 'salePrice', 'shippingFee', 'shippingType', 'image', 'images', 'tags', 'description',
  'categoryHint', 'status', 'rating', 'reviewCount', 'salesCount', 'registeredAt', 'modifiedAt',
]);

const problems = [];
const add = (file, msg) => problems.push(`  ✗ ${file}\n      ${msg}`);

for (const f of files) {
  const norm = f.replaceAll('\\', '/');
  for (const [re, why] of BLOCKED_PATHS) {
    if (re.test(norm) && !/^data\/source\/\.gitignore$/.test(norm)) add(norm, `커밋 금지 파일: ${why}`);
  }
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
  const size = fs.statSync(f).size;
  if (size > 5 * 1024 * 1024) continue; // 큰 바이너리는 내용 검사 생략
  let text;
  try {
    text = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0')) continue; // 바이너리

  for (const [name, re, allow] of CONTENT_RULES) {
    if (PUBLIC_BUSINESS_INFO_FILES.has(norm) && PUBLIC_ONLY_RULES.has(name)) continue;
    for (const m of text.matchAll(re)) {
      if (allow?.(m[0])) continue;
      const line = text.slice(0, m.index).split('\n').length;
      add(norm, `${name} 발견 (${line}번째 줄): ${m[0].slice(0, 30)}${m[0].length > 30 ? '…' : ''}`);
    }
  }

  if (norm === 'data/products.json') {
    try {
      const json = JSON.parse(text);
      for (const k of Object.keys(json)) if (!PRODUCT_TOP_KEYS.has(k)) add(norm, `허용되지 않은 최상위 필드: ${k}`);
      const extra = new Set();
      for (const p of json.products ?? []) for (const k of Object.keys(p)) if (!PRODUCT_KEYS.has(k)) extra.add(k);
      if (extra.size) add(norm, `허용되지 않은 상품 필드(원본의 비공개 컬럼일 수 있음): ${[...extra].join(', ')}`);
    } catch (e) {
      add(norm, `JSON 파싱 실패: ${e.message}`);
    }
  }
}

// ---- 4) 경고: 커밋 작성자 이메일은 GitHub 에 공개된다 (차단하지는 않음) ----
try {
  const email = git('config', 'user.email').trim();
  if (email && !/noreply\.github\.com$/i.test(email)) {
    console.warn(`⚠ 커밋 작성자 이메일이 공개됩니다: ${email}`);
    console.warn('  개인 이메일을 숨기려면 GitHub 의 noreply 주소를 사용하세요.');
    console.warn('  git config user.email "<숫자>+<사용자명>@users.noreply.github.com"   (GitHub > Settings > Emails 에서 확인)\n');
  }
} catch {
  /* user.email 미설정 */
}

if (problems.length) {
  console.error(`\n민감 정보 점검 실패 — ${problems.length}건 (검사 파일 ${files.length}개)\n`);
  console.error(problems.join('\n'));
  console.error('\n→ 해당 파일을 커밋에서 빼거나(`git restore --staged <파일>`) 내용을 제거하세요.');
  console.error('→ 사이트에 공개해도 되는 값이라면 scripts/check-sensitive.mjs 의 허용 규칙을 조정하세요.\n');
  process.exit(1);
}
console.log(`✓ 민감 정보 점검 통과 (검사 파일 ${files.length}개${all ? ', 전체' : ', 스테이징'})`);
