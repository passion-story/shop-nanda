import fs from 'node:fs';
import path from 'node:path';
import { classify, getCategory, type Category } from '../config/categories';
import { SITE, storeProductUrl } from '../config/site';

/** 스크립트(가져오기/동기화)가 쓰는 원본 형태 — data/products.json */
export interface RawProduct {
  id: string; // 스마트스토어 채널상품번호(숫자). URL 과 구매 링크에 사용된다.
  name: string;
  price: number; // 정가
  salePrice: number; // 실제 판매가(할인 적용)
  shippingFee?: number;
  shippingType?: string; // 유료 / 조건부 무료 / 무료
  image?: string | null;
  images?: string[];
  tags?: string[];
  description?: string;
  categoryHint?: string; // 네이버 카테고리 경로 등 (자동 분류 보조)
  status?: 'SALE' | 'OUTOFSTOCK' | 'SUSPENSION' | 'DELETED';
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  registeredAt?: string;
  modifiedAt?: string;
}

interface Override {
  category?: string;
  hidden?: boolean;
  title?: string;
  description?: string;
  intro?: string;
  tags?: string[];
  badge?: string;
}

export interface Product extends RawProduct {
  tags: string[];
  images: string[];
  status: NonNullable<RawProduct['status']>;
  shippingFee: number;
  discountRate: number;
  category: Category;
  path: string; // 사이트 내 경로 (/products/<id>/)
  buyUrl: string; // 스마트스토어 상품 URL
  listed: boolean; // 목록 노출 대상(판매중·품절)
  seoTitle?: string;
  seoDescription?: string;
  intro?: string;
  badge?: string;
}

