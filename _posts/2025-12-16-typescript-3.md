---
title: "함수와 제네릭으로 타입을 설계하는 법 – “타입이 설계를 주도”하게 만들기"
description: "제네릭과 함수 타입으로 입력-출력 관계를 고정해 오용이 불가능한 TypeScript 함수 시그니처를 설계하는 방법을 정리"
categories: ["🟦 TypeScript & Language"]
tags: ["Generics", "FunctionTypes", "Overload", "UtilityTypes"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:33:00 +09:00
last_modified_at: 2025-12-16 13:33:00 +09:00
---

## 결론: 좋은 TypeScript 함수는 “입력과 출력의 관계”를 타입으로 고정한다

함수는 로직 이전에 **계약(contract)** 이다. 제네릭은 그 계약에서 **입력과 출력의 관계를 보존**하는 도구다. 이 글의 목표는 “컴파일이 통과되는 코드”가 아니라 **변경에 강하고 오용이 불가능한 함수 시그니처**를 만드는 판단 기준을 제공하는 것이다.

---

## 반환 타입은 “의도를 고정할 때”만 명시하고, 나머지는 추론에 맡겨라

**결론:** 반환 타입은 안정성 도구이지, 장식이 아니다.

### 언제 명시해야 하나 (판단 기준)

* 공개 API/공용 유틸 함수
* 비동기 함수에서 에러/성공 형태를 고정할 때
* 리팩토링 중 의도 변경을 막고 싶을 때

### 언제 추론에 맡겨도 되나

* 로컬 헬퍼 함수
* 구현이 곧 타입 의도인 경우

### 흔한 실수

* 모든 함수에 반환 타입을 붙여 가독성 저하
* `Promise<any>`로 반환 의도 파괴

### 예제

```ts
// ❌ 과한 명시
function add(a: number, b: number): number {
  return a + b;
}

// ✅ 의도 고정이 필요한 경우
function fetchUser(): Promise<{ id: string; name: string }> {
  return fetch("/user").then(r => r.json());
}
```

---

## 함수 타입과 콜백 타입은 “호출 규약”을 고정하는 도구다

**결론:** 콜백이 많아질수록 함수 타입을 분리하라.

### 언제 쓰나

* 이벤트 핸들러
* 비동기 완료 콜백
* 전략 패턴(동작 교체)

### 흔한 실수

* 인라인 콜백 타입 반복
* `Function` 타입 사용(완전한 타입 정보 손실)

### 예제 (이벤트/비동기)

```ts
type OnComplete<T> = (result: T) => void;

function runAsync<T>(task: () => Promise<T>, onComplete: OnComplete<T>) {
  task().then(onComplete);
}
```

---

## 제네릭의 본질은 “관계를 보존하는 타입”이다

**결론:** 제네릭은 재사용이 아니라 **정보 보존**을 위해 존재한다.

### 제네릭이 없으면 타입 정보가 유실되는 예제

```ts
// ❌ 입력과 출력의 관계가 사라짐
function identity(value: any) {
  return value;
}

// ✅ 입력 타입이 그대로 출력으로 이어짐
function identity<T>(value: T): T {
  return value;
}
```

**핵심:** 제네릭은 “아무 타입이나”가 아니라 **같은 타입**을 의미한다.

---

## 제약(extends, keyof)은 “잘못된 사용을 금지”하기 위해 쓴다

**결론:** 제약 없는 제네릭은 any와 다를 바 없다.

### extends + keyof가 필요한 예제

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: "1", age: 20 };
getProperty(user, "id");   // ✅ string
getProperty(user, "email"); // ❌ 컴파일 에러
```

### 흔한 실수

* `<T extends any>` 같은 무의미한 제약
* 제약 없이 내부에서 특정 속성 접근

---

## Generic vs Union: “관계가 있으면 Generic, 없으면 Union”

**결론:** 선택 기준은 단 하나, **입력과 출력이 연결돼 있는가**다.

### Union이 맞는 경우

```ts
function format(value: string | number): string {
  return value.toString();
}
```

### Generic이 맞는 경우

```ts
function wrap<T>(value: T): { value: T } {
  return { value };
}
```

### 흔한 실수

* Union으로 반환 타입을 넓혀 정보 손실
* Generic으로 쓸 필요 없는 단순 분기까지 일반화

---

## 함수 오버로드는 “호출자 기준 타입 정확성”을 위해 사용한다

**결론:** 구현이 아니라 **호출 시그니처**가 중요한 경우에만 쓴다.

### 입력에 따라 반환 타입이 바뀌는 예제

```ts
function parse(value: string): string;
function parse(value: number): number;
function parse(value: string | number) {
  return value;
}

