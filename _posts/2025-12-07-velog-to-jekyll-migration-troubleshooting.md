---
title: Velog → Jekyll 마이그레이션 트러블슈팅 전체 기록
date: "2025-12-07 04:30:00 +09:00"
tags:
  - velog
  - jekyll
  - graphql
  - migration
layout: post
published: true
description: Velog 381개 글을 Jekyll로 완전히 이전하기까지 진행된 전체 문제 해결 과정 정리
---

## 🚀 Velog → Jekyll 마이그레이션 트러블슈팅 기록

- **실행 결과:**

  ```
  Max limit is 100
  ```

  Velog는 `limit 100` 제한이 있었습니다. Pagination으로 해결 가능했지만, 더 큰 문제가 있었습니다. 381개 글 중 약 **50개만 반환**되는 문제가 발견되었습니다.

- **원인:** 이는 **v1/v2 혼용된 구형 API의 불완전 동작**으로 확인되었고, 전체 수집 방식의 재설계가 필요했습니다.

---

### 2. HTML에서 Apollo GraphQL State 추출 시도 (실패)

과거 Velog 웹 페이지에는 `window.__APOLLO_STATE__` 또는 `window.__INITIAL_DATA__` 값이 포함되어 있었으므로, HTML 내부 `<script>`를 모두 스캔해 JSON을 추출하는 방식으로 접근했습니다.

- **문제:** 최신 Velog는 **Next.js App Router + RSC (Server Components) 구조**였습니다.
- **HTML 분석 결과:**
  ```css
  APOLLO_STATE not found in series page HTML.
  ```
  HTML 파싱은 불가능한 전략이었습니다.

---

### 3. Network 패널 분석: Velog 내부 요청 구조 파악 (전략 수정)

Chrome DevTools Network 분석 결과 중요한 API 요청들이 발견되었습니다.

| Endpoint                      | 설명                                    |
| :---------------------------- | :-------------------------------------- |
| `https://v3.velog.io/graphql` | 내부 웹 통신용 (일반 접근 비권장)       |
| `https://v2.velog.io/graphql` | **공식 GraphQL API** — 모든 데이터 제공 |
| `?_rsc=`                      | Next.js Server Component 통신           |
| `HTML chunk scripts`          | 정적 리소스                             |

**핵심 결론:** Velog 데이터는 모두 **v2 GraphQL API**를 통해 가져와야 하며, HTML 파싱은 배제합니다.

---

### 4. v2 GraphQL 스키마 파악 및 Series 목록 수집 성공

브라우저 Network에서 실제 호출되는 Series 목록 쿼리를 확인했습니다.

- **Series 목록 쿼리:**
  ```graphql
  query getUserSeriesList($username: String!) {
    user(username: $username) {
      id
      series_list {
        id
        name
        url_slug
        posts_count
        updated_at
      }
    }
  }
  ```
  이 쿼리는 완벽하게 작동하여 시리즈 메타데이터를 안정적으로 받을 수 있었습니다.

---

### 5. Series별 게시물 목록 수집 성공

Series 내부 글 목록 조회 쿼리를 사용하여 모든 시리즈의 글을 수집했습니다.

- **Series 내부 글 목록 조회 쿼리:**
  ```graphql
  query Series($username: String, $url_slug: String) {
    series(username: $username, url_slug: $url_slug) {
      series_posts {
        index
        post {
          id
          title
          url_slug
        }
      }
    }
  }
  ```
  → 모든 **Series 28개**, 시리즈 게시물 총합 **350+ 개** 수집 성공.

---

### 6. Standalone Posts 수집 실패: `user_posts` 제거된 문제

시리즈에 포함되지 않은 독립적인 글 (Standalone Posts)을 수집하기 위해 `user_posts(username: $username)` 필드를 사용하려고 했으나, v2 API에서 오류가 발생했습니다.

- **오류:**
  ```
  Cannot query field "user_posts" on type "Query"
  ```
- **원인:** `user_posts`는 **v1 GraphQL의 구 API**였고, v2에는 존재하지 않으며 Velog 웹도 더 이상 사용하지 않았습니다. 따라서 Standalone 글 수집이 불가능했습니다.

---

### 7. 해결: v2의 공식 필드 `posts(username:)` 발견 (결정적)

결정적인 해결책은 v2 공식 API에서 **cursor 기반 Pagination**을 지원하는 필드를 발견한 것입니다.

- **결정적 해결책:**

  ```
  posts(username: String, limit: Int, cursor: ID): [Post]
  ```

- **이 필드가 제공하는 것:**

  - ✔ 특정 유저의 **모든 공개 글**
  - ✔ Series 포함·미포함 **모두 반환**
  - ✔ **Pagination 지원** (cursor 기반)

  이 필드가 **Velog 전체 글 381개**를 수집할 수 있는 유일한 필드였습니다.

---

### 8. Standalone 수집 → 전체 글(381개) 완전 수집 성공

Series 포함 글 (350+ 개)과 Standalone 글 (약 31개)을 합쳐 Slug 중복 제거 후 **최종 381개** 글을 완전 확보했습니다.

---

### 9. 본문 조회 (`ReadPost`) 처리

본문 데이터는 다음 쿼리로 가져왔습니다.

- **본문 조회 쿼리:**
  ```graphql
  query ReadPost($username: String, $url_slug: String) {
    post(username: $username, url_slug: $url_slug) {
      body
      tags
      thumbnail
      series {
        id
        name
      }
    }
  }
  ```
  Velog 본문은 **Markdown** 형식이므로 추가 변환 작업이 최소화되었습니다.

---

### 10. Markdown 변환 + 이미지 다운로드 파이프라인 구축

최종 Jekyll 파일 생성을 위한 파이프라인 구축 단계입니다.

- **주요 처리 과정:**

  - Markdown 내부의 Velog 이미지 URL 자동 탐지.
  - 이미지 다운로드 후 저장 구조: `assets/images/<slug>/<filename>`
  - MD 내부 URL rewrite.

- **Jekyll Front Matter 자동 생성 필드:**

  ```yaml
  title:
  slug:
  date:
  updated:
  series:
  tags:
  description:
  thumbnail:
  velog_url:
  ```

- **파일명 규칙:** Jekyll 규칙을 따름:
  ```
  YYYY-MM-DD-slug.md
  ```

---

### 11. 최종 실행 결과

최종 크롤링 실행 로그를 통해 Velog → Jekyll 마이그레이션이 완전 자동화되었음을 확인했습니다.

```yaml
Series discovered: 28
Series posts collected: OK
Standalone posts collected: 31
Merged unique posts: 381
Markdown converting...
Images downloaded...
Jekyll files saved under _posts/...
```