export interface Review {
  productId: string;
  text: string;
  author: string;
  date: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(file: string): T | null {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

interface Dataset {
  source: 'sample' | 'excel';
  syncedAt?: string;
  products: RawProduct[];
}

let cache: { dataset: Dataset; products: Product[] } | null = null;

function load() {
  if (cache) return cache;

  // data/products.json 이 없으면 빈 사이트로 빌드하고 검색엔진 색인을 차단한다(source: 'sample').
  const dataset = readJson<Dataset>('products.json') ?? { source: 'sample' as const, products: [] };
  const overrides = readJson<{ products?: Record<string, Override> }>('overrides.json')?.products ?? {};

  const products: Product[] = [];
  for (const raw of dataset.products) {
    const o = overrides[raw.id] ?? {};
    if (o.hidden) continue;

    const status = raw.status ?? 'SALE';
    const price = Math.max(raw.price || 0, raw.salePrice || 0);
    const salePrice = raw.salePrice || price;
    const categorySlug = o.category ?? classify(raw.name, raw.categoryHint);
    const image = raw.image ?? raw.images?.[0] ?? null;
    const images = [...new Set([image, ...(raw.images ?? [])].filter((v): v is string => !!v))];

    products.push({
      ...raw,
      status,
      price,
      salePrice,
      shippingFee: raw.shippingFee ?? SITE.defaultShippingFee,
      tags: o.tags ?? raw.tags ?? [],
      image,
      images,
      // 네이버 스마트스토어와 동일하게 소수점 이하 버림
      // (부동소수점 오차로 20%가 19%로 나오지 않도록 정수 연산 사용)
      discountRate: price > salePrice ? Math.floor(((price - salePrice) * 100) / price) : 0,
      category: getCategory(categorySlug) ?? getCategory(classify(raw.name))!,
      path: `/products/${raw.id}/`,
      buyUrl: storeProductUrl(raw.id, raw.name),
      listed: status === 'SALE' || status === 'OUTOFSTOCK',
      seoTitle: o.title,
      seoDescription: o.description,
      intro: o.intro,
      badge: o.badge,
    });
  }

  cache = { dataset, products };
  return cache;
}

/** 인기도순: 판매량 > 리뷰수 > 데이터 순서 */
function byPopularity(a: Product, b: Product) {
  return (b.salesCount ?? 0) - (a.salesCount ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
}

export const dataSource = () => load().dataset.source;
export const isSampleData = () => load().dataset.source === 'sample';
export const syncedAt = () => load().dataset.syncedAt;

/** 상품 상세 페이지를 만들 전체 상품 (판매종료 상품 포함 — 검색엔진이 유입되어도 404 가 나지 않도록) */
export const getAllProductPages = () => load().products;

/** 목록·카테고리·사이트맵에 노출할 상품 */
export const getListed = () => load().products.filter((p) => p.listed).sort(byPopularity);

export const getByCategory = (slug: string) => getListed().filter((p) => p.category.slug === slug);

/** 판매량·리뷰수 같은 인기 지표가 하나라도 있는가 (엑셀/CSV 에 없으면 false) */
export const hasPopularityData = () =>
  load().products.some((p) => (p.salesCount ?? 0) > 0 || (p.reviewCount ?? 0) > 0);

/** 목록 정렬 옵션 중 실제 데이터가 있어서 의미 있는 것 */
export function availableSorts() {
  const ps = load().products;
  return {
    sales: ps.some((p) => (p.salesCount ?? 0) > 0),
    reviews: ps.some((p) => (p.reviewCount ?? 0) > 0),
    rating: ps.some((p) => (p.rating ?? 0) > 0),
  };
}

export function getBest(limit = 8): Product[] {
  const curated = readJson<{ curation?: { best?: string[] } }>('overrides.json')?.curation?.best ?? [];
  const all = getListed().filter((p) => p.status === 'SALE');
  const picked = curated.map((id) => all.find((p) => p.id === id)).filter((p): p is Product => !!p);
  // 인기 지표가 없으면 임의 순서로 채우지 않고 큐레이션한 상품만 '베스트'로 보여준다.
  if (!hasPopularityData()) return picked.slice(0, limit);
  return [...picked, ...all.filter((p) => !picked.includes(p))].slice(0, limit);
}

/**
 * 메인 카테고리 타일의 대표 상품.
 * 1) data/overrides.json 의 curation.categoryCover[카테고리 slug] 로 지정한 상품
 * 2) 없으면 월간 베스트 중 해당 카테고리 상품
 * 3) 없으면 해당 카테고리에서 이미지가 있는 첫 상품
 */
export function getCategoryCover(slug: string): Product | undefined {
  const cfg = readJson<{ curation?: { categoryCover?: Record<string, string> } }>('overrides.json')?.curation?.categoryCover ?? {};
  const inCategory = getListed().filter((p) => p.status === 'SALE' && p.image && p.category.slug === slug);
  return (
    inCategory.find((p) => p.id === cfg[slug]) ??
    getBest(12).find((p) => p.category.slug === slug && p.image) ??
    inCategory[0]
  );
}

export function getNew(limit = 8): Product[] {
  const curated = readJson<{ curation?: { new?: string[] } }>('overrides.json')?.curation?.new ?? [];
  const all = getListed().filter((p) => p.status === 'SALE');
  const picked = curated.map((id) => all.find((p) => p.id === id)).filter((p): p is Product => !!p);
  const byDate = [...all].sort((a, b) => (b.registeredAt ?? '').localeCompare(a.registeredAt ?? ''));
  return [...picked, ...byDate.filter((p) => !picked.includes(p))].slice(0, limit);
}

export function getBestDeals(limit = 8): Product[] {
  return getListed()
    .filter((p) => p.status === 'SALE')
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, limit);
}

export function getRelated(product: Product, limit = 4): Product[] {
  return getListed()
    .filter((p) => p.id !== product.id && p.category.slug === product.category.slug && p.status === 'SALE')
    .slice(0, limit);
}

export function getReviews(): (Review & { product: Product })[] {
  const list = readJson<{ reviews?: Review[] }>('reviews.json')?.reviews ?? [];
  const products = load().products;
  return list
    .map((r) => ({ ...r, product: products.find((p) => p.id === r.productId) }))
    .filter((r): r is Review & { product: Product } => !!r.product && r.product.listed);
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 상품 상세의 검색결과용 설명 (수동 지정 > 자동 생성) */
export function productDescription(p: Product): string {
  if (p.seoDescription) return p.seoDescription;
  const parts = [
    `${p.name}`,
    p.discountRate ? `${p.discountRate}% 할인된 ${won(p.salePrice)}` : `${won(p.salePrice)}`,
    `${p.category.name} 카테고리 인기 상품`,
  ];
  if (p.rating && p.reviewCount) parts.push(`평점 ${p.rating} (리뷰 ${p.reviewCount.toLocaleString('ko-KR')}개)`);
  return `${parts.join(' · ')}. 주문·결제는 네이버 스마트스토어에서 안전하게 진행됩니다.`;
}
