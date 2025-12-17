---
layout: post
title: "데이터 조작이 곧 설계다 — 배열과 객체를 다루는 사고법"
description: "배열·객체 조작이 설계 품질을 좌우한다는 관점에서 예측 가능한 데이터 흐름과 부작용 통제를 다룸"
categories: ["🧹 JavaScript & Clean Code"]
tags: [JavaScript, Arrays, Objects, Immutability]
image: /assets/posts/2025-12-17-clean-code-javascript/image.png
date: 2025-12-17 20:43:00 +09:00
last_modified_at: 2025-12-17 20:43:00 +09:00
---

---

### 1) 한 문단 요약 — 이 글이 줄여주는 유지보수 비용 3가지

이 글은 **데이터 흐름을 예측하기 어려워서 발생하는 변경 비용**, **부작용으로 인한 버그 추적 비용**, **읽히지 않는 데이터 조작 코드로 인한 리뷰 비용**을 줄이는 데 목적이 있다. 핵심 메시지는 단순하다. **배열·객체를 어떻게 다루느냐가 곧 코드베이스의 설계 품질**을 결정한다.

---

### 2) 배열/객체에서 실무 사고가 흔들리는 포인트 7개

1. **배열을 단순 리스트로 착각**
   → JS 배열은 객체다. 인덱스 접근 외에도 프로퍼티·참조·변형이 가능하다. 설계 없이 쓰면 예측이 깨진다.

2. **`length`를 신뢰하는 습관**
   → `length`는 “요소 개수”가 아니라 “마지막 인덱스 + 1”이다. 중간 삭제 시 의미가 달라진다.

3. **직접 인덱스 접근 남용**
   → `arr[0]`, `arr[arr.length - 1]`는 의도를 숨긴다. 의미가 이름으로 드러나지 않는다.

4. **유사 배열 객체를 배열처럼 취급**
   → `NodeList`, `arguments`는 배열이 아니다. 메서드 사용 시 런타임 에러 위험.

5. **불변성은 React 전용이라는 오해**
   → 불변성은 UI 문제가 아니라 **변경 추적과 디버깅 비용 문제**다.

6. **for문이 가장 명확하다는 착각**
   → 제어 흐름과 데이터 변환이 섞이면 읽기 비용이 급증한다.

7. **객체 직접 접근을 안전하다고 믿음**
   → 중첩 구조에서 직접 접근은 즉시 런타임 에러로 이어진다.

---

### 3) 불변성 — 왜 필요한가 (React에 종속되지 않는 이유)

불변성의 본질은 “변경을 금지”하는 것이 아니다.
**변경 지점을 명확히 드러내는 것**이다.

* 값이 바뀌면 **새로운 결과가 만들어진다**
* 이전 상태를 신뢰할 수 있다
* 변경 전/후 비교가 가능하다

```js
// Bad: 내부 상태 변경
user.age += 1;

// Better: 변경 결과를 새로 생성
const nextUser = { ...user, age: user.age + 1 };
```

이 패턴은 React 이전부터 **디버깅·테스트·롤백 비용**을 줄이기 위한 방법이었다.

---

### 4) 리팩터링 레시피

#### 4-1. for → map/filter/reduce로 바꾸는 기준

* **map**: 같은 길이의 변환 결과가 필요할 때
* **filter**: 조건에 따른 부분 집합이 필요할 때
* **reduce**: 누적/집계/구조 변환

```js
// 입력: users[]
// 출력: 활성 사용자 이름 배열

// Bad
const names = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].isActive) {
    names.push(users[i].name);
  }
}

// Better
const names = users
  .filter(user => user.isActive)
  .map(user => user.name);
```

#### 4-2. 체이닝을 읽히게 유지하는 규칙

* 체인은 **데이터 변환 파이프라인**이다
* 각 단계는 한 가지 역할만 가져야 한다
* 3단계 이상이면 줄바꿈 필수

```js
const result = orders
  .filter(order => order.paid)
  .map(order => order.amount)
  .reduce((sum, v) => sum + v, 0);
```

#### 4-3. map vs forEach 선택 규칙

* 반환값이 필요하면 **map**
* 부작용(side effect)이 목적이면 **forEach**
* 둘을 섞는 순간 설계가 무너진다

```js
// Bad
const result = arr.forEach(v => v * 2);

// Better
const result = arr.map(v => v * 2);
```

---

### 5) Lookup Table로 if/switch 제거 사례 3개

#### 사례 1. 상태별 메시지

```js
const STATUS_MESSAGE = {
  READY: '대기',
  LOADING: '로딩 중',
  ERROR: '오류',
};

const message = STATUS_MESSAGE[status] ?? '알 수 없음';
```

#### 사례 2. 권한별 처리 함수

```js
const HANDLERS = {
  ADMIN: handleAdmin,
  USER: handleUser,
};

HANDLERS[role]?.();
```

#### 사례 3. 타입별 렌더링

```js
const RENDERERS = {
  text: renderText,
  image: renderImage,
};
```

조건 분기 제거 = **확장에 강한 구조**.

---

### 6) 객체 안전성 — 올바른 사용

#### optional chaining

```js
const city = user?.profile?.address?.city;
```

→ 중첩 접근 시 런타임 에러 차단

#### destructuring

```js
const { id, name } = user;
```

→ 필요한 데이터만 명시적으로 사용

#### hasOwnProperty

```js
if (Object.prototype.hasOwnProperty.call(obj, key)) { ... }
```

→ 프로토타입 체인 오염 방지

#### Object.freeze

```js
const CONFIG = Object.freeze({
  API_URL: '...',
});
```

→ 설정 객체 보호 (얕은 freeze임을 인지할 것)

---

### 유사 배열 객체 처리 예시

```js
// NodeList → Array
const nodes = Array.from(document.querySelectorAll('.item'));
nodes.map(node => node.textContent);
```

---

### 프로토타입 조작이 위험한 실제 시나리오

```js
Array.prototype.last = function () {
  return this[this.length - 1];
};
```

**사고 시나리오**

* 외부 라이브러리가 `for...in`으로 배열 순회
* `last`가 예기치 않게 포함됨
* 런타임 버그 발생, 원인 추적 불가

**결론**: 프로토타입 조작은 전역 오염이다.

---

### 마무리 — 데이터 조작 10계명

1. 데이터 흐름이 코드 구조를 결정한다
2. 배열은 객체임을 항상 의식하라
3. 불변성은 선택이 아니라 기본값이다
4. 변환과 부작용을 분리하라
5. for문은 최후의 수단이다
6. 체이닝은 파이프라인처럼 작성하라
7. 조건 분기는 lookup table로 대체하라
8. 중첩 접근은 항상 방어하라
9. 전역 구조를 오염시키지 마라
10. 데이터 조작은 곧 설계다

---

- 참고: [  클린코드 자바스크립트(JavaScript)
](https://www.udemy.com/course/clean-code-js/)
