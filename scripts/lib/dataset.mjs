// data/products.json 을 읽고/병합하고/쓰는 공통 모듈 (엑셀 가져오기 · 네이버 API 동기화가 함께 사용)
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const DATA_FILE = path.join(ROOT, 'data', 'products.json');

export function loadDataset() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const isDefined = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

/**
 * 기존 데이터에 새 데이터를 병합한다.
 * - 새 데이터가 값을 가진 필드만 덮어쓴다. (엑셀에서 넣은 리뷰수·평점을 API 동기화가 지우지 않도록)
 * - prune=true 이면 새 데이터에 없는 기존 상품을 DELETED 로 표시한다. (삭제하지 않고 남겨 두어 상세 URL 이 404 가 되지 않게 함)
 */
export function mergeProducts(existing, incoming, { prune = true } = {}) {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const seen = new Set();
  const report = { added: [], removed: [], restored: [], priceChanged: [], statusChanged: [], updated: 0, updatedFields: new Set() };

  for (const inc of incoming) {
    seen.add(inc.id);
    const prev = byId.get(inc.id);
    const next = { ...(prev ?? {}) };
    for (const [k, v] of Object.entries(inc)) if (isDefined(v)) next[k] = v;

    if (!prev) {
      report.added.push(next);
    } else {
      if (prev.status === 'DELETED' && next.status !== 'DELETED') report.restored.push(next);
      if (prev.salePrice !== next.salePrice || prev.price !== next.price) {
        report.priceChanged.push({ id: next.id, name: next.name, from: prev.salePrice, to: next.salePrice });
      }
      if ((prev.status ?? 'SALE') !== (next.status ?? 'SALE')) {
        report.statusChanged.push({ id: next.id, name: next.name, from: prev.status ?? 'SALE', to: next.status });
      }
      const changed = Object.keys(next).filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]));
      if (changed.length) {
        report.updated++;
        for (const k of changed) report.updatedFields.add(k);
      }
    }
    byId.set(inc.id, next);
  }

  if (prune) {
    for (const [id, p] of byId) {
      if (!seen.has(id) && p.status !== 'DELETED') {
        byId.set(id, { ...p, status: 'DELETED' });
        report.removed.push(p);
      }
    }
  }

  // git diff 가 안정적이도록 등록일 내림차순 → id 순으로 정렬
  const products = [...byId.values()].sort(
    (a, b) => (b.registeredAt ?? '').localeCompare(a.registeredAt ?? '') || a.id.localeCompare(b.id),
  );
  return { products, report };
}

export function saveDataset(source, products) {
  const body = { source, syncedAt: new Date().toISOString(), products };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2) + '\n');
}

export function formatReport(r, total) {
  const lines = [`## 상품 동기화 결과 (총 ${total}개)`, ''];
  const n = (x) => x.toLocaleString('ko-KR');
  lines.push(`- 신규 ${r.added.length} · 가격변경 ${r.priceChanged.length} · 상태변경 ${r.statusChanged.length} · 판매종료/삭제 ${r.removed.length} · 복구 ${r.restored.length} · 기타 정보갱신 ${r.updated}${r.updated ? ` (${[...r.updatedFields].join(', ')})` : ''}`);
  if (r.added.length) {
    lines.push('', '### 신규 상품', ...r.added.map((p) => `- [${p.id}] ${p.name} (${n(p.salePrice)}원)`));
  }
  if (r.priceChanged.length) {
    lines.push('', '### 가격 변경', ...r.priceChanged.map((p) => `- [${p.id}] ${p.name}: ${n(p.from)}원 → ${n(p.to)}원`));
  }
  if (r.statusChanged.length) {
    lines.push('', '### 상태 변경', ...r.statusChanged.map((p) => `- [${p.id}] ${p.name}: ${p.from} → ${p.to}`));
  }
  if (r.removed.length) {
    lines.push('', '### 목록에서 사라진 상품(DELETED 처리)', ...r.removed.map((p) => `- [${p.id}] ${p.name}`));
  }
  return lines.join('\n');
}

/** GitHub Actions 요약 화면에도 리포트를 남긴다 */
export function writeStepSummary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
}

export function hasChanges(r) {
  return r.added.length + r.removed.length + r.restored.length + r.priceChanged.length + r.statusChanged.length + r.updated > 0;
}
