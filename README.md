# okorion/tech-blog

> 학습 내용을 정리하는 Tech Study Blog

🔗 **Live Site**: <https://okorion.github.io/tech-blog>

---

## 📚 소개

velog에 정리하던 300편 이상의 학습 기록을 Jekyll + Chirpy 테마로 이어 나가는 기술 블로그입니다. 검색, 태그, 카테고리, TOC를 통해 대량의 아카이브를 빠르게 탐색할 수 있도록 구성했습니다.

---

## 🛠️ 기술 스택

- **Jekyll**: 4.4.1
- **Theme**: jekyll-theme-chirpy 7.4.1
- **Ruby**: 3.3+ (개발 환경)
- **Test/검증**: html-proofer

---

## 🚀 로컬 개발

### 요구사항
- Ruby 3.3 이상
- Bundler

### 설치 및 실행

```bash
bundle install

# 라이브 리로드 개발 서버
./tools/run.sh
# 또는
bundle exec jekyll serve -l -H 127.0.0.1

# 프로덕션 모드로 확인
./tools/run.sh -p
```

- 기본 접속: <http://127.0.0.1:4000/tech-blog/>

### 빌드/검증

```bash
bundle exec jekyll build
./tools/test.sh   # JEKYLL_ENV=production 빌드 + html-proofer
```

---

## 📁 프로젝트 구조

```
.
├── _config.yml          # 사이트 설정 (url=https://okorion.github.io, baseurl=/tech-blog)
├── _posts/              # 블로그 포스트 (Markdown)
├── _tabs/               # 사이드바 탭 (About, Archives, Categories, Tags)
├── _data/               # 연락처 등 데이터 파일
├── assets/img/          # 이미지/아바타 리소스
├── tools/run.sh         # 개발 서버 스크립트
├── tools/test.sh        # 프로덕션 빌드 + 링크 검사
├── Gemfile              # Ruby 의존성 (jekyll-theme-chirpy 7.4.1)
└── index.html           # 홈 페이지
```

---

## ✍️ 포스트 작성

새 글은 `_posts/` 디렉터리에 아래 형식으로 생성합니다:

```
YYYY-MM-DD-title-slug.md
```

**Front Matter 예시:**

```yaml
---
title: "포스트 제목"
date: 2025-12-06 10:00:00 +0900
categories: [Category, Subcategory]
tags: [tag1, tag2, tag3]
description: "포스트 설명"
---
```

- 포스트 이미지는 `assets/img/<slug>/` 등 슬러그 기반 경로로 두고, 마크다운에서 `/tech-blog/assets/...`로 참조합니다.

---

## 🌐 배포

- GitHub Pages를 통해 자동 배포됩니다 (`main` 브랜치 push 시 워크플로우 실행).
- `_config.yml`에서 `url`은 `https://okorion.github.io`, `baseurl`은 `/tech-blog`로 설정되어 있습니다.

---

## 📬 Contact

- **GitHub**: [@okorion](https://github.com/okorion)
- **Email**: [ok.or.orion@gmail.com](mailto:ok.or.orion@gmail.com)

---

## 📄 License

이 프로젝트는 MIT License를 따릅니다.
