---
title: "TypeScript는 왜 필요한가 – 언어가 아니라 컴파일 전략이다"
description: "TypeScript를 런타임 변화가 아닌 컴파일 안전 전략으로 쓰는 핵심 가치와 경계면 검증 방법을 정리"
categories: ["🟦 TypeScript & Language"]
tags: ["TypeScript", "CompileTime", "NullSafety", "Unknown"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:31:00 +09:00
last_modified_at: 2025-12-16 13:31:00 +09:00
---

## TypeScript의 핵심 가치는 “런타임 버그를 컴파일타임으로 끌어올리는 것”이다

JavaScript의 가장 큰 비용은 “문제가 **실행된 뒤**에야 드러난다”는 점이다. TypeScript는 코드를 실행하기 전에 타입(형태/제약)을 검사해서, **깨질 가능성이 높은 코드 경로를 미리 막는다.**
여기서 중요한 포인트는 “타입이 런타임을 바꾸는 게 아니라”, **컴파일(빌드) 단계에서 위험을 줄이는 전략**이라는 것이다.

---

## TypeScript 타입 시스템은 “할 수 있는 일”과 “못 하는 일”이 명확하다

TypeScript는 **컴파일타임 검사기**다. 즉, 타입 시스템은 코드가 실행되기 전에만 작동한다.

### 타입 시스템이 하는 일: 코드의 “형태”와 “계약”을 검증한다

* 객체에 존재하지 않는 프로퍼티 접근 차단
* 함수 인자/반환의 형태 불일치 차단
* 널/언디파인드 가능성(설정에 따라) 노출
* 리팩토링 시 영향 범위를 컴파일 에러로 표면화

### 타입 시스템이 못 하는 일: 런타임 데이터의 진실을 보장하지 못한다

* 네트워크 응답(JSON)이 실제로 타입대로 왔는지 보장 불가
* localStorage/URL query/user input 같은 외부 입력은 런타임에서 깨질 수 있음
* `any`, 타입 단언(`as`), 잘못된 선언 파일(`.d.ts`)은 **거짓 안정감**을 만들 수 있음

**결론:** TS는 “정적(compile-time) 안전”을 주고, “동적(runtime) 안전”은 별도(런타임 검증)로 챙겨야 한다.

---

## 문제 사례 1: undefined 접근은 JS에서 조용히 터지고, TS에선 빨리 드러난다

### 결론: “값이 없을 수도 있음”을 타입으로 표현하면 접근 자체가 강제 제어된다

#### JS (런타임에서 터짐)

```ts
// (JS라고 가정) 런타임에서 user가 null이면 터진다.
function printUserName(user) {
  console.log(user.name.toUpperCase());
}
```

#### TS (컴파일 단계에서 차단)

```ts
type User = { name: string };

function printUserName(user: User | null) {
  // user가 null일 수도 있으니 접근 불가
  // console.log(user.name.toUpperCase()); // ❌ 컴파일 에러

  if (!user) return;
  console.log(user.name.toUpperCase()); // ✅ 안전
}
```

**디버깅 포인트(흔한 실수):**

* “어차피 항상 들어와”라고 생각하고 `user as User`로 덮어버림 → 런타임에서 그대로 터짐
* strictNullChecks를 끄고 “편해졌다” 착각 → 나중에 장애 비용이 커짐

---

## 문제 사례 2: API 응답 형태 변동은 JS에서 늦게 터지고, TS에선 경계면을 강제한다

### 결론: 외부 데이터는 “타입을 믿지 말고, 검증 후 좁혀라”

#### JS (응답 구조가 바뀌면 조용히 실패)

```ts
async function getTitle() {
  const res = await fetch("/api/post");
  const data = await res.json();
  return data.title.toUpperCase(); // title이 없거나 null이면 런타임 에러
}
```

#### TS (경계면에서 unknown으로 받고 좁히기)

```ts
function isPost(x: unknown): x is { title: string } {
  if (typeof x !== "object" || x === null) return false;
  return "title" in x && typeof (x as any).title === "string";
}

async function getTitle() {
  const res = await fetch("/api/post");
  const data: unknown = await res.json(); // ✅ 외부 입력은 unknown으로 받는 게 정석

  if (!isPost(data)) {
    throw new Error("Invalid API response shape");
  }

  return data.title.toUpperCase(); // ✅ 타입이 좁혀져 안전
}
```

**핵심:** `unknown`은 “아무것도 모른다”를 의미해서 **그대로 쓰는 걸 금지**한다. 그래서 경계면(네트워크/저장소/유저 입력)에서 가장 유용하다.

---

## 타입 추론(implicit)과 명시적 타입(explicit)의 경계는 “설계 안정성”으로 결정한다

### 결론: 추론은 기본, “경계면/공용 API/의도 고정”에는 명시가 이득이다

#### 추론에 맡겨도 되는 경우(대부분의 로컬 변수)

```ts
const count = 1; // number로 추론
const tags = ["ts", "js"]; // string[]로 추론
```

#### 명시하는 게 이득인 경우(의도 고정 / API 계약 / 리팩토링 안전성)

```ts
type Role = "admin" | "user";

function setRole(role: Role) {
  // role 계약이 명확해지고 호출부가 강제된다
}
```

**실무 판단 기준:**

* 추론 유지: “코드를 읽으면 타입이 자명한 로컬 범위”
* 명시 필요: “다른 파일/팀이 호출하는 함수 시그니처”, “외부 입력을 받는 경계”, “리턴 타입이 복잡해지는 비동기/헬퍼”

---

## “TS를 쓰면 안전하다”의 함정은 대부분 `any`와 타입 단언에서 시작한다

### 결론: any/단언은 빚이며, 최소화하지 않으면 TS ROI가 급락한다

#### 1) any는 타입 시스템을 해제한다

```ts
let x: any = 123;
x.toUpperCase(); // 컴파일 통과, 런타임에서 터질 수 있음
```

#### 2) 타입 단언(as)은 “검증”이 아니라 “우기기”다

```ts
type User = { name: string };

const u = JSON.parse('{"name":123}') as User; // ✅ 컴파일은 통과
// 런타임에서 u.name은 number라서 이후 코드가 깨질 수 있음
```

**원칙:**

* 단언은 “이미 검증된 값”을 타입에 반영할 때만 사용
* 외부 데이터는 `unknown` + 타입가드(또는 런타임 스키마 검증)로 처리

---

## `never`는 “도달 불가능”을 강제해서, 누락된 분기를 컴파일 에러로 만든다

### 결론: 유니언 상태가 커질수록 never 기반 exhaustive check가 유지보수 비용을 줄인다

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number };

