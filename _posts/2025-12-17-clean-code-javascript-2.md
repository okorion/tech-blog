---
layout: post
title: "JavaScript 안전 운전 매뉴얼 — 언어 함정으로 실무 버그 줄이기"
description: "스코프, 호이스팅, 전역 오염, 암묵적 형변환 등 JS 언어 함정으로 생기는 버그를 줄이는 체크리스트"
categories: ["🧹 JavaScript & Clean Code"]
tags: [JavaScript, Bugs, "Language Gotchas", Hoisting]
image: /assets/posts/2025-12-17-clean-code-javascript/image.png
date: 2025-12-17 20:41:00 +09:00
last_modified_at: 2025-12-17 20:41:00 +09:00
---

---

### 1) 한 문단 요약 — 이 글이 막아주는 버그 유형 5개

이 글은 **스코프 착각**, **호이스팅 오해**, **전역 오염**, **암묵적 형변환**, **NaN/undefined/null 처리 실수**로 발생하는 실무 버그를 줄이기 위한 매뉴얼이다.
각 항목을 *함정 → 증상 → 원인 → 해결 패턴*으로 반복 학습하도록 구성했으며, PR 전에 바로 점검 가능한 규칙과 체크리스트를 제공한다.

---

### 2) 위험지도 — 빈도 높은 함정 TOP 8

| 함정                  | 실무 증상             | 원인                     | 권장 패턴             | 금지 패턴          |
| --------------------- | --------------------- | ------------------------ | --------------------- | ------------------ |
| `var` 사용            | 값이 예기치 않게 바뀜 | 함수 스코프 + 호이스팅   | `let` / `const`       | `var`              |
| 암묵적 호이스팅       | undefined 접근 에러   | 선언/할당 분리           | 선언-사용 거리 최소화 | 선언 위치 무시     |
| 전역 변수             | 다른 모듈에서 충돌    | 글로벌 네임스페이스 공유 | 모듈 스코프           | `window` 직접 할당 |
| 임시변수 남용         | 로직 추적 어려움      | 상태 분산                | 표현식/함수 추출      | 중간 상태 누적     |
| `==` 비교             | 조건 분기 오류        | 강제 형변환              | `===`                 | `==`               |
| `undefined/null` 혼용 | 예외 처리 누락        | 의미 구분 없음           | 계약 기반 명시        | 혼용 체크          |
| 숫자 형변환           | NaN 전파              | 입력 검증 부재           | Number + 검증         | 암묵 변환          |
| `isNaN` 오용          | NaN 아닌 값 통과      | 전역 isNaN의 변환        | `Number.isNaN`        | `isNaN`            |

---

### 3) 핵심 주제별 상세 설명

#### A. `var` vs `let/const` (호이스팅 + 스코프)

**Bad**

```js
console.log(count); // undefined
var count = 10;
```

**런타임 원인**
`var`는 선언이 함수 스코프 상단으로 끌어올려지고(undefined로 초기화), 할당은 그대로 남는다.

**Better**

```js
console.log(count); // ReferenceError
const count = 10;
```

**이유**
TDZ(Temporal Dead Zone)로 인해 잘못된 접근을 즉시 실패시킨다. 버그를 조기에 노출한다.

---

#### B. 스코프와 전역 오염의 실제 사례

**Bad**

```js
function init() {
  config = { mode: 'prod' }; // 암묵적 전역
}
```

**런타임 원인**
선언 키워드 누락 → 전역 객체에 바인딩 → 다른 코드와 충돌.

**Better**

```js
function init() {
  const config = { mode: 'prod' };
}
```

**원칙**
전역은 공유 메모리다. 공유 메모리는 충돌을 낳는다.

---

#### C. 임시변수 제거가 버그를 줄이는 이유

**Bad**

```js
let result;
if (isValid) {
  result = price * tax;
}
return result;
```

**런타임 위험**
분기 누락 시 `undefined` 반환.

**Better**

```js
if (!isValid) return 0;
return price * tax;
```

**이유**
상태를 저장하지 않고 즉시 계산하면, 누락 가능한 경로가 사라진다.

---

#### D. 타입 검사와 비교 (`==` / `===`, `undefined` / `null`)

**Bad**

```js
if (value == null) { ... }
```

**런타임 원인**
`null == undefined`는 `true`. 의도가 숨겨진다.

**Better**

```js
if (value === null) { ... }
// 또는
if (value === undefined) { ... }
```

**원칙**
`undefined`는 “없음”, `null`은 “의도적 비어 있음”. 계약을 구분하라.

---

#### E. 형변환, NaN, `isNaN`

**Bad**

```js
if (isNaN(value)) { ... }
```

**런타임 원인**
`isNaN`은 내부적으로 Number 변환을 수행한다.

```js
isNaN('foo') // true
```

**Better**

```js
if (Number.isNaN(value)) { ... }
```

**추가 패턴**

```js
const num = Number(input);
if (Number.isNaN(num)) throw new Error('Invalid number');
```

---

### 4) 안전 규칙 12개

1. `var`를 사용하지 마라
2. 선언과 사용 거리를 최소화하라
3. 전역에 쓰지 마라
4. 임시변수를 의심하라
5. 비교는 항상 `===`
6. `undefined`와 `null`을 구분하라
7. 암묵적 형변환에 기대지 마라
8. 숫자는 변환 후 검증하라
9. `isNaN` 대신 `Number.isNaN`
10. 실패 경로를 먼저 처리하라
11. 런타임 실패를 숨기지 마라
12. 읽히지 않는 코드는 위험 코드다

---

### 5) 미니 퀴즈 6문제

**Q1**

```js
console.log(a);
let a = 1;
```

**예측**: ?
**해설**: TDZ → ReferenceError

**Q2**

```js
console.log(b);
var b = 1;
```

**해설**: undefined (호이스팅)

**Q3**

```js
0 == false
```

**해설**: true (형변환)

**Q4**

```js
Number.isNaN('foo')
```

**해설**: false (변환 없음)

**Q5**

```js
isNaN('foo')
```

**해설**: true (암묵 변환)

**Q6**

```js
let x;
x === null
```

**해설**: false (`undefined`)

---

### 마무리 — PR 전 실무 체크리스트 15개

1. `var`가 있는가
2. 선언 키워드 누락이 있는가
3. 전역 접근이 있는가
4. 임시변수가 상태를 들고 있는가
5. 조건 분기에 `==`가 있는가
6. 타입 의도가 드러나는가
7. `undefined/null`을 혼용했는가
8. 숫자 입력 검증이 있는가
9. NaN 전파 가능성이 있는가
10. 실패 경로가 명시적인가
11. 런타임 에러를 숨겼는가
12. 스코프 경계가 명확한가
13. 코드 순서가 실행 순서와 일치하는가
14. 읽지 않고도 예측 가능한가
15. “왜 이렇게 했는지” 설명 가능한가

---

- 참고: [  클린코드 자바스크립트(JavaScript)
](https://www.udemy.com/course/clean-code-js/)
