---
layout: post
title: "React Native 전환 로드맵 6. React Navigation 설계"
description: "React Navigation을 앱 아키텍처 요소로 보고 스택/탭 구조와 상태 연계를 설계하는 방법"
categories: ["📱 React Native"]
tags: [ReactNative, Navigation, Architecture]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:57:00 +09:00
last_modified_at: 2025-12-17 20:57:00 +09:00
---

---

내비게이션은 “화면 이동 라이브러리”가 아니다.  
React Native에서 내비게이션은 **앱 전체 구조를 고정시키는 아키텍처 요소**다.

이 파트를 대충 넘기면 반드시 다음 문제가 발생한다.

- 화면이 늘어날수록 이동 로직이 꼬인다
- 상태 관리와 내비게이션이 서로 침범한다
- “이 화면은 어디서 오는가?”를 설명 못 한다

목표는 명확하다.

> **확장해도 무너지지 않는 화면 구조를 처음부터 잡는 것**

---

## 내비게이션을 아키텍처로 보는 이유

웹에서의 내비게이션은 보통 URL 중심이다.  
React Native는 다르다.

### 웹 (React Router 기준)
- URL = 상태
- 새로고침 가능
- 브라우저 히스토리 기반

### React Native
- URL 없음
- 화면 스택 = 상태
- 앱 생명주기와 강하게 결합

즉, RN에서 내비게이션은 단순 이동이 아니라  
**“현재 앱이 어떤 상태에 있는가”를 나타내는 구조**다.

그래서 내비게이션은:
- 전역 상태와 맞닿아 있고
- 인증 여부와 연결되며
- UX 흐름 전체를 결정한다

👉 설계 없이 추가하면 반드시 망가진다.

---

## Stack / Tab / Drawer 선택 기준

### Stack Navigator

**적합한 UX**
- 화면 → 상세 → 서브 화면
- 순차적 흐름
- 뒤로 가기 개념이 명확한 경우

**특징**
- 화면이 쌓인다 (LIFO)
- 대부분의 앱에서 기본 뼈대

**대표 사용처**
- 인증 플로우
- 상세 화면 진입

---

### Tab Navigator

**적합한 UX**
- 주요 기능 간 빠른 전환
- 화면 간 위계 없음

**특징**
- 항상 보이는 글로벌 이동 수단
- 상태 유지에 유리

**대표 사용처**
- 홈 / 검색 / 프로필
- 메인 기능 전환

---

### Drawer Navigator

**적합한 UX**
- 보조 기능 모음
- 설정, 히스토리 등

**특징**
- 발견성 낮음
- 주요 흐름에는 부적합

**대표 사용처**
- 설정
- 계정 관리
- 로그아웃

---

### 현실적인 조합 패턴

- **Root: Stack**
  - Auth / Main 분기
- **Main: Tab**
  - 주요 기능
- **부가 기능: Drawer 또는 내부 Stack**

이 패턴을 벗어나면 설계 이유를 명확히 설명할 수 있어야 한다.

---

## 중첩 내비게이션 설계 규칙 (지옥 방지)

중첩은 피할 수 없다.  
문제는 **기준 없이 중첩할 때**다.

### 규칙 1. 역할이 다른 Navigator만 중첩

- Stack 안에 Stack ❌
- Tab 안에 Tab ❌
- Stack + Tab ⭕
- Stack + Drawer ⭕

---

### 규칙 2. “최상위 목적”은 하나만

- Root Navigator는 **앱의 상태**를 표현
  - 로그인됨 / 안 됨
- 하위 Navigator는 **UX 흐름**만 표현

---

### 규칙 3. 화면은 Navigator 구조를 몰라야 한다

```tsx
navigation.navigate('Detail');
```

* 상위 구조를 가정하는 코드는 설계 실패
* 화면은 “목적지 이름”만 알아야 한다

---

### 흔한 실패 패턴

* 화면마다 다른 navigate 경로
* params 전달이 중첩 깊이에 의존
* header 옵션이 여기저기 흩어짐

👉 중첩이 복잡해질수록 **구조를 단순화해야 한다**

---

## 데이터 전달 (route params) 패턴

### 기본 패턴

```tsx
navigation.navigate('Detail', {
  itemId: id,
});
```

```tsx
const { itemId } = route.params;
```

### 실무 원칙

1. params는 **식별자만**

   * 전체 객체 전달 ❌
2. 화면 진입 후 데이터 로딩
3. params는 “주소”, 데이터는 “내용”

---

### useNavigation 사용 기준

```tsx
const navigation = useNavigation();
```

**사용해도 되는 경우**

* 버튼, 카드 같은 UI 컴포넌트
* Screen 외부 컴포넌트

**주의**

* Screen 컴포넌트에서는 props 우선
* 남용하면 구조 파악 어려움

---

## 헤더 / 옵션 동적 구성

헤더는 단순 UI가 아니다.
**현재 화면의 맥락을 사용자에게 설명하는 요소**다.

### 정적 설정

```tsx
{% raw %}<Stack.Screen
  name="Detail"
  component={DetailScreen}
  options={{
    title: '상세',
  }}
/>{% endraw %}
```

---

### 동적 설정 (데이터 기반)

```tsx
useLayoutEffect(() => {
  navigation.setOptions({
    title: item.title,
  });
}, [item]);
```

### 헤더 버튼 추가

```tsx
{% raw %}options={{
  headerRight: () => (
    <IconButton onPress={save} />
  ),
}}{% endraw %}
```

**원칙**

* 헤더 로직은 Screen 단위
* 전역 설정 남용 금지
* 상태에 따라 바뀌는 경우만 동적 처리

---

## 이 파트의 결론

* 내비게이션은 “이동”이 아니라 **구조**
* Stack / Tab / Drawer는 역할이 다르다
* 중첩은 규칙 없으면 재앙
* params는 주소, 데이터는 상태

이 구조를 먼저 고정하면
이후 상태 관리, 인증, 네이티브 기능이 **자연스럽게 얹힌다**.

다음 단계에서는
이 내비게이션 구조 위에 **반응형 UI와 플랫폼 대응**을 추가한다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
