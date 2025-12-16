---
title: "TypeScript 타입 시스템의 핵심 구조 – Primitive에서 Discriminated Union까지"
description: "Primitive부터 discriminated union까지 어떤 타입을 언제 써야 유지보수가 쉬운지에 대한 판단 기준을 제시"
categories: ["🟦 TypeScript & Language"]
tags: ["TypeSystem", "Union", "Tuple", "Enum"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:32:00 +09:00
last_modified_at: 2025-12-16 13:32:00 +09:00
---

## TypeScript 타입 시스템의 본질은 “값이 가질 수 있는 상태를 코드로 고정하는 것”이다

TypeScript의 타입은 문법 장식이 아니라 **값의 가능 범위를 제한해 사고 비용을 줄이는 도구**다. 이 글은 개별 문법이 아니라, **언제 어떤 타입을 선택해야 유지보수가 쉬워지는지**를 기준으로 설명한다.

---

## Primitive 타입은 가장 단순하지만, 가장 많이 오해된다

**결론:** Primitive 타입은 “값 자체”를 표현하며, 잘못 쓰면 타입 안정성이 가장 먼저 무너진다.

### 정의

* `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`
* JS의 원시값을 그대로 반영한 타입

### 언제 쓰나 (판단 기준)

* 값의 범위가 명확하고, 구조가 필요 없는 경우
* 로컬 계산, 단순 플래그, 옵션 값

### 흔한 실수

* `String`, `Number`, `Boolean` 같은 **래퍼 타입** 사용
* `null | undefined`를 고려하지 않은 설계

### 예제

```ts
let count: number = 0;      // ✅
let title: string = "TS";  // ✅

// ❌ 잘못된 사용
let name: String = "kim";  // 객체 래퍼 타입
```

---

## Object 타입은 “있다/없다”가 아니라 “구조”를 표현해야 한다

**결론:** `object`는 거의 쓰지 말고, 항상 구체적인 shape를 정의하라.

### 정의

* 객체의 프로퍼티 구조를 명시적으로 표현하는 타입

### 언제 쓰나

* 프로퍼티 이름과 타입이 고정된 데이터 모델
* 함수 인자, 상태, API 응답 모델

### 흔한 실수

* `object` 또는 `{}`로 뭉뚱그려 타입 선언
* optional(`?`) 남발로 실제 상태가 불분명해짐

### 예제

```ts
type User = {
  id: string;
  name: string;
  age?: number; // 정말 선택적인 경우만
};
```

---

## Array 타입은 “동질성”, Tuple은 “위치 기반 의미”를 가진다

**결론:** 길이와 의미가 고정되면 Array가 아니라 Tuple이다.

### 정의

* `T[]` / `Array<T>`: 동일 타입의 나열
* Tuple: 고정 길이 + 각 위치의 의미가 다름

### 언제 쓰나

* Array: 리스트, 컬렉션
* Tuple: 좌표, 페어, API 응답의 위치 기반 값

### 흔한 실수

* Tuple로 써야 할 걸 Array로 둬서 순서 버그 발생
* Tuple을 push로 확장해 의미 파괴

### 예제 (Tuple이 필요한 사례)

```ts
// 위도, 경도는 순서가 의미를 가진다
type LatLng = [number, number];

const location: LatLng = [37.5665, 126.9780];
```

---

## Enum은 “편리하지만 비용이 있다”, Union Literal이 기본값이다

**결론:** Enum은 런타임 코드가 필요할 때만 쓰고, 대부분은 union literal이 낫다.

### 정의

* `enum`: TS 컴파일 결과에 실제 JS 객체가 생성됨
* union literal: 컴파일 후 사라지는 타입 제약

### 언제 쓰나

* Enum: 런타임에서도 값 집합이 필요할 때
* Union literal: 상태/옵션 제한용 (대부분의 경우)

### 흔한 실수

* 단순 상태 표현에 enum 남용 → 번들 증가, 디버깅 복잡

### 예제 (Enum vs Union Literal)

```ts
// Enum
enum RoleEnum {
  Admin,
  User,
}

// Union Literal (권장)
type Role = "admin" | "user";
```

---

## Union과 Literal은 “상태를 타입으로 표현”하는 핵심 도구다

**결론:** if/flag로 처리하던 분기를 타입으로 끌어올려라.

### 정의

* Union: 여러 타입 중 하나
* Literal: 값 자체를 타입으로 고정

### 언제 쓰나

* 상태, 모드, 단계(step), 권한, UI 분기

### 흔한 실수

* boolean으로 상태를 표현해 확장 불가능해짐
* string을 풀어놓고 비교만으로 제어

### 예제

```ts
type Status = "idle" | "loading" | "success" | "error";

function render(status: Status) {
  if (status === "loading") {
    // ...
  }
}
```

---

## Type Alias vs Interface는 “확장 방식과 목적”이 다르다

**결론:** 데이터 모델은 type, 계약(구현 강제)은 interface가 기본 전략이다.

### 정의

* `type`: 모든 타입 표현 가능 (union, primitive 포함)
* `interface`: 객체 구조 + 선언 병합 가능

### 언제 쓰나

* type: API 모델, 상태, 유니언
* interface: 클래스 구현 계약, 라이브러리 공개 타입

### 흔한 실수

* 둘을 스타일 차이로만 인식
* union을 interface로 표현하려다 막힘

### 예제

```ts
type ApiResponse = { data: string } | { error: string };

interface Repository {
  save(data: string): void;
}
```

---

## Discriminated Union은 “상태 기반 로직”의 최종 형태다

**결론:** 상태가 3개 이상이면 Discriminated Union이 가장 안전하다.

### 정의

* 공통 식별자(`kind`, `type`)를 가진 union 타입

### 언제 쓰나

* UI 상태, 비즈니스 상태 머신, API 응답 분기

### 흔한 실수

* 식별자 없이 union만 사용 → 타입 좁히기 불가
* switch에서 default 처리 누락

### 예제 (exhaustive check 포함)

```ts
type UIState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string };

function assertNever(x: never): never {
  throw new Error("Unhandled state");
}

function render(state: UIState) {
  switch (state.type) {
    case "idle":
      return "대기";
    case "loading":
      return "로딩";
    case "error":
      return state.message;
    default:
      return assertNever(state);
  }
}
```

---

## Optional Chaining과 Nullish Coalescing은 “타입 경계에서만” 써야 한다

**결론:** 편의 문법이지, 설계 대체물이 아니다.

### 예제

```ts
type User = {
  profile?: {
    nickname?: string;
  };
};

const name = user.profile?.nickname ?? "anonymous";
```

**주의:** 내부 로직에서 남발하면 “왜 없는지”를 숨긴다.

---

## “이걸 쓰면 좋은데, 이 경우엔 쓰지 마라”

* Tuple ✔ 좌표/고정 포맷 / ❌ 가변 리스트
* Enum ✔ 런타임 필요 / ❌ 단순 상태
* Union ✔ 상태 분기 / ❌ 복잡한 객체 상속
* optional ✔ 진짜 선택 / ❌ 귀찮아서

---

## 체크리스트

* [ ] boolean 대신 union으로 상태를 표현했는가
* [ ] 고정 길이/의미 데이터에 tuple을 썼는가
* [ ] enum이 정말 런타임에 필요한가
* [ ] 외부/상태 분기에 discriminated union을 썼는가
* [ ] switch에 exhaustive check가 있는가

---

## 요약 5줄

1. 타입은 값의 “가능한 상태”를 제한하는 도구다.
2. Primitive/Object/Array/Tuple은 의미 단위로 선택해야 한다.
3. Enum은 비용이 있고, union literal이 기본값이다.
4. Union과 Literal은 상태를 타입으로 끌어올린다.
5. Discriminated Union은 확장 가능한 상태 모델의 정답이다.

---

## 자기점검 질문 5개

1. 현재 프로젝트에서 boolean으로 표현된 상태는 무엇인가?
2. enum을 쓰는 이유가 “편해서”인지 “런타임 필요”인지 구분되는가?
3. Array로 표현된 데이터 중 Tuple이 더 적절한 것은 없는가?
4. 상태 분기 switch에 exhaustive check가 있는가?
5. optional이 진짜 선택적인 의미를 가지는가?

---

## 실전 미션 3개

1. boolean 상태 하나를 union + discriminated union으로 리팩터링하라.
2. enum 하나를 union literal로 교체하고 번들 차이를 확인하라.
3. API 응답 모델을 discriminated union으로 다시 정의해보라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

