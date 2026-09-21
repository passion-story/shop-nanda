/**
 * 사이트 전역 설정. 운영자가 채워 넣어야 하는 값은 `TODO` 로 표시했다.
 * (도메인은 astro.config.mjs 의 SITE_URL 에서만 관리한다.)
 */
export const SITE = {
  name: '샵난다',
  englishName: 'Shop Nanda',
  tagline: '패션 잡화 · 헤어 액세서리 셀렉트샵',
  description:
    '샵난다는 가발·헤어끈·헤어핀·헤어밴드·패션잡화·뷰티소품을 만나볼 수 있는 패션 잡화 헤어 액세서리 셀렉트샵입니다. 섬세한 디테일과 트렌디한 패션아이템을 만나보세요.',
  locale: 'ko_KR',
  lang: 'ko',

  /** 결제·주문이 이뤄지는 네이버 스마트스토어 */
  store: {
    url: 'https://smartstore.naver.com/shopnanda',
    slug: 'shopnanda',
    label: '네이버 스마트스토어',
  },

  /** 기본 배송비(원). 상품 데이터에 배송비가 없을 때 사용 */
  defaultShippingFee: 3000,

  /** 검색엔진 소유확인 토큰 (네이버 서치어드바이저 / 구글 서치콘솔). 비워두면 태그를 출력하지 않는다. */
  verification: {
    naver: '', // TODO: 서치어드바이저 > 사이트 등록 > HTML 태그 방식의 content 값
    google: '', // TODO: 서치콘솔 > 속성 추가 > HTML 태그 방식의 content 값
  },

  analyticsId: import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '', // 'G-XXXXXXXXXX'

  /**
   * 사업자 정보 (전자상거래법상 표시 의무 대응). 비어 있는 항목은 푸터에 출력하지 않는다.
   * 실제 값은 스마트스토어 판매자 정보와 동일하게 기재할 것.
   */
  business: {
    companyName: '', // TODO: 상호
    representative: '', // TODO: 대표자
    registrationNumber: '', // TODO: 사업자등록번호
    mailOrderNumber: '', // TODO: 통신판매업 신고번호
    address: '', // TODO: 사업장 소재지
    email: '', // TODO
    phone: '', // TODO: 고객센터 번호
  },

  /** 대표 SNS 등 (있을 때만 JSON-LD sameAs 로 출력) */
  sameAs: [] as string[], // TODO: 인스타그램 등

  /** 기본 공유 이미지 (public/ 기준). 1200x630 PNG/JPG 권장 */
  defaultOgImage: '/og-default.png',
};

/** 상품 상세의 "구매하기" 버튼이 향하는 URL 을 만든다. 상품 번호를 모르면 스토어 내 검색으로 대체한다. */
export function storeProductUrl(productNo: string | undefined, fallbackQuery?: string): string {
  if (productNo && /^\d+$/.test(productNo)) {
    return `${SITE.store.url}/products/${productNo}`;
  }
  if (fallbackQuery) {
    return `${SITE.store.url}/search?q=${encodeURIComponent(fallbackQuery)}`;
  }
  return SITE.store.url;
}
