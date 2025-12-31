---
layout: post
title: "시스템 디자인 연습 완주"
description: "포럼·쇼핑몰 사례로 요구사항→API→구성→병목→장애→운영까지 선택과 배제를 기록하는 설계 프레임"
categories: ["🗿 Architecture Design"]
tags: ["System Design", "ADR", "SLO", "Trade-off"]
image: /assets/posts/2025-12-31-architecture-design/image.png
date: 2025-12-31 22:42:00 +09:00
---


---

## 이 글의 결론
**면접 설계는 “그럴듯한 아키텍처”가 아니라, 요구사항→API→구성→병목→운영까지 밀어붙이며 선택과 배제의 근거를 남기는 게임이다.**

---

## 공통 진행 프레임
**두 시스템 모두 같은 순서로 완주한다: 요구사항(ADR) → API → 컴포넌트/데이터흐름 → 병목 → 장애/Degraded → 운영/관측성.**

---

# 1) 확장성 높은 포럼 설계

## 1-1. 요구사항 표 + ADR
**포럼은 읽기 지연과 검색이 핵심이며, 쓰기 정합성은 제한적으로만 강제한다.**

| 구분 | 요구사항                             | 수치/조건    |
| ---- | ------------------------------------ | ------------ |
| 기능 | 게시글/댓글 CRUD, 조회, 좋아요, 신고 | 핵심 플로우  |
| 품질 | 조회 p95 200ms, 월 99.99%            | 읽기 우선    |
| 품질 | 쓰기 p95 500ms, 월 99.9%             | 쓰기 덜 중요 |
| 제약 | 다중 디바이스, 외부 검색 필요        | 검색 인덱스  |
| 제약 | 개인정보 최소 수집                   | 데이터 분리  |

**ADR(3~6)**
1) 조회 p95 200ms → 캐시 계층 필수  
2) 검색은 별도 인덱스 스토어 → RDB LIKE 금지  
3) 댓글/좋아요는 eventual 허용(단, 중복 방지)  
4) 쓰기와 읽기 저장소 접근 경로 분리(CQRS 성향)  
5) 장애 시 조회는 degraded 제공(캐시/스냅샷)

---

## 1-2. API 초안(6~10) + 멱등성/에러/버전
**API는 소비자(웹/모바일/외부) 증가를 전제로 ‘진화 가능성’을 남겨야 한다.**

버전: `/v1` (초기 명시적 버전)  
에러: `{ "code": "...", "message": "...", "traceId": "..." }` 고정  
멱등성: POST/PUT 중 중요한 쓰기는 `Idempotency-Key` 지원

- `GET /v1/posts?cursor=...&limit=...`
- `GET /v1/posts/{postId}`
- `POST /v1/posts` (Idempotency-Key)
- `POST /v1/posts/{postId}/comments` (Idempotency-Key)
- `GET /v1/posts/{postId}/comments?cursor=...`
- `POST /v1/posts/{postId}/likes` (멱등: userId+postId)
- `DELETE /v1/posts/{postId}/likes`
- `GET /v1/search/posts?q=...&cursor=...`
- `POST /v1/reports` (신고)

**다른 선택지(버린 이유)**
- RPC 선택: 내부 전용이면 가능하지만, 포럼은 소비자 다양 + 진화 필요 → REST 채택
- “POST /getPost” 같은 동작 중심: 캐시/관측/표준성에서 손해 → 배제

---

## 1-3. 컴포넌트 분해 + 데이터 흐름
**포럼은 “조회 경로 최적화”와 “검색 분리”가 핵심이다.**

구성(텍스트 다이어그램)
```
Client
-> API (Auth/RateLimit)
-> Post Service  -> RDB(Post, Comment)
-> Like Service  -> KV/Cache(Like counter)
-> Search Service-> Search Index
-> Feed Cache    -> Redis
Event Bus(선택) -> Indexer -> Search Index
```

데이터 흐름(게시글 작성)
1) Post Service: RDB에 게시글 저장(트랜잭션)
2) 이벤트 발행(옵션): `PostCreated`
3) Indexer가 검색 인덱스 갱신(비동기)

데이터 흐름(게시글 조회)
1) 캐시 조회(Feed/Post cache) hit → 응답  
2) miss → RDB 조회 → 캐시 저장 → 응답

**다른 선택지 2개(버린 이유)**
- 단일 RDB로 검색까지: 인덱스/쿼리 폭발, p95 악화 → 배제
- 모든 쓰기를 강한 일관성으로: 좋아요/조회수까지 트랜잭션 → 비용 폭발 → 배제

---

## 1-4. 핵심 병목 3개 + 대응
**병목은 “CPU”가 아니라 “데이터 접근 패턴”에서 먼저 터진다.**

