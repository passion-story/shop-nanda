/**
 * 스마트스토어 상단 탭(가발/헤어끈/헤어핀/헤어밴드/패션잡화/뷰티소품/생활용품)과 동일한 카테고리 구성.
 * - 네이버 카테고리 경로가 있으면 그것으로, 없으면 `keywords` 로 상품명을 분석해 자동 분류한다.
 * - 자동 분류가 틀린 상품은 data/overrides.json 에서 상품별로 고정할 수 있다.
 */
export interface Category {
  slug: string;
  name: string;
  /** 검색결과 title 에 쓰일 키워드형 이름 */
  seoName: string;
  description: string;
  /** 분류용 상품명 키워드 */
  keywords: string[];
  /** 검색 노출용 키워드 (meta keywords). 앞쪽일수록 중요 */
  seoKeywords: string[];
  accent: string;
}

export const CATEGORIES: Category[] = [
  {
    slug: 'wig',
    name: '가발',
    seoName: '여성 가발·부분 가발·올림머리 가발',
    description:
      '여성 가발, 부분 가발, 올림머리 가발, 탑피스, 포니테일 가발까지. 자연스러운 볼륨을 더해주는 헤어피스 모음입니다.',
    keywords: ['가발', '위그', '탑피스', '헤어피스', '붙임머리', '익스텐션'],
    seoKeywords: ['여성 가발', '부분 가발', '올림머리 가발', '통가발', '포니테일 가발', '탑피스', '헤어피스', '붙임머리', '웨이브 가발', '긴머리 가발'],
    accent: '#8a5a44',
  },
  {
    slug: 'beauty-tool',
    name: '뷰티소품',
    seoName: '뷰티소품·마사지기·빗',
    description: '얼굴 마사지기, 페이스 롤러, 두피 마사지 빗 등 데일리 뷰티 케어 소품 모음입니다.',
    keywords: ['마사지', '롤러', '괄사', '안마', '지압', '뷰티', '물소뿔빗', '두피빗', '참빗', '브러시'],
    seoKeywords: ['뷰티소품', '얼굴 마사지기', '페이스 롤러', '두피 마사지 빗', '괄사', '물소뿔빗'],
    accent: '#d97a9b',
  },
  {
    slug: 'hair-pin',
    name: '헤어핀',
    seoName: '집게핀·헤어핀·머리핀',
    description: '집게핀, 바나나핀, 비녀, 빗핀 등 올림머리와 포인트 연출에 좋은 헤어핀 모음입니다.',
    keywords: ['집게핀', '헤어핀', '머리핀', '빗핀', '삔', '핀', '비녀', '뒤꽂이', '집게'],
    seoKeywords: ['헤어핀', '집게핀', '바나나핀', '머리핀', '올림머리핀', '비녀', '빗핀'],
    accent: '#c2416c',
  },
  {
    slug: 'hair-tie',
    name: '헤어끈',
    seoName: '곱창머리끈·슈슈·헤어끈',
    description: '곱창머리끈, 슈슈, 포니테일 머리끈, 고무줄까지 매일 쓰기 좋은 헤어끈 모음입니다.',
    keywords: ['머리끈', '헤어끈', '곱창', '슈슈', '고무줄', '스크런치'],
    seoKeywords: ['헤어끈', '곱창머리끈', '곱창밴드', '슈슈', '포니테일 머리끈', '스크런치'],
    accent: '#e58a1f',
  },
  {
    slug: 'hair-band',
    name: '헤어밴드',
    seoName: '머리띠·헤어밴드',
    description: '귀 안 아픈 머리띠, 안경 헤어밴드, 터번 등 편안하게 착용하는 헤어밴드 모음입니다.',
    keywords: ['머리띠', '헤어밴드', '밴드', '터번'],
    seoKeywords: ['헤어밴드', '머리띠', '안경 헤어밴드', '터번', '귀 안 아픈 머리띠'],
    accent: '#5b7fa6',
  },
  {
    slug: 'living',
    name: '생활용품',
    seoName: '소품 정리함·생활용품',
    description: '소품 정리함, 파우치, 자물쇠, 실리콘 깔창 등 일상에서 유용한 생활용품 모음입니다.',
    keywords: ['정리함', '정리대', '보관함', '파우치', '지퍼백', '자물쇠', '자물통', '깔창'],
    seoKeywords: ['생활용품', '소품 정리함', '파우치', '자물쇠', '실리콘 깔창'],
    accent: '#5f9a8a',
  },
  {
    slug: 'fashion-goods',
    name: '패션잡화',
    seoName: '패션잡화·가방·스카프',
    description: '크로스백, 에코백, 스카프, 롱타이, 모자 등 데일리 코디에 포인트가 되는 패션잡화 모음입니다.',
    keywords: ['가방', '백', '스카프', '타이', '모자', '비니', '숄', '카라', '목걸이줄', '사원증', '인형', '캡'],
    seoKeywords: ['패션잡화', '크로스백', '에코백', '스카프', '롱타이', '모자'],
    accent: '#7a6bb0',
  },
];

export const DEFAULT_CATEGORY_SLUG = 'fashion-goods';

export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

/**
 * 네이버 카테고리 경로(대분류>중분류>소분류)로 스토어 탭을 정한다. (위에 있을수록 우선)
 * 헤어 액세서리는 판매자가 지정한 소분류(가발/헤어핀/헤어끈/헤어밴드)를 그대로 따른다.
 */
const HINT_RULES: [RegExp, string][] = [
  [/헤어액세서리>가발/, 'wig'],
  [/헤어액세서리>헤어핀/, 'hair-pin'],
  [/헤어액세서리>헤어끈/, 'hair-tie'],
  [/헤어액세서리>헤어밴드/, 'hair-band'],
  [/^화장품\/미용|안마/, 'beauty-tool'],
  [/^(생활\/건강|가구\/인테리어|디지털\/가전|스포츠\/레저)/, 'living'],
];

/** 카테고리 결정: 네이버 카테고리 경로 → 상품명 키워드 → 기본(패션잡화) 순서 */
export function classify(name: string, hint = ''): string {
  for (const [re, slug] of HINT_RULES) if (hint && re.test(hint)) return slug;
  for (const c of CATEGORIES) if (c.keywords.some((k) => name.includes(k))) return c.slug;
  return DEFAULT_CATEGORY_SLUG;
}
