---
layout: post
title: "Jekyll 블로그 고도화를 위한 To-Do 리스트"
date: "2025-12-12 13:25:00 +09:00"
category: "Jekyll 블로그 구축"
tags:
  - jekyll
  - chirpy
  - roadmap
  - blog-dev
published: true
description: "트러블슈팅 이전 단계에서 정리한 Jekyll 블로그 고도화 과제와 참고 캡처 모음"
---

트러블슈팅 세부 기록을 작성하기 전에, 블로그 고도화를 위해 필요한 작업들을 간략히 정리해 두었다. 우선순위를 빠르게 파악하고, 이후 상세 트러블슈팅 글에서 해결 과정을 이어가기 위한 체크리스트다.

## 고도화 To-Do

| 항목                                                  | 고도화 전                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| 코드 블록 내부 린팅                                   | ![image](/assets/posts/2025-12-12-jekyll-blog-todo/image.png)   |
| 포스팅별 썸네일 이미지 추가 검토                      | ![image](/assets/posts/2025-12-12-jekyll-blog-todo/image 2.png) |
| 댓글 기능 추가                                        | ![image](/assets/posts/2025-12-12-jekyll-blog-todo/image 3.png) |
| Tag 내림차순 정리                                     | ![image](/assets/posts/2025-12-12-jekyll-blog-todo/image 4.png) |
| Archive 가독성 개선(글 카테고리 별로만 View 가능한지) | ![image](/assets/posts/2025-12-12-jekyll-blog-todo/image 5.png) |
| GA4 도입 검토                                         | -                                                               |

## 간략 메모
- 코드 블록: 렌더링/라인 브레이크 이상 여부 확인 후 린팅 규칙 정비.
- 썸네일: Front Matter `image` 적용 + 경로 실존 여부 체크.
- 댓글: giscus 설정 및 Origin 허용 도메인 점검.
- 태그: 포스트 수 기준 내림차순 정렬 확인.
- 아카이브: 카테고리별 최신 포스트만 노출, 날짜 중복 최소화.
- GA4: 추후 배포 파이프라인에 측정 ID 추가 검토.

이 체크리스트를 기반으로 이후 트러블슈팅 글에서 세부 해결 과정을 이어갈 예정이다.