const a = parse("x"); // string
const b = parse(1);   // number
```

### 흔한 실수

* 오버로드 없이 union 반환 → 호출부에서 타입 좁히기 지옥

---

## Utility Types는 “새 타입을 만들지 않기 위한 도구”다

**결론:** 중복 모델을 만들기 시작하면 Utility Types를 검토하라.

### DTO / 폼 모델 예제

```ts
type User = {
  id: string;
  name: string;
  age: number;
  createdAt: Date;
};

// 폼 입력용
type UserForm = Pick<User, "name" | "age">;

// 수정용 DTO
type UserUpdate = Partial<UserForm>;

// API 응답용
type UserResponse = Omit<User, "createdAt">;
```

### 자주 쓰는 Utility Types 판단 기준

* `Partial`: 수정/임시 상태
* `Required`: 서버 응답 강제
* `Pick/Omit`: 역할별 모델 분리
* `Record<K, V>`: key-value 맵
* `ReturnType`: 기존 함수 계약 재사용

---

## 제네릭 남용 패턴 3가지 (읽기 어려워지는 순간)

**결론:** 제네릭은 많을수록 “똑똑해 보이지만 유지보수는 망가진다”.

1. 의미 없는 단일 제네릭

```ts
function log<T>(value: T): T { return value; } // T 의미 없음
```

2. 중첩 제네릭 폭탄

```ts
function f<T extends Record<string, U>, U>(x: T): U { ... }
```

3. Union으로 충분한데 Generic 사용

```ts
function isEmpty<T>(value: T | null | undefined) { ... }
```

---

## 실무 판단 기준 체크리스트

* [ ] 반환 타입은 “의도 고정”이 필요한가?
* [ ] 제네릭이 입력-출력 관계를 실제로 보존하는가?
* [ ] 제약(extends/keyof) 없이 내부에서 특정 속성을 쓰고 있지 않은가?
* [ ] Union으로 충분한 문제를 Generic으로 과설계하지 않았는가?
* [ ] Utility Types로 중복 모델을 제거했는가?

---

## 요약 5줄

1. 함수 타입 설계의 핵심은 “입력과 출력의 관계”를 타입으로 고정하는 것이다.
2. 반환 타입은 공개 계약에서만 명시하고, 나머지는 추론을 신뢰한다.
3. 제네릭은 재사용이 아니라 타입 정보 보존을 위해 존재한다.
4. 제약 없는 제네릭은 위험하며, extends/keyof로 오용을 차단해야 한다.
5. Utility Types는 타입 중복을 제거하는 실전 도구다.

---

## 자기점검 질문 5개

1. 내 프로젝트에서 반환 타입을 과도하게 명시한 함수는 없는가?
2. 제네릭이 실제로 타입 정보를 보존하고 있는가, 그냥 추상화인가?
3. 제약 없이 내부에서 특정 속성에 접근하는 제네릭 함수는 없는가?
4. Union으로 충분한 문제를 Generic으로 풀고 있지는 않은가?
5. DTO/폼/응답 모델이 불필요하게 복제돼 있지는 않은가?

---

## 실전 미션 3개

1. `any` 또는 `unknown`을 반환하는 함수 하나를 제네릭으로 리팩터링하라.
2. Union 반환 함수 하나를 오버로드로 바꿔 호출부 타입 정확성을 높여라.
3. 중복된 타입 모델 2개를 Pick/Omit/Partial로 통합하라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

