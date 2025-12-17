---
layout: post
title: "React Native 전환 로드맵 5. 상태 관리 의사결정 (Context vs Redux)"
description: "RN에서 상태 관리 선택을 구조 관점으로 다루고 Context/Redux 의사결정 기준과 설계 지침을 제시"
categories: ["📱 React Native"]
tags: [ReactNative, StateManagement, Redux, Context]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:56:00 +09:00
last_modified_at: 2025-12-17 20:56:00 +09:00
---

---

상태 관리는 **기능 구현 문제가 아니라 구조 설계 문제**다.  
RN에서 상태 관리를 잘못 선택하면 다음 현상이 빠르게 나타난다.

- 화면이 늘어날수록 수정 비용 폭증
- 내비게이션과 상태가 뒤엉킴
- “이 상태가 왜 여기 있는지” 설명 불가

이 글의 목표는 하나다.

> **“지금 이 앱에 필요한 최소한의 상태 관리 도구를 고르는 기준”**

---

## 상태를 먼저 분류하라

도구를 고르기 전에 **상태부터 분류**해야 한다.  
RN에서 상태는 크게 세 종류다.

### 1️⃣ UI 상태
- 모달 열림 여부
- 로딩 스피너
- 입력값, 포커스

**특징**
- 화면 단위
- 수명 짧음
- 다른 화면과 거의 공유 안 함

→ `useState`, 로컬 상태로 충분

---

### 2️⃣ 도메인 상태
- 로그인 여부
- 즐겨찾기 목록
- 장바구니

**특징**
- 여러 화면에서 공유
- 앱의 “의미”를 담음
- 비교적 오래 유지

→ Context 또는 Redux 후보

---

### 3️⃣ 서버 캐시 상태
- API 응답 데이터
- 리스트, 상세 데이터

**특징**
- 비동기
- 로딩/에러/동기화 이슈
- 갱신 정책 필요

→ Redux 가능, 하지만 전용 라이브러리 고려 대상

---

**핵심 원칙**
> 상태 관리 도구는 “상태 종류”가 아니라  
> **“공유 범위 + 변경 빈도”로 결정한다**

---

## Context API: 장점 · 한계 · 적용 범위

### Context가 강력한 이유

- React 기본 기능
- 설정 비용 거의 없음
- 소규모 전역 상태에 최적

```tsx
const AuthContext = createContext();
```

### Context로 충분한 경우

다음 조건을 **모두 만족**하면 Context가 정답이다.

* 전역 상태 개수 적음 (1~3개)
* 변경 빈도 낮음
* 액션 종류 단순
* 디버깅 복잡도 낮아도 문제 없음

**대표 예**

* 인증 상태
* 다크모드
* 언어 설정

---

### Context가 위험해지는 신호

아래 신호가 보이면 경고다.

* Provider가 중첩되기 시작
* Context 안에서 상태가 5개 이상
* 업데이트 로직이 복잡해짐
* 어디서 상태가 바뀌는지 추적 어려움

👉 이 시점에 Redux를 검토해야 한다.

---

## Redux Toolkit: 필요한 순간과 이점

Redux Toolkit(RTK)은
“Redux의 단점만 제거한 표준 구현”에 가깝다.

### 왜 RTK가 효율적인가

#### 1️⃣ Slice 기반 구조

```ts
const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    addFavorite,
    removeFavorite,
  },
});
```

* 상태 + 액션 + 리듀서를 한 파일에서 관리
* 응집도 높음

---

#### 2️⃣ 불변성 관리 자동화

* `immer` 내장
* 실수로 state mutate할 확률 급감

---

#### 3️⃣ 디버깅 용이성

* 액션 단위로 상태 변화 추적
* “언제, 왜 바뀌었는지” 명확

---

### Redux가 필요한 시점 요약

* 전역 상태 많음
* 액션 종류 증가
* 여러 화면에서 빈번히 변경
* 테스트/예측 가능성 중요

👉 **“조금 복잡해졌다”가 아니라 “계속 커질 게 확실하다”면 Redux**

---

## 표준 구현 패턴 (읽기 / 업데이트)

### Context 패턴

```tsx
const ctx = useContext(AuthContext);

ctx.login();
ctx.logout();
```

**원칙**

* Provider는 앱 루트 근처
* 상태 변경 함수는 명시적 이름

---

### Redux 패턴

```tsx
const favorites = useSelector(selectFavorites);
const dispatch = useDispatch();

dispatch(addFavorite(item));
```

**원칙**

* 컴포넌트는 “읽기/요청”만
* 로직은 slice에 집중

---

## 미니 예제: 즐겨찾기 전역 상태

### 상태 성격

* 여러 화면에서 공유
* 빈번한 추가/삭제
* 목록 기반

→ Redux Toolkit이 적합

---

### Slice 예시

```ts
const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: [],
  reducers: {
    add(state, action) {
      state.push(action.payload);
    },
    remove(state, action) {
      return state.filter(
        (item) => item.id !== action.payload
      );
    },
  },
});
```

### 컴포넌트 사용

```tsx
const favorites = useSelector(selectFavorites);
const dispatch = useDispatch();

function toggle(item) {
  dispatch(add(item));
}
```

**포인트**

* 컴포넌트는 상태 구조를 몰라도 된다
* 액션 이름이 곧 문서

---

## 이 파트의 결론

* 상태 관리는 “기술 선택”이 아니라 **규모 예측**
* Context는 나쁜 선택이 아니라 **제한 있는 선택**
* Redux는 무겁지만 **예측 가능성**을 준다

가장 위험한 선택은
**“아직 모르겠으니까 일단 Redux”**다.

다음 단계에서는
이 상태들이 **내비게이션 구조와 어떻게 결합되는지**를 다룬다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
