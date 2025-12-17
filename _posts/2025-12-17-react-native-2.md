---
layout: post
title: "React Native 전환 로드맵 2. 컴포넌트 · 스타일링 · 레이아웃 (핵심)"
description: "RN 컴포넌트 구성, 스타일링, Flex 레이아웃 기본기를 단단히 해 UI 골격을 안정적으로 만드는 법"
categories: ["📱 React Native"]
tags: [ReactNative, Components, Styling, Layout]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:53:00 +09:00
last_modified_at: 2025-12-17 20:53:00 +09:00
---

---

이 파트는 **React Native 학습 전체에서 가장 중요하다.**  
이 구간을 제대로 이해하지 못하면 이후 내비게이션, 상태 관리, 네이티브 기능까지 전부 흔들린다.

목표는 하나다.

> **“디자인이 아니라 UI 골격을 안정적으로 만드는 능력”**

---

## RN 핵심 컴포넌트 지도 (Top 10)

아래 10개만 제대로 쓰면 RN UI의 80%를 커버한다.

| 컴포넌트               | 언제 쓰는가            | 대체 / 주의점             |
| ---------------------- | ---------------------- | ------------------------- |
| `View`                 | 모든 레이아웃 컨테이너 | div 대체 개념, 기본 flex  |
| `Text`                 | 모든 텍스트            | Text 안에만 Text 가능     |
| `Image`                | 이미지 표시            | 웹 img와 다르게 크기 필수 |
| `ScrollView`           | 소량 스크롤            | 대량 데이터 금지          |
| `FlatList`             | 리스트 렌더링          | keyExtractor 필수         |
| `Pressable`            | 터치 인터랙션          | 상태 기반 스타일 가능     |
| `TextInput`            | 사용자 입력            | 제어 컴포넌트             |
| `Modal`                | 오버레이 UI            | 전체 화면 개념            |
| `SafeAreaView`         | 노치 대응              | iOS 필수                  |
| `KeyboardAvoidingView` | 키보드 UI 보정         | 레이아웃 깨짐 주범        |

**중요**
- RN에는 `div`, `span`, `p` 개념이 없다
- 모든 레이아웃은 `View` 기반
- 텍스트는 반드시 `Text` 내부

---

## 스타일링 원칙 (웹 CSS와의 차이)

### RN 스타일링의 본질

- CSS 파일 ❌
- 클래스 ❌
- 상속 거의 없음
- **JS 객체 기반 스타일 선언**

```ts
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

### StyleSheet를 쓰는 이유

1. **성능**

   * 런타임 스타일 계산 최소화
2. **오타 방지**

   * 정의되지 않은 속성 경고
3. **재사용**

   * 컴포넌트 간 공통 스타일 분리

### 실무 원칙

* 인라인 스타일은 **조건부/동적 값**만
* 공통 레이아웃은 StyleSheet로 고정
* 색상/여백은 상수화

```ts
// ❌ 지양
{% raw %}<View style={{ padding: 12, margin: 8 }} />{% endraw %}

// ✅ 권장
<View style={styles.card} />
```

---

## Flexbox 실전 규칙 (웹과 다른 점)

RN 레이아웃의 핵심은 **Flexbox 단 하나**다.
문제는 웹과 기본값이 다르다는 점이다.

### 웹 vs React Native Flexbox 차이

| 항목         | 웹         | React Native |
| ------------ | ---------- | ------------ |
| 기본 방향    | row        | **column**   |
| width/height | 자동       | 명시적 필요  |
| gap          | 지원       | ❌            |
| flex 단위    | px, %, rem | 숫자         |
| overflow     | 자유       | 제한적       |

### 자주 틀리는 포인트 Top 5

1. **row로 생각했는데 column**
2. width 없이 Image 사용
3. 부모에 flex 없어서 안 보임
4. justifyContent / alignItems 혼동
5. margin collapse 기대 (존재 안 함)

### 필수 암기 규칙

* **부모가 flex를 가져야 자식이 보인다**
* 축은 항상 `flexDirection` 기준
* 가운데 정렬 = justify + align 조합

---

## 레이아웃 문제 해결 플레이북

레이아웃이 깨질 때, 감으로 고치지 말고 아래 순서로 본다.

### 1단계: 경계선 표시

```ts
borderWidth: 1,
borderColor: 'red',
```

→ 실제 크기/위치 즉시 확인

### 2단계: 부모 → 자식 방향으로 추적

* 부모에 `flex: 1` 있는가?
* 자식이 부모 크기를 벗어나는가?

### 3단계: 축 확인

* 지금 보고 있는 문제는 **주축인가, 교차축인가**

### 4단계: 고정 크기 제거

* 불필요한 width/height 제거
* flex 기반으로 재정렬

---

## 미니 예제 1: 카드 레이아웃 (최소 패턴)

```tsx
<View style={styles.card}>
  <Text style={styles.title}>Title</Text>
  <Text>Description</Text>
</View>
```

```ts
card: {
  padding: 16,
  borderRadius: 8,
  backgroundColor: '#fff',
}
```

**포인트**

* 카드 = padding + radius
* 그림자/디자인은 나중 문제

---

## 미니 예제 2: 리스트 아이템

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <Pressable style={styles.item}>
      <Text>{item.title}</Text>
    </Pressable>
  )}
/>
```

**포인트**

* FlatList는 반드시 key
* Pressable로 인터랙션 통합

---

## 미니 예제 3: 버튼 패턴

```tsx
<Pressable
  style={({ pressed }) => [
    styles.button,
    pressed && styles.pressed,
  ]}
>
  <Text>확인</Text>
</Pressable>
```

**포인트**

* 상태 기반 스타일링
* Android/iOS 공통 처리

---

## 이 파트의 결론

* RN UI는 **디자인 문제가 아니라 구조 문제**
* Flexbox 이해도가 전체 생산성을 결정
* 이 글의 패턴을 외우면, 대부분의 화면을 “막힘없이” 만든다

다음 단계부터는
이 UI 골격 위에 **상태, 내비게이션, 로직**을 얹는다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
