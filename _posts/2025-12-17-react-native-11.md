---
layout: post
title: "React Native 전환 로드맵 11. RN 관점 JS / React 리마스터"
description: "RN 관점에서 JS/React 기본기를 성능·안정성 중심으로 재정비하고 렌더링·입력·상태 문제를 줄이는 법"
categories: ["📱 React Native"]
tags: [ReactNative, React, Performance, Stability]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 21:02:00 +09:00
last_modified_at: 2025-12-17 21:02:00 +09:00
---

---

React Native에서 JS / React 지식은 “기본기”가 아니라  
**성능, 안정성, 디버깅 난이도를 직접 결정하는 핵심 요소**다.

웹에서는 운 좋게 넘어가던 코드가  
RN에서는 다음 형태로 바로 드러난다.

- 렌더링 지연
- 입력 버벅임
- 예측 불가한 상태 꼬임
- 기기에서만 재현되는 버그

이 글의 목적은 문법 복습이 아니다.  
**“왜 RN에서 이 개념이 더 치명적인가”를 연결하는 것**이다.

---

## RN에서 JS가 더 중요한 이유

웹 React:
- DOM이 완충 역할
- 브라우저 최적화 강함
- 약간의 비효율이 숨겨짐

React Native:
- JS → Native Bridge → UI
- 불필요한 연산 = 즉각 체감
- 상태/렌더링 실수 = UX 저하

👉 RN에서는 **JS 코드 품질이 곧 앱 품질**이다.

---

## 참조 타입 · 불변성 · 상태 버그

### 대표적인 상태 버그 사례

```ts
const [items, setItems] = useState([]);

items.push(newItem);
setItems(items);
```

**문제**

* 배열 참조 동일
* React는 변경을 감지 못함
* UI 업데이트 안 됨

---

### 올바른 패턴

```ts
setItems((prev) => [...prev, newItem]);
```

**핵심 원칙**

* 상태는 값이 아니라 **참조 변화**로 판단
* mutate = 버그 예약

---

### RN에서 더 위험한 이유

* 잘못된 상태 → 렌더링 누락
* 디버깅 난이도 급상승
* 기기/타이밍 따라 재현 달라짐

👉 **불변성 위반은 RN에서 바로 UX 문제로 연결된다**

---

## 비동기와 UI

### 로딩 · 에러 · 경쟁 상태(race)

### 기본적인 비동기 흐름

```ts
async function load() {
  setLoading(true);
  const data = await fetchData();
  setData(data);
  setLoading(false);
}
```

겉보기엔 문제 없어 보인다.
하지만 RN에서는 **경쟁 상태**가 자주 발생한다.

---

### 경쟁 상태 예시

* 화면 진입 → 요청 A
* 빠르게 화면 전환 → 요청 B
* A가 늦게 도착 → 최신 UI 덮어씀

**결과**

* 이전 화면 데이터가 갑자기 나타남
* “가끔 이상함” 버그 발생

---

### 방어 패턴 (개념)

* 요청 시작 시 ID 부여
* 언마운트 시 무시
* 최신 요청만 반영

```ts
let isActive = true;

useEffect(() => {
  load().then((data) => {
    if (isActive) setData(data);
  });
  return () => {
    isActive = false;
  };
}, []);
```

👉 RN에서는 **비동기 = 항상 취소 가능성 고려**

---

### 왜 RN에서 더 중요해지는가

* 네트워크 지연 체감 큼
* 화면 전환 잦음
* 모바일 환경은 항상 불안정

---

## 상태 업데이트와 렌더링 비용

RN에서 느려지는 앱의 대부분은
**“너무 많은 리렌더”** 때문이다.

### 흔한 실수 1: 상태 위치 과도하게 상위

```ts
<App>
  <BigState />
</App>
```

* 작은 변경에도 전체 리렌더

---

### 흔한 실수 2: 매 렌더마다 새 객체/함수

```ts
<Component onPress={() => doSomething()} />
```

* props 참조 매번 변경
* 자식 컴포넌트 불필요 리렌더

---

### 기본 최적화 사고

* 상태는 **가장 아래로**
* props는 **안정적으로**
* 리스트 아이템은 **순수 컴포넌트**

```ts
const onPress = useCallback(() => {
  doSomething();
}, []);
```

👉 RN에서는 렌더링 비용이 **즉시 체감된다**

---

## RN 실무 빈출 ES6+ Top 8

(왜 RN에서 더 중요한가)

### 1️⃣ 구조 분해 할당

```ts
const { width, height } = useWindowDimensions();
```

→ **UI 계산 가독성 + 실수 감소**

---

### 2️⃣ Spread 연산자

```ts
setItems((prev) => [...prev, item]);
```

→ **불변성 유지 핵심 도구**

---

### 3️⃣ Rest 파라미터

```ts
function update(...args) {}
```

→ **가변 인자 처리 깔끔**

---

### 4️⃣ Arrow Function

```ts
const handler = () => {}
```

→ **this 바인딩 문제 제거**

---

### 5️⃣ Array 메서드(map/filter)

```ts
items.filter(...)
```

→ **리스트 렌더링 기본**

---

### 6️⃣ Optional Chaining

```ts
user?.profile?.name
```

→ **네트워크/비동기 안전성**

---

### 7️⃣ Async / Await

```ts
await fetchData();
```

→ **비동기 흐름 가독성 = 버그 감소**

---

### 8️⃣ Module Import / Export

```ts
export function fetchData() {}
```

→ **레이어 분리의 기반**

---

## 이 파트의 결론

* RN에서 JS는 “보조 언어”가 아니다
* 참조/비동기/렌더링 실수는 즉시 UX 문제로 전환된다
* 문법을 아는 것보다 **왜 위험한지 아는 것**이 중요하다

이 시리즈의 모든 내용은 결국 하나로 수렴한다.

> **React Native는 문법 싸움이 아니라 구조 싸움이다.**

여기까지 왔다면,
당신은 “RN 강의를 들은 사람”이 아니라
**RN으로 설계할 수 있는 개발자**다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