1) 핫 게시글 조회 폭주  
- 대응: 캐시(짧은 TTL) + 요청 coalescing  
- 버린 선택: 무제한 캐시 TTL(정합성/무효화 비용)  

2) 댓글 리스트 페이지네이션 비용  
- 대응: cursor 기반 + 댓글 파티셔닝(postId 기반)  
- 버린 선택: OFFSET 기반(깊어질수록 비용 증가)  

3) 검색 인덱스 갱신 지연  
- 대응: 비동기 인덱싱 + lag 모니터링  
- 버린 선택: 동기 인덱싱(쓰기 p95 상승)

**충돌 드러내기(1)**  
- 조회 성능(p95) vs 비용(캐시 메모리) → TTL/핫키만 캐시로 타협

---

## 1-5. 장애 시나리오 3개 + degraded mode
**부분 장애에서 “무엇을 유지할지”가 시스템의 성격을 드러낸다.**

1) Search Index 장애  
- 전략: 검색 API는 “일시 중단” + 인기글/카테고리 탐색으로 대체(degraded)  

2) Cache 장애(전면 miss)  
- 전략: RDB 보호를 위해 rate limit + 일부 기능(추천/피드) 단순화  

3) Like Service 장애  
- 전략: 좋아요는 임시 비활성화(핵심 기능 아님), 본문 조회는 유지

**충돌 드러내기(2)**  
- 가용성 vs 일관성: 좋아요 수는 약간 stale 허용, 조회 가용성 유지

---

## 1-6. 운영/관측성 최소 요건
**SLI를 고정하지 않으면 운영이 ‘감’이 된다.**

SLI 3개
- `GET /posts/{id}` p95 latency
- 성공 요청 비율(2xx/전체)
- Search indexing lag(초)

알람 5개
- 조회 p95 300ms 초과 5분 지속
- 5xx 비율 1% 초과
- RDB CPU/Connection 임계치
- 캐시 hit ratio 급락
- 인덱싱 lag 60초 초과

---

# 2) 인터넷 쇼핑몰 플랫폼 설계

## 2-1. 요구사항 표 + ADR
**쇼핑몰은 결제/재고에서 일관성이 강제되고, 조회는 확장성이 강제된다.**

| 구분 | 요구사항                        | 수치/조건 |
| ---- | ------------------------------- | --------- |
| 기능 | 상품/장바구니/주문/결제/배송    | 핵심      |
| 품질 | 결제 성공률 99.99%, 중복 결제 0 | 강제      |
| 품질 | 상품 조회 p95 200ms, 월 99.99%  | 읽기 우선 |
| 제약 | PG 연동, 감사 로그 5년          | 규제/감사 |
| 제약 | 이벤트 트래픽 10배              | 스파이크  |

**ADR(3~6)**
1) 결제/주문은 멱등성 강제(Idempotency-Key)  
2) 재고 차감은 강한 일관성 또는 단일 경계로 고정  
3) 상품 조회는 캐시/CDN 적극 사용  
4) 주문-결제-배송은 사가/보상 고려(부분 실패 전제)  
5) 감사 로그는 append-only로 별도 보관

---

## 2-2. API 초안(6~10) + 멱등성/에러/버전
**결제는 API 설계에서 실수하면 금전 손실로 바로 연결된다.**

버전: `/v1`  
에러: `code/message/traceId` 고정  
멱등성: 결제/주문은 필수

- `GET /v1/products?cursor=...`
- `GET /v1/products/{productId}`
- `POST /v1/cart/items` (Idempotency-Key 선택)
- `POST /v1/orders` (Idempotency-Key 필수)
- `GET /v1/orders/{orderId}`
- `POST /v1/payments/charge` (Idempotency-Key 필수)
- `POST /v1/payments/webhook` (서명 검증)
- `POST /v1/shipments` (내부/백오피스)
- `GET /v1/inventory/{productId}` (내부 제한)

**다른 선택지(버린 이유)**
- 결제까지 REST 리소스 모델만 고집: 실제로는 명령형(Charge) 의미가 강함 → 내부는 RPC/명령형 허용
- 버전 없는 확장: 외부 연동(PG/파트너) 증가 시 파괴적 변경 위험 → 명시 버전 유지

---

## 2-3. 컴포넌트 분해 + 데이터 흐름
**쇼핑몰의 핵심은 ‘경계’다: 상품 조회 경계와 결제 경계는 분리된다.**

구성
```
Client
-> API Gateway(인증/레이트리밋/관측)
-> Catalog Service  -> Cache/CDN -> Catalog DB
-> Cart Service     -> KV Store
-> Order Service    -> Order DB
-> Payment Service  -> Payment DB + PG
-> Inventory Service-> Inventory DB(강한 일관성 경계)
Event Bus(선택) -> Shipping/Notification/Analytics
Audit Log Store(append-only)
```

