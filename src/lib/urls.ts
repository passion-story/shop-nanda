/** base 경로(프로젝트 사이트 배포 대비)를 고려한 내부 링크 헬퍼 */
export function href(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

/** 절대 URL (canonical, sitemap, JSON-LD 용) */
export function abs(p: string): string {
  if (/^https?:\/\//.test(p)) return p;
  const site = (import.meta.env.SITE ?? '').replace(/\/$/, '');
  return `${site}${href(p)}`;
}
