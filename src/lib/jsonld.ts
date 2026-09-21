import { SITE } from '../config/site';
import { abs } from './urls';
import { imageFull } from './images';
import type { Product } from './products';


export function organization() {
  const b = SITE.business;
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': abs('/#store'),
    name: SITE.name,
    alternateName: SITE.englishName,
    url: abs('/'),
    description: SITE.description,
    logo: abs('/favicon.svg'),
    ...(b.email ? { email: b.email } : {}),
    ...(b.phone ? { telephone: b.phone } : {}),
    sameAs: [SITE.store.url, ...SITE.sameAs],
  };
}

export function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#website'),
    name: SITE.name,
    url: abs('/'),
    inLanguage: SITE.lang,
    publisher: { '@id': abs('/#store') },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${abs('/search/')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

export function itemList(name: string, products: Product[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: products.slice(0, 50).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(p.path),
      name: p.name,
    })),
  };
}

export function productLd(p: Product, description: string) {
  const inStock = p.status === 'SALE';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': abs(`${p.path}#product`),
    name: p.name,
    description,
    sku: p.id,
    category: p.category.name,
    ...(p.images.length ? { image: p.images.map((u) => (u.startsWith('/') ? abs(u) : imageFull(u))) } : {}),
    brand: { '@type': 'Brand', name: SITE.name },
    ...(p.rating && p.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: abs(p.path),
      priceCurrency: 'KRW',
      price: p.salePrice,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE.name },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: p.shippingFee, currency: 'KRW' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'KR' },
      },
    },
  };
}
