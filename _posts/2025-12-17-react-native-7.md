---
layout: post
title: "React Native 전환 로드맵 7. 반응형 · 플랫폼 대응"
description: "기기 크기·방향·플랫폼 차이를 규칙으로 다뤄 반응형 UI와 플랫폼별 대응을 설계하는 방법"
categories: ["📱 React Native"]
tags: [ReactNative, Responsive, Platform, Layout]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:58:00 +09:00
last_modified_at: 2025-12-17 20:58:00 +09:00
---

---

React Native에서 “반응형 UI”는 선택 사항이 아니다.  
**기기 파편화는 전제 조건**이고, 이를 고려하지 않은 UI는 초반부터 기술 부채가 된다.

이 파트의 목표는 다음이다.

> 감으로 화면을 맞추는 것이 아니라  
> **화면 크기·방향·키보드·플랫폼 차이를 규칙으로 처리하는 것**

---

## RN 반응형의 핵심 개념

웹 반응형은 보통 **CSS 미디어 쿼리**로 해결한다.  
React Native에는 이 개념이 없다.

RN 반응형의 본질은 다음 네 가지다.

1. **화면 크기 변화 감지**
2. **방향(세로/가로) 전환 대응**
3. **키보드로 인한 레이아웃 붕괴 방지**
4. **플랫폼(iOS/Android) 차이 최소화**

즉, 반응형은 “레이아웃 기술”이 아니라  
**상태 변화에 대응하는 로직**이다.

---

## Dimensions vs useWindowDimensions

이 둘은 겉보기엔 비슷하지만 **용도가 다르다.**

### Dimensions API

```ts
const { width, height } = Dimensions.get('window');
```

**특징**

* 한 번 가져온 값
* 리렌더 자동 발생 ❌

**적합한 경우**

* 초기 레이아웃 계산
* 앱 시작 시 고정 값
* 재계산 필요 없는 UI

**위험한 사용**

* 방향 전환 대응
* 동적 UI

---

### useWindowDimensions

```ts
const { width, height } = useWindowDimensions();
```

**특징**

* 화면 크기 변경 시 자동 리렌더
* 방향 전환 대응 ⭕

**적합한 경우**

* 반응형 레이아웃
* 카드/이미지 크기 조정
* 가로/세로 분기 UI

---

### 선택 기준 요약

| 상황      | 권장                |
| --------- | ------------------- |
| 고정 값   | Dimensions          |
| 반응형 UI | useWindowDimensions |
| 방향 대응 | useWindowDimensions |
| 성능 우선 | Dimensions          |

**원칙**

> 반응형이면 무조건 `useWindowDimensions`

---

## 방향 전환 대응 패턴 (세로 / 가로)

방향 전환은 **레이아웃 구조 자체가 바뀌는 이벤트**다.

### 잘못된 접근

* width만 줄였다 늘렸다
* 같은 구조 유지 시도

→ 가로에서 UI 붕괴

---

### 권장 패턴: 구조 분기

```tsx
const { width } = useWindowDimensions();
const isLandscape = width > 500;

return (
  <View style={isLandscape ? styles.row : styles.column}>
    ...
  </View>
);
```

**핵심**

* 스타일만 바꾸지 말고 **구조를 바꿔라**
* 조건부 렌더링 적극 사용

---

### 실무 규칙

* 세로: 정보 위주
* 가로: 조작/입력 위주
* 동일 UX를 강요하지 말 것

---

## 키보드 대응 (입력 UX)

키보드는 RN 레이아웃 붕괴의 **최대 원인**이다.

### KeyboardAvoidingView 기본 사용

```tsx
{% raw %}<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  ...
</KeyboardAvoidingView>{% endraw %}
```

---

### 흔한 함정 Top 5

1. **전체 앱을 감쌈**
   → 불필요한 레이아웃 이동

2. ScrollView와 중첩
   → 이중 스크롤

3. height 고정 UI
   → 입력창 가려짐

4. Android 테스트 누락
   → iOS에서만 맞음

5. 키보드 이벤트 직접 처리
   → 유지보수 지옥

---

### 실무 원칙

* **입력 화면에만 적용**
* 가능하면 ScrollView와 조합
* 레이아웃은 단순하게

---

## Platform API 분기 원칙 + 예제

Platform API는 **최후의 수단**이다.

```ts
if (Platform.OS === 'android') {
  ...
}
```

### 언제 써야 하는가

* 플랫폼 전용 UX 차이
* 네이티브 동작 차이
* 디자인 가이드 강제

### 언제 쓰면 안 되는가

* 스타일 미세 조정
* 귀찮아서 분기
* 테스트 회피용

---

### 권장 패턴: 최소 분기

```ts
const padding = Platform.select({
  ios: 12,
  android: 8,
});
```

**원칙**

* 분기는 한 곳에 모아라
* 조건이 늘어나면 설계 실패 신호

---

## 실전 예제: 카드 / 이미지 크기 동적 조정

### 목표

* 기기 크기에 따라 카드 너비 자동 조정
* 가로/세로 대응

```tsx
{% raw %}const { width } = useWindowDimensions();

const cardWidth = width > 600
  ? width / 3
  : width / 2;

return (
  <View style={[styles.card, { width: cardWidth }]}>
    <Image
      source={{ uri: image }}
      style={styles.image}
    />
    <Text>{title}</Text>
  </View>
);{% endraw %}
```

```ts
image: {
  width: '100%',
  height: 120,
},
```

**포인트**

* 비율은 JS에서 계산
* Image는 width 100% 기준
* 고정 px 최소화

---

## 이 파트의 결론

* RN 반응형은 CSS 문제가 아니다
* 화면 크기 변화 = 상태 변화
* 구조 분기 없이는 가로 대응 불가
* Platform 분기는 최소한으로

이 규칙을 지키면
**“기기마다 깨지는 앱”에서 벗어난다.**

다음 단계에서는
이 UI 위에 **네이티브 기능(카메라·지도·저장소)**을 얹는다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
