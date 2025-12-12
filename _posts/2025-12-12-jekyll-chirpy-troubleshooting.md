---
title: Jekyll + Chirpy 블로그 구축 트러블슈팅 전체 기록
date: "2025-12-12 13:35:00 +09:00"
category: "Jekyll 블로그 구축"
tags:
  - jekyll
  - chirpy
  - troubleshooting
  - blog-dev
  - frontend-tools
layout: post
published: true
description: Jekyll 기반 Chirpy 테마로 블로그를 구축하며 해결한 코드 블록, 태그 정렬, 아카이브 개선, 썸네일, 댓글 기능 등의 트러블슈팅 전체 과정 정리
---

# Jekyll + Chirpy 블로그 구축 중 겪은 문제들과 해결 기록

Jekyll 기반 기술 블로그를 구축하면서 다양한 기능을 세팅하고 커스터마이징하는 과정에서 여러 문제가 발생했다. 특히 Chirpy 테마는 기능적으로 완성도가 높지만, 일부 설정은 특정 규칙을 충실히 지켜야 정상적으로 동작한다. 이 글은 블로그 구축 과정에서 마주한 문제들을 **발생 배경 → 해결 과정 → 적용 코드 → 배운 점**의 흐름으로 정리한 기술 아카이브이다. 초기 구축을 시도하는 개발자에게 실질적인 참고 자료가 되기를 기대한다.

---

## 1. 코드 블록 내 줄바꿈(linting) 깨짐 문제

### 문제 발생 배경

처음 블로그를 구성할 때 ChatGPT와 Codex를 활용해 기본 Jekyll 프로젝트를 생성하고 GitHub Pages와 연동했다. 블로그 자체는 정상적으로 구동되었지만, **Markdown 코드 블록 내부에서 줄바꿈이 전혀 적용되지 않는 문제**가 발생했다. `<pre><code>` 구조는 보이지만, 모든 줄이 한 줄로 렌더링되는 비정상 상태였다.

### 원인 분석

* Jekyll 환경 설정에 일부 누락된 부분이 있었음
* 테마 관련 SCSS가 올바르게 빌드되지 않음
* GitHub Pages의 기본 Jekyll 버전과 로컬 구성의 mismatch 가능성 존재
* Chirpy 테마의 code highlighting 규칙이 기본 프로젝트 구조에서는 올바르게 적용되지 않음

즉, **구조적 결함**에 가까웠다.

### 초기 시도 (실패한 접근)

* Rouge와 Kramdown 설정을 직접 추가
* Markdown 렌더링 옵션 변경
* GitHub Pages 빌드 로그 분석

그러나 문제는 계속 발생했고, 직접 구성한 프로젝트에서는 근본적으로 해결이 되지 않았다.

### 해결: `chirpy-starter` 로 프로젝트 재구축

최종적으로 해결한 방법은 다음과 같다.

**기존 프로젝트를 폐기하고 공식 템플릿인 `chirpy-starter`를 기반으로 새로 시작.**

공식 템플릿에는 다음 요소가 이미 완전히 맞춰져 있다.

* 올바른 Jekyll 구조
* SCSS 경로 및 빌드 규칙
* 코드 블록 하이라이팅 환경
* GitHub Actions 기반 자동 배포 파이프라인

이 템플릿으로 재구축한 직후, **줄바꿈 및 코드 블록 렌더링 문제가 즉시 해결되었다.**

### 배운 점

* ChatGPT 기반 자동 코드 생성은 편리하지만, 테마 기반 프로젝트는 공식 템플릿을 사용하는 것이 필수적이다.
* 특히 Chirpy는 파일 구조가 매우 정교하게 맞물려 있어, 수동 구성은 비효율적이다.

---

## 2. 포스팅별 썸네일 이미지 적용

### 해결 과정

1. Markdown Front Matter에 `image:` 속성을 선언
2. 해당 경로에 실제 이미지 파일이 존재
3. Chirpy가 자동으로 카드 UI 또는 포스트 상단 이미지로 삽입

### 적용 예시

```yaml
---
title: "예시 포스트"
image: /assets/img/sample-thumbnail.png
---
```

이미지 파일은 반드시 실제 경로에 존재해야 한다.

```
/assets/img/sample-thumbnail.png
```

### 배운 점

* Chirpy는 Front Matter 기반 자동 처리 기능이 많다. 문법 자체는 Jekyll의 확장 규칙이며 테마가 이를 활용할 뿐이다.
* 복잡해 보였지만 경로만 정확하면 정상적으로 작동한다.

---

## 3. 댓글 기능 추가 (Giscus 적용)

### 문제 발생 배경

댓글 기능을 추가하기 위해 Disqus, Utterances 등 여러 도구를 조사했지만,
**비용·광고·로그인 방식·유지보수 복잡성** 등을 고려할 때 만족스럽지 않았다.

