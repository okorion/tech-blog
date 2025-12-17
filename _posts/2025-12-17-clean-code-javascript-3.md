---
layout: post
title: "조건문을 읽히게 만드는 리팩터링 — 논리 흐름 설계 매뉴얼"
description: "조건문 오독을 줄이고 분기 설계를 명확히 하는 리팩터링 기준과 읽히는 논리 흐름을 만드는 방법"
categories: ["🧹 JavaScript & Clean Code"]
tags: [JavaScript, Conditionals, Refactoring, Readability]
image: /assets/posts/2025-12-17-clean-code-javascript/image.png
date: 2025-12-17 20:42:00 +09:00
last_modified_at: 2025-12-17 20:42:00 +09:00
---

---

### 1) 한 문단 요약 — 조건문이 읽히면 얻는 실무 효과 3가지

조건문이 읽히면 **로직 오해로 인한 버그가 줄어들고**, **리뷰 시간이 단축되며**, **요구사항 변경 시 영향 범위를 즉시 파악**할 수 있다. 이 글은 조건문을 “짧게 쓰는 기술”이 아니라 **오독을 방지하는 구조 설계 문제**로 다룬다. 목표는 논리 흐름을 코드로 재현하는 능력이다.

---

### 2) 조건문 품질을 정하는 3가지 기준

#### 1. 오독 가능성

* 한 번에 이해되지 않으면 실패한 조건문이다.
* 특히 **부정 조건**, **암묵적 truthy/falsy**, **중첩 분기**는 오독 확률을 폭증시킨다.

#### 2. 분기 수

* 분기가 많을수록 테스트 케이스가 기하급수적으로 늘어난다.
* 분기를 줄이는 핵심은 *else 제거*와 *조기 반환*이다.

#### 3. 에러 표면적

* “실수할 수 있는 면적”이 넓을수록 위험하다.
* 조건식이 복잡할수록, 잘못 고쳐도 눈치채기 어렵다.

---

### 3) 리팩터링 패턴 10개

#### 패턴 1. min / max 의도를 드러내라

**문제**: 숫자 비교 의도가 숨겨짐
**Bad**

```js
if (value < 10) value = 10;
```

**Better**

```js
value = Math.max(value, 10);
```

**쓰면 안 되는 경우**: 조건에 부수 로직이 포함될 때

---

#### 패턴 2. begin / end 경계 명시

**Bad**

```js
if (page >= 1 && page <= total) { ... }
```

**Better**

```js
const isValidPage = page >= START_PAGE && page <= END_PAGE;
if (isValidPage) { ... }
```

**금지 상황**: 값이 자주 변하지 않는 단순 상수일 때 과도한 추출

---

#### 패턴 3. first / last 의미를 이름으로 표현

**Bad**

```js
if (index === 0) { ... }
```

**Better**

```js
const isFirstItem = index === 0;
if (isFirstItem) { ... }
```

**주의**: 단발성 계산에 과도한 변수 생성 금지

---

#### 패턴 4. prefix / suffix로 조건 그룹화

**Bad**

```js
if (isAdmin && isActive && !isBanned) { ... }
```

**Better**

```js
const canAccess = isAdmin && isActive && !isBanned;
if (canAccess) { ... }
```

**금지**: 이름이 조건을 설명하지 못할 때

---

#### 패턴 5. 매개변수 순서는 경계다

**Bad**

```js
checkPermission(userId, role, true);
```

**Better**

```js
checkPermission({ userId, role, isActive: true });
```

**언제 쓰지 말까**: 성능이 극도로 중요한 내부 루프

---

#### 패턴 6. 값식문으로 조건 분리

**Bad**

```js
if (response && response.data && response.data.user) { ... }
```

**Better**

```js
const user = response?.data?.user;
if (!user) return;
```

**주의**: 값식문이 또 다른 중첩을 만들면 실패

---

#### 패턴 7. 삼항 연산자 사용 기준

**허용**

```js
const label = isAdmin ? 'ADMIN' : 'USER';
```

**금지**

```js
const result = a ? b ? c : d : e;
```

**기준**: 한 줄, 중첩 없음, 반환값만 존재

---

#### 패턴 8. truthy / falsy 명시화

**Bad**

```js
if (input) { ... }
```

**Better**

```js
if (input !== '') { ... }
```

**주의**: falsy 값(0, '')이 의미를 가질 때

---

#### 패턴 9. else / else if 제거

**Bad**

```js
if (error) {
  handleError();
} else {
  handleSuccess();
}
```

**Better**

```js
if (error) {
  handleError();
  return;
}
handleSuccess();
```

**금지**: 두 분기가 모두 중요한 후처리를 공유할 때

---

#### 패턴 10. default case를 반드시 고려

**Bad**

```js
switch (status) {
  case 'READY': ...
}
```

**Better**

```js
default:
  throw new Error('Unhandled status');
```

**이유**: 신규 상태 추가 시 침묵 버그 방지

---

### 4) 부정 조건이 위험한 이유 + 드모르간

부정 조건은 **이중 해석 비용**을 만든다.

```js
// Bad
if (!isNotAuthorized) { ... }
```

```js
// Better (드모르간)
if (isAuthorized) { ... }
```

드모르간 적용:

```js
!(a && b) → !a || !b
```

부정이 중첩될수록, 인간은 실수한다.

---

### 5) 단축평가 vs Nullish Coalescing — 의미 보존 관점

```js
// 단축평가
const name = input || 'default';
```

→ `''`, `0`도 default 처리됨

```js
// 널 병합
const name = input ?? 'default';
```

→ `null`, `undefined`만 대체

**기준**: falsy가 의미를 가지면 `??`, 아니면 `||`

---

### 6) 함수 경계 설계 — early return & guard clause

**Bad**

```js
function routeGuard(user) {
  if (user) {
    if (user.isActive) {
      if (user.role === 'ADMIN') {
        return true;
      }
    }
  }
  return false;
}
```

**Better**

```js
function routeGuard(user) {
  if (!user) return false;
  if (!user.isActive) return false;
  if (user.role !== 'ADMIN') return false;
  return true;
}
```

효과:

* 분기 감소
* 실패 경로 명시
* 읽는 순서 = 실행 순서

---

### 마무리 — PR 체크리스트 (조건문 전용) 12개

1. 조건의 의도가 이름으로 드러나는가
2. 부정 조건을 제거할 수 있는가
3. 중첩을 early return으로 풀 수 있는가
4. 삼항이 중첩되어 있지 않은가
5. falsy 값이 의미를 가지는가
6. default case가 존재하는가
7. 조건식 길이가 한 줄을 넘지 않는가
8. 실행 순서와 읽는 순서가 같은가
9. 조건 변경 시 영향 범위가 명확한가
10. 테스트 케이스를 즉시 떠올릴 수 있는가
11. 조건을 함수로 추출할 가치가 있는가
12. 처음 보는 사람이 오해할 여지가 있는가

---

- 참고: [  클린코드 자바스크립트(JavaScript)
](https://www.udemy.com/course/clean-code-js/)
