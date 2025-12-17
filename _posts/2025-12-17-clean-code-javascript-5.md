---
layout: post
title: "함수 설계가 곧 유지보수성이다 — 함수 중심 사고 정렬"
description: "입력·출력·부작용을 계약으로 다루며 함수 설계 기준을 세워 유지보수성과 테스트 용이성을 높이는 방법"
categories: ["🧹 JavaScript & Clean Code"]
tags: [JavaScript, Functions, "API Design", SideEffects]
image: /assets/posts/2025-12-17-clean-code-javascript/image.png
date: 2025-12-17 20:44:00 +09:00
last_modified_at: 2025-12-17 20:44:00 +09:00
---

---

### 1) 한 문단 요약 — 함수 설계가 망가질 때 생기는 장애 5가지

함수 설계가 무너지면 **변경 영향 범위를 예측할 수 없고**, **테스트가 어려워지며**, **에러 처리가 분산되고**, **재사용이 불가능해지며**, **리뷰가 해석 작업으로 전락**한다. 이 글은 함수를 “문법 단위”가 아니라 **계약(contract)을 가진 설계 단위**로 다루는 기준을 제시한다.

---

### 2) 함수의 3요소: 입력 / 출력 / 부작용

함수는 반드시 이 3가지를 동시에 고려해야 한다.

1. **입력(Input)**: 어떤 값을 받는가, 어떤 전제를 기대하는가
2. **출력(Output)**: 무엇을 반환하는가, 언제 반환하지 않는가
3. **부작용(Side Effect)**: 외부 상태를 바꾸는가

이 중 **하나라도 불명확하면 유지보수 비용이 증가**한다.

```js
// 나쁜 예: 입력/출력/부작용이 섞여 있다
function updateUser(user, age) {
  user.age = age;
  save(user);
}
```

```js
// 개선: 역할 분리
function withUpdatedAge(user, age) {
  return { ...user, age };
}
```

---

### 3) 인자 설계 원칙

#### 3-1. 인자 개수는 위험 지표다

* 인자 1~2개: 안전
* 인자 3개: 경계
* 인자 4개 이상: 구조적 문제 가능성 높음

##### 리팩터링 예시 ① (객체 인자)

**Bad**

```js
createUser(id, name, age, isAdmin);
```

**Better**

```js
createUser({ id, name, age, isAdmin });
```

효과:

* 순서 의존 제거
* 선택적 인자 확장 가능

##### 리팩터링 예시 ② (옵션 패턴)

**Bad**

```js
fetchData(url, method, timeout, retry);
```

**Better**

```js
fetchData(url, { method = 'GET', timeout = 3000, retry = false });
```

---

#### 3-2. 매개변수 순서가 왜 경계인가

```js
// Bad: 순서 실수는 컴파일 타임에 잡히지 않는다
setPosition(x, y, z);
```

```js
// Better: 의미를 구조로 고정
setPosition({ x, y, z });
```

순서 기반 API는 **실수해도 조용히 실패**한다. 이게 가장 위험하다.

---

### 4) return 설계 원칙 — 계약(contract) 관점

#### void vs return은 스타일 문제가 아니다

* `return value` → **계산 결과를 제공하는 계약**
* `return void` → **행위만 수행하는 계약**

```js
// 계약 불명확
function saveUser(user) {
  if (!user) return;
  db.save(user);
}
```

```js
// 계약 명확
function saveUser(user) {
  if (!user) throw new Error('Invalid user');
  return db.save(user);
}
```

**원칙**

* 성공/실패 여부가 중요하면 반환하라
* 실패를 숨기지 마라

---

### 5) callback / 순수 함수 / closure — 테스트 가능성 & 변경 비용

#### 순수 함수 (Pure Function)

```js
function add(a, b) {
  return a + b;
}
```

* 테스트 비용 ↓
* 변경 영향 ↓
* 가장 낮은 유지보수 비용

#### callback

```js
fetchData(url, onSuccess, onError);
```

* 제어 흐름이 외부로 이동
* 중첩되면 가독성 급감
* **에러 계약**을 명확히 해야 함

#### closure 활용 예시

```js
function createCounter() {
  let count = 0;
  return () => ++count;
}
```

**장점**

* 상태 은닉
* 외부 오염 차단

**단점**

* 상태 추적 어려움
* 메모리 생명주기 관리 필요

**대안**

* 명시적 상태 객체 전달

```js
function increment(state) {
  return { count: state.count + 1 };
}
```

---

### 6) Magic Number 제거 전략 5가지

1. **의미 있는 상수**

```js
const MAX_RETRY = 3;
```

2. **열거형 구조**

```js
const STATUS = { READY: 1, DONE: 2 };
```

3. **설정 객체로 분리**

```js
const config = { retryLimit: 3 };
```

4. **함수로 의미 캡슐화**

```js
function isAdult(age) {
  return age >= 19;
}
```

5. **데이터 중심 설계**

* 숫자를 쓰지 말고 **조건의 의미를 옮겨라**

---

### 7) 화살표 함수 주의점 (this / 스코프)

* 화살표 함수는 **자신의 this를 갖지 않는다**
* 메서드로 사용 시 위험

```js
// Bad
const user = {
  name: 'A',
  greet: () => this.name,
};
```

```js
// Better
const user = {
  name: 'A',
  greet() {
    return this.name;
  },
};
```

---

### 마무리 — 함수 리뷰 체크리스트 15개

**입력**

1. 인자 개수가 과도한가
2. 순서 의존적인가
3. 기본값이 명시적인가

**출력**
4. 반환값 계약이 명확한가
5. 실패를 숨기지 않는가
6. void가 의도적인가

**부작용**
7. 외부 상태를 변경하는가
8. 변경 지점이 명확한가

**구조**
9. 하나의 책임만 가지는가
10. 테스트 가능한가

**네이밍**
11. 동사/의도가 드러나는가

**에러 처리**
12. 예외 계약이 있는가

**유지보수**
13. 인자 추가가 쉬운가
14. 변경 영향이 국소적인가
15. 6개월 뒤에도 이해 가능한가

---

- 참고: [  클린코드 자바스크립트(JavaScript)
](https://www.udemy.com/course/clean-code-js/)