function assertNever(x: never): never {
  throw new Error("Unhandled case: " + JSON.stringify(x));
}

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius * s.radius;
    case "square":
      return s.size * s.size;
    default:
      return assertNever(s); // ✅ 새로운 kind가 추가되면 여기서 컴파일 에러로 잡힘
  }
}
```

**왜 중요한가:**

* 타입이 늘어날 때 “처리 누락”이 런타임 버그로 가기 전에 컴파일 단계에서 막는다.
* 상태 머신(UI 상태/비즈니스 상태) 설계에서 특히 강력하다.

---

## tsc의 동작 흐름은 “타입체크 → JS 방출”이며, 설정에 따라 방출 정책이 바뀐다

### 결론: TS는 최종적으로 JS를 만든다. 에러가 있어도 JS가 나갈 수 있다는 점을 통제해야 한다

#### 기본 파이프라인

1. TS 소스 입력
2. 타입 체크
3. (설정에 따라) JS emit(출력)

#### 실무에서 중요한 옵션 개념

* 에러가 있어도 JS를 방출하면: “빌드는 되는데 런타임에서 터지는” 상황이 생길 수 있음
* 방출을 막으면: “타입 안정성이 깨진 상태로 배포되는” 리스크를 줄일 수 있음

**실무 포인트:** 팀이 TS를 “문서 수준”으로 쓸지, “게이트키퍼”로 쓸지(tsc 에러를 빌드 실패로) 정책을 정해야 ROI가 올라간다.

---

## 실무 판단 기준: 언제 TypeScript ROI가 높은가/낮은가

### 결론: “변경이 잦고 협업이 크며 경계면이 많은 코드”일수록 TS ROI가 폭증한다

#### ROI가 높은 경우

* API/데이터 모델이 복잡하고 자주 바뀜
* 팀 규모가 커서 리팩토링 비용이 큼
* 상태/분기(유니언)가 많아 누락 버그가 자주 발생
* 라이브러리/모듈 재사용이 많음(공용 함수/컴포넌트)

#### ROI가 낮아지는 경우

* `any` 남발, 타입 단언으로 덮기, strict 옵션 꺼둠
* 단기 스크립트/일회성 코드(단, 재사용되기 시작하면 즉시 바뀜)
* 런타임 검증이 필요한 경계면을 타입만으로 해결하려는 경우

---

## 체크리스트

### 결론: 아래 6개만 지키면 “TS 도입했는데도 불안한 코드”를 대부분 제거한다

* [ ] 외부 입력(fetch/json/storage)은 `unknown`으로 받고 타입가드로 좁힌다
* [ ] `any`는 금지하고 필요하면 범위를 최소화한다
* [ ] 타입 단언(`as`)은 “검증 이후”에만 사용한다
* [ ] 유니언 상태는 `kind`(discriminant)로 모델링한다
* [ ] switch에는 `never` exhaustive check를 넣는다
* [ ] 팀 정책으로 “타입 에러 시 빌드 실패”를 기본값으로 둔다

---

## 요약 5줄

1. TypeScript의 핵심은 런타임 버그를 컴파일타임으로 당기는 전략이다.
2. TS는 컴파일타임 검사기이며 런타임 데이터의 진실은 보장하지 못한다.
3. 추론은 기본이고, 경계면/공용 API/의도 고정 지점은 명시 타입이 이득이다.
4. `unknown`은 외부 입력을 안전하게 처리하게 만들고, `never`는 누락 분기를 컴파일 에러로 만든다.
5. `any`와 타입 단언 남발은 TS ROI를 박살내며, 정책(빌드 게이트) 없으면 효과가 반감된다.

---

## 자기점검 질문 5개

1. 내 프로젝트에서 “외부 입력 경계면”은 어디이며, 현재 타입을 어떻게 받고 있는가?
2. `as`를 쓰는 지점은 “검증 이후”인가, “우기기”인가?
3. `any`가 들어간 파일/모듈은 왜 any가 필요했는가(대안은)?
4. 상태/분기가 많은 로직에 discriminated union + never 체크가 들어가 있는가?
5. 타입 에러가 나도 빌드/배포가 되는 파이프라인인가, 막히는 파이프라인인가?

---

## 실전 미션 3개 (각 30분 내)

1. 코드베이스에서 `as` 검색 후 5개만 골라 “unknown + 타입가드”로 바꿔라(외부 입력 우선).
2. 유니언 상태를 쓰는 switch 1곳에 `assertNever`를 추가하고, 일부러 케이스 하나를 빼서 컴파일 에러가 나는지 확인하라.
3. `any`가 있는 모듈 1개를 골라 `unknown`/제네릭/유니언 중 하나로 치환하고, 타입이 실제로 더 좁혀졌는지 확인하라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

