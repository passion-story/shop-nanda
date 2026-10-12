# 샵난다 웹사이트

[샵난다](https://www.shopnanda.com)는 여성 가발·부분 가발·헤어핀·헤어끈·헤어밴드 등 헤어 액세서리와 패션잡화를 소개하는 셀렉트샵 웹사이트입니다.
상품 정보와 구매 후기를 보여 주고, 주문·결제는 [네이버 스마트스토어](https://smartstore.naver.com/shopnanda)에서 진행됩니다.

[Astro](https://astro.build) 기반 정적 사이트이며, `main` 브랜치에 푸시하면 GitHub Pages로 자동 배포됩니다.

## 개발

Node.js 22 이상, `make` 필요

```bash
make install   # 의존성 설치
make dev       # 개발 서버 (http://localhost:4321)
make build     # dist/ 생성
make preview   # 빌드 후 결과 미리보기
make check     # 타입 검사
make clean     # 빌드 산출물(dist, .astro) 삭제
```

## 데이터 갱신

스마트스토어센터에서 내려받은 파일을 `data/source/`에 넣고 실행합니다. 이 폴더의 파일은 git에 올라가지 않습니다.

```bash
make import      # 상품 목록 엑셀/CSV → data/products.json
make reviews     # 리뷰 엑셀(파일명에 review 또는 리뷰 포함) → data/store-reviews.json
make sensitive   # 커밋 전 민감정보 점검
```

`make`만 실행하면 전체 명령 목록이 나옵니다.

## Author

Jaeseong Choe ([@sorrychoe](https://github.com/sorrychoe))

## License

Copyright (c) 2026 패션스토리 (Fashion Story). All rights reserved.

이 저장소의 코드, 데이터, 텍스트, 이미지는 저작권자의 사전 서면 허가 없이 사용·복제·배포할 수 없습니다. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
