.DEFAULT_GOAL := help
.PHONY: help install dev build preview check import sensitive clean

help: ## 명령 목록
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/:.*## /\t/'

install: ## 의존성 설치 (npm ci)
	npm ci

dev: ## 개발 서버 (http://localhost:4321)
	npm run dev

build: ## dist/ 생성
	npm run build

preview: build ## 빌드 결과 미리보기
	npm run preview

check: ## 타입 검사
	npm run check

import: ## data/source 엑셀/CSV → data/products.json
	npm run import

sensitive: ## 커밋 전 민감정보 점검 (전체 파일)
	npm run check:sensitive -- --all

clean: ## 빌드 산출물 삭제
	rm -rf dist .astro