### 선택한 해결책: **Giscus**

* GitHub Discussions 기반
* OAuth 사용
* 무료
* 유지보수 부담 없음
* Chirpy와 호환성 좋음

### 설정 방법 (요약)

`_config.yml` 예시:

```yaml
comments:
  provider: giscus
  giscus:
    repo: 사용자명/저장소명
    repo_id: xxx
    category: comments
    category_id: xxx
    mapping: pathname
    reactions_enabled: 1
    input_position: bottom
```

### 적용 후 확인

댓글 영역은 포스트 하단에 자동 렌더링되며, GitHub 계정으로 로그인해 댓글을 남길 수 있다.

![giscus 적용 화면](/assets/posts/2025-12-12-jekyll-chirpy-troubleshooting/image.png)

### 배운 점

* Jekyll 블로그라면 Giscus가 사실상 가장 경제적이고 유지 보수 부담이 없는 선택이다.

---

## 4. Tag 페이지 내림차순 정렬 문제

### 문제 발생 배경

Chirpy 기본 태그 페이지는 태그 이름을 **태그가 많은 순으로 표시하지 않는다**.

하지만 블로그 UX에서는 **포스트 수가 많은 태그를 상단에 배치하는 내림차순 정렬**이 더 좋다고 판단하여 수정을 진행했다.

### 해결 과정

`_layouts/tags.html` 내 정렬 로직을 아래와 같이 교체:

```liquid
{% raw %}{% assign sorted_tags = site.tags | sort_natural: 'last' | reverse %}{% endraw %}
```

태그 객체(`site.tags`)의 구조는 `tag_name: posts`이므로 `last`는 포스트 배열을 의미하며, 배열 길이 기반 정렬이 가능하다.

### 적용 후 확인

태그가 내림차순으로 정리된다.

![태그 내림차순 적용 화면](/assets/posts/2025-12-12-jekyll-chirpy-troubleshooting/image 2.png)

### 배운 점

* Liquid 문법은 단순해 보이지만, 자료 구조를 잘 이해하면 다양한 정렬/필터링을 구현할 수 있다.

---

## 5. Archive 가독성 개선 (카테고리별 최신 포스트만 표시)

### 문제 발생 배경

기본 Chirpy 아카이브는 모든 포스트를 시간순으로 출력한다.
내가 원하는 형태는:

* “카테고리별 최신 포스트만 보이게”
* 날짜 중복은 제거하여 간결하게
* 기존 Chirpy UI(점 아이콘, 세로줄 divider)는 유지

### 해결 과정 요약

1. 모든 포스트를 순회하며 카테고리별 가장 최신 포스트만 추출
2. Liquid 배열로 변환 후 timestamp 기준 정렬
3. 날짜 중복이면 해당 날짜 span을 투명 처리하여 레이아웃 유지
4. 기존 구조를 변형하지 않아 divider와 점 정렬을 그대로 유지

### 핵심 코드 (날짜 중복 제거)

```liquid
{% raw %}{% if current_date_key != last_date %}
  <span class="date day">{{ iso | date: '%d' }}</span>
  <span class="date month small">
    {{ iso | date: df_strftime_m }}
  </span>
{% else %}
  <span class="date day" style="color: transparent;">
    {{ iso | date: '%d' }}
  </span>
  <span class="date month small" style="color: transparent;">
    {{ iso | date: df_strftime_m }}
  </span>
{% endif %}{% endraw %}
```

### 적용 후 확인

아카이브 항목이 카테고리별로 보이고, 날짜는 한 번만 표시된다.

![Archive 가독성 개선 적용 화면](/assets/posts/2025-12-12-jekyll-chirpy-troubleshooting/image 3.png)

### 배운 점

* Chirpy 아카이브 UI는 매우 정밀하게 설계되어 있어, 구조 변경 없이 “투명 처리” 수준의 개입이 가장 안정적이다.
* 날짜·divider·콘텐츠의 상대 위치가 깨지지 않도록 inline 흐름을 유지하는 것이 핵심이었다.

---

# 결론: Chirpy 커스터마이징에서 얻은 교훈

* 테마 기반 프로젝트는 **공식 템플릿에서 시작하는 것이 가장 빠르고 정확하다.**
* Liquid 문법은 단순하지만 설계가 중요하다. 자료 구조와 흐름을 이해하면 원하는 형태로 정렬/필터링을 구현할 수 있다.
* UI 안정성을 유지하려면 기존 테마의 DOM 구조를 최대한 보존해야 한다.
* 향후 개선 예정: **GA4 도입**, **PWA 개선**, **Sitemap 확장**, **SEO 메타데이터 커스터마이징**