데이터 흐름(주문 생성→결제)
1) Order Service: 주문 생성(상태=CREATED)
2) Payment Service: 결제 요청(멱등키)
3) 결제 성공 → 주문 상태 PAID
4) Shipping 이벤트 발행(비동기)

**다른 선택지 2개(버린 이유)**
- 모든 것을 이벤트 기반으로: 결제/재고의 즉시성 요구와 충돌, 디버깅 비용 폭증 → 배제
- 주문/결제/재고를 한 DB로: 초기엔 단순하지만, 조회 트래픽과 결제가 충돌 → 경계 분리

---

## 2-4. 핵심 병목 3개 + 대응
**쇼핑몰 병목은 “이벤트 트래픽 + 재고 + 결제”에서 터진다.**

1) 이벤트 시 상품 조회 폭증  
- 대응: CDN + 캐시(immutable URL/버전)  
- 버린 선택: DB 직접 조회(비용/지연 폭발)

2) 재고 차감 경합  
- 대응: 단일 재고 경계(Inventory Service) + optimistic lock  
- 버린 선택: 분산 락 남발(운영/장애 위험)

3) 결제 처리량/PG 지연  
- 대응: 타임아웃/재시도/서킷브레이커 + 대체 결제 수단  
- 버린 선택: 무제한 재시도(중복 결제 위험)

**충돌 드러내기(3)**  
- 가용성 vs 일관성: PG 지연 시 결제는 일관성 우선(CP 성향), 대신 사용자에게 “결제 확인 중” 상태 제공

---

## 2-5. 장애 시나리오 3개 + degraded mode
**장애 시 ‘결제’는 지키고, ‘편의 기능’은 버린다.**

1) PG 장애  
- 전략: 결제 요청 중단 + 주문 상태를 PENDING으로 유지 + 재시도 큐(제한)  

2) Catalog Cache/CDN 이상  
- 전략: 일부 카테고리 제한 + DB 보호(rate limit) + 인기상품 스냅샷 제공  

3) Event Bus 장애(배송/알림)  
- 전략: 주문/결제는 유지, 배송/알림은 지연 허용

---

## 2-6. 운영/관측성 최소 요건
SLI 3개
- 결제 성공률
- 주문 생성 p95 latency
- 재고 차감 실패율(락/충돌)

알람 5개
- 결제 실패율 급증(분당 기준)
- PG 타임아웃 증가
- 재고 충돌률 임계치 초과
- 주문 상태 전이 지연(예: CREATED→PAID 지연)
- 5xx/latency SLO 위반

---

# 3) 두 시스템에서 반복되는 “결정 프레임” 7개
**설계는 매번 같은 질문을 반복하는 작업이다.**

1) 이 기능은 강한 일관성이 필요한가  
2) 읽기/쓰기를 분리할 수 있는가  
3) 캐시를 넣으면 정합성 비용을 감당 가능한가  
4) 동기/비동기 중 무엇을 포기할 것인가(즉시성 vs 처리 보장)  
5) 장애 시 반드시 살릴 최소 기능은 무엇인가  
6) 지표(SLI/SLO)가 숫자로 고정됐는가  
7) “지금” 필요한가, “나중”을 위해 과투자인가

---

# 4) 면접 화이트보드 35분 타임박스 스크립트(분 단위)
**완주는 시간 배분이 만든다.**

- 0~3: 요구사항(기능/품질/제약) 수치 고정
- 3~6: ADR 3~5개 선언
- 6~12: API 초안 6~8개(멱등/에러/버전 1문장씩)
- 12~20: 컴포넌트 분해 + 데이터 흐름 2개
- 20~26: 병목 3개 + 대응(버린 선택지 2개 포함)
- 26~31: 장애 시나리오 2~3개 + degraded
- 31~35: 운영/관측성(SLI 3, 알람 5) + 트레이드오프 요약

---

# 5) 재학습 체크리스트 15개
1. 요구사항을 수치로 고정했는가
2. ADR이 설계를 강제하는가
3. API에 멱등성이 포함됐는가
4. 에러 스키마가 일관적인가
5. 버전 전략이 있는가
6. 데이터 경계가 명확한가
7. 읽기/쓰기 경로가 분리됐는가
8. 캐시 정합성 전략이 있는가
9. 검색/인덱싱이 분리됐는가
10. 병목을 데이터 접근 관점에서 설명했는가
11. 장애 반경을 통제했는가
12. degraded mode가 있는가
13. SLI 3개가 명시됐는가
14. 알람 5개가 구체적인가
15. “버린 선택지”와 이유를 말했는가

---

## 한 줄 요약
**포럼과 쇼핑몰의 차이는 기능이 아니라, 일관성·가용성·지연을 어디에 걸었는지에 있다.**

---

- 참고: [  소프트웨어 아키텍처 및 대규모 시스템 설계
](https://www.udemy.com/course/software-architecture-design-large-scale-systems/)
