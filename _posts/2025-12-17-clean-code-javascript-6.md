---
layout: post
title: "프론트엔드 실무 품질 — 동작하는 코드 이후의 기준"
description: "DOM 결합도, 에러 전달, 접근성, 이벤트 설계, 스타일 가이드 등 동작 이후 품질을 결정하는 프론트엔드 기준"
categories: ["🧹 JavaScript & Clean Code"]
tags: [JavaScript, Frontend, Accessibility, Errors]
image: /assets/posts/2025-12-17-clean-code-javascript/image.png
date: 2025-12-17 20:45:00 +09:00
last_modified_at: 2025-12-17 20:45:00 +09:00
---

---

### 1) 한 문단 요약 — 실무에서 품질이 갈리는 지점 5가지

프론트엔드 품질은 **DOM 결합도**, **에러를 사용자에게 전달하는 방식**, **시맨틱/접근성 기본기**, **이벤트 설계의 투명성**, **스타일 가이드의 일관성**에서 갈린다. 이 다섯 가지는 기능이 정상 동작한 이후에야 드러나며, **유지보수 비용과 팀 생산성을 직접적으로 좌우**한다.

---

### 2) DOM 추상화가 필요한 이유

*(결합도 / 테스트 / 변경 비용 관점)*

DOM을 직접 다루는 코드는 빠르게 작성할 수 있지만, **가장 빨리 부서진다**.

#### 문제의 본질

* DOM 구조 변경 = 로직 수정
* 테스트 시 DOM 환경 의존
* 재사용 불가

#### 직접 접근 (Bad)

```js
document.querySelector('#submit').addEventListener('click', () => {
  document.querySelector('.result').textContent = '완료';
});
```

#### 추상화 레이어 (Better) — 예시 1

```js
function getSubmitButton() {
  return document.querySelector('#submit');
}

function renderResult(text) {
  const result = document.querySelector('.result');
  result.textContent = text;
}

getSubmitButton().addEventListener('click', () => {
  renderResult('완료');
});
```

**효과**

* DOM 변경 시 영향 범위 국소화
* 테스트 시 함수 단위로 대체 가능

#### 추상화 레이어 (Better) — 예시 2

```js
const UI = {
  submitButton: () => document.querySelector('#submit'),
  result: () => document.querySelector('.result'),
};

UI.submitButton().addEventListener('click', () => {
  UI.result().textContent = '완료';
});
```

---

### 3) 유효성 검사와 에러 처리

*(try-catch = 사용자 커뮤니케이션)*

#### 핵심 관점

* try-catch는 “에러를 잡는 기술”이 아니라 **사용자에게 무엇을 알려줄지 결정하는 설계 도구**다.

#### 사용자에게 알려야 할 실패

* 입력 오류
* 권한 없음
* 네트워크 실패(재시도 가능)

#### 내부적으로 삼켜야 할 실패

* 로깅 실패
* 비필수 UI 업데이트 실패
* 폴백이 가능한 오류

#### Bad: 에러를 숨김

```js
try {
  submitForm();
} catch (e) {}
```

#### Better: 커뮤니케이션 설계

```js
try {
  submitForm();
} catch (e) {
  showToast('요청 처리 중 오류가 발생했습니다.');
  logError(e);
}
```

**원칙**

* 사용자는 “왜 안 되는지”를 알아야 한다
* 개발자는 “어디서 깨졌는지”를 알아야 한다

---

### 4) HTML 시맨틱 / 접근성 최소 기준

시맨틱은 장식이 아니라 **의미 계약**이다.

#### 최소 기준

* `div`로 버튼을 만들지 않는다
* 클릭 가능한 요소는 키보드 접근 가능해야 한다
* 문서 구조는 heading(h1~h6)으로 표현

```html
<!-- Bad -->
<div onclick="submit()">제출</div>

<!-- Better -->
<button type="button">제출</button>
```

**효과**

* 접근성
* 테스트 자동화 용이
* SEO/유지보수성 개선

---

### 5) innerHTML의 위험 — XSS + 유지보수

#### Bad

```js
container.innerHTML = `<p>${userInput}</p>`;
```

**위험**

* XSS 공격 가능
* 문자열 기반 템플릿은 구조 변경에 취약

#### Better

```js
const p = document.createElement('p');
p.textContent = userInput;
container.appendChild(p);
```

**원칙**

* 사용자 입력은 항상 textContent
* 구조는 코드로 표현

---

### 6) 이벤트 리스너 설계 — Black Box를 피하라

#### 문제: 블랙박스 이벤트

```js
button.addEventListener('click', () => {
  // 로직이 내부에 숨겨짐
});
```

#### 개선: 핸들러 분리

```js
function handleSubmitClick(event) {
  validate();
  submit();
}

button.addEventListener('click', handleSubmitClick);
```

#### 이벤트 위임 예시

```js
list.addEventListener('click', (e) => {
  if (e.target.matches('[data-action="delete"]')) {
    deleteItem(e.target.dataset.id);
  }
});
```

**효과**

* 이벤트 흐름 가시화
* 동적 요소 대응
* 테스트 용이

---

### 7) 스타일 가이드의 목적 — 팀 비용 절감

스타일 가이드는 취향이 아니다.

#### 스타일 가이드의 역할

* 코드 해석 시간 감소
* 리뷰 논쟁 제거
* 신규 인력 온보딩 비용 절감

#### 포함돼야 할 최소 항목

* 네이밍 규칙
* indent depth 제한
* 공백/줄바꿈 규칙
* DOM 접근 규칙
* 에러 처리 규칙

**중요**

* “왜 이 규칙이 있는가”가 문서화돼야 한다

---

### 마무리 — 프론트엔드 PR 품질 체크리스트 20개

1. DOM 직접 접근이 분리돼 있는가
2. DOM 변경 시 영향 범위가 명확한가
3. 이벤트 핸들러가 분리돼 있는가
4. 이벤트 위임이 필요한가
5. 사용자 입력을 innerHTML에 넣지 않았는가
6. 에러를 사용자에게 적절히 알리는가
7. 에러 로깅이 존재하는가
8. 시맨틱 요소를 사용했는가
9. 키보드 접근이 가능한가
10. NodeList를 배열처럼 오용하지 않았는가
11. data-attribute가 의미를 담고 있는가
12. 네이밍이 역할을 설명하는가
13. indent depth가 과도하지 않은가
14. 공백 규칙이 일관적인가
15. 스타일 가이드 위반이 없는가
16. DOM 테스트가 가능한 구조인가
17. 변경 시 UI 영향이 예측 가능한가
18. 블랙박스 로직이 없는가
19. 신규 인원이 이해할 수 있는가
20. “왜 이렇게 했는지” 설명 가능한가

---

### 팀 합의가 필요한 항목 10개

1. DOM 접근 추상화 기준
2. 네이밍 컨벤션
3. indent depth 허용 범위
4. innerHTML 사용 기준
5. 에러 UX 정책
6. 사용자 메시지 문구 규칙
7. data-attribute 네이밍 규칙
8. 이벤트 위임 사용 기준
9. 시맨틱/접근성 최소 기준
10. 스타일 가이드 변경 절차

---

- 참고: [  클린코드 자바스크립트(JavaScript)
](https://www.udemy.com/course/clean-code-js/)
