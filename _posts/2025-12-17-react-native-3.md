---
layout: post
title: "React Native 전환 로드맵 3. 리스트 · 입력 · 모달 · 인터랙션"
description: "리스트 렌더링, 입력 제어, CRUD 이벤트, 모달 관리 등 RN 앱 인터랙션 핵심 흐름 정리"
categories: ["📱 React Native"]
tags: [ReactNative, Lists, Forms, Modal]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:54:00 +09:00
last_modified_at: 2025-12-17 20:54:00 +09:00
---

---

이 파트는 **CRUD 앱의 실질적인 생산성을 결정하는 구간**이다.  
화면이 “보이기 시작”하는 순간부터, 앱은 다음 문제에 바로 부딪힌다.

- 데이터는 어떻게 렌더링할 것인가
- 사용자의 입력은 어떻게 제어할 것인가
- 추가/삭제 이벤트는 어떤 흐름으로 처리할 것인가
- 임시 UI(모달)를 어떻게 안전하게 열고 닫을 것인가

핵심은 컴포넌트가 아니라 **상태 → 이벤트 → 렌더링 흐름**이다.

---

## 리스트 렌더링 선택  
### ScrollView vs FlatList

### ScrollView
**언제 쓰는가**
- 아이템 개수 적음 (고정, 수십 개 이하)
- 전체 콘텐츠를 한 번에 렌더링해도 문제 없음

**문제점**
- 모든 자식을 한 번에 렌더링
- 데이터 늘어나면 성능 급락

---

### FlatList
**언제 쓰는가**
- CRUD 리스트의 기본 선택
- 데이터 개수 가변
- 스크롤 성능 중요

**왜 성능이 좋은가**
- 화면에 보이는 영역만 렌더링 (Virtualized List)
- 메모리 사용량 최소화

**필수 규칙**
- `keyExtractor` 반드시 지정
- `renderItem`은 순수하게 유지

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Item item={item} />}
/>
```

**결론**

* 고민되면 FlatList
* ScrollView는 예외적인 선택지

---

## 입력(TextInput) 제어 패턴

React Native의 `TextInput`은 **무조건 제어 컴포넌트로 다룬다.**

```tsx
const [value, setValue] = useState('');

<TextInput
  value={value}
  onChangeText={setValue}
/>
```

### 왜 제어해야 하는가

* 입력값 검증
* 제출 시 초기화
* 모달 닫기/열기와 상태 연동

### 자주 생기는 문제

* 입력값을 상태로 안 관리
* submit 이후 초기화 누락
* 여러 입력 필드 상태 뒤엉킴

**실무 원칙**

* 입력 하나 = 상태 하나
* 폼 단위로 묶기 전까지는 단순하게

---

## 누름(Pressable)과 피드백 처리

### Pressable vs Touchable 계열

| 항목             | Pressable | TouchableOpacity |
| ---------------- | --------- | ---------------- |
| 상태 기반 스타일 | 가능      | 불가             |
| 확장성           | 높음      | 낮음             |
| 권장 여부        | ✅         | ⚠️ (구버전)       |

RN 최신 기준에서는 **Pressable 단일 사용**이 가장 깔끔하다.

### 피드백 처리 (pressed 상태)

```tsx
<Pressable
  style={({ pressed }) => [
    styles.item,
    pressed && styles.pressed,
  ]}
>
  <Text>{item.title}</Text>
</Pressable>
```

### Android 리플 효과

```tsx
{% raw %}android_ripple={{ color: '#ccc' }}{% endraw %}
```

**주의**

* 피드백 없는 버튼은 UX적으로 실패
* 플랫폼별 차이는 Pressable이 흡수해준다

---

## ID 설계 & 삭제 구현에서 자주 터지는 버그

### 문제 1: index를 key로 사용

```tsx
key={index} // ❌
```

**문제**

* 삭제/추가 시 렌더링 꼬임
* 잘못된 아이템 삭제

### 문제 2: ID가 중복되거나 불안정

**해결**

* UUID 또는 timestamp 기반 ID
* 생성 시점에 고정

```ts
const newItem = {
  id: Date.now().toString(),
  title: input,
};
```

### 삭제 패턴 (정석)

```ts
setItems((prev) =>
  prev.filter((item) => item.id !== targetId)
);
```

**중요**

* 직접 mutate 금지
* 항상 새로운 배열 반환

---

## 모달 UX 패턴 (열기 / 닫기 / 오버레이)

모달은 “작은 화면”이 아니라 **UI 상태의 한 종류**다.

### 기본 패턴

```tsx
const [visible, setVisible] = useState(false);

<Modal visible={visible} animationType="slide">
  ...
</Modal>
```

### 열기 / 닫기 규칙

* 열기: 명시적인 사용자 액션
* 닫기:

  * 확인 버튼
  * 취소 버튼
  * 오버레이 터치

### 오버레이 처리

```tsx
<Pressable style={styles.overlay} onPress={close}>
  <View style={styles.modalContent} />
</Pressable>
```

**주의**

* 접근성: 뒤 화면과의 포커스 분리
* 키보드와 함께 쓰면 레이아웃 붕괴 주의

---

## 통합 예제 흐름

### 아이템 추가 / 삭제 + 모달 입력

### 상태 구조

```ts
const [items, setItems] = useState([]);
const [modalOpen, setModalOpen] = useState(false);
const [input, setInput] = useState('');
```

### 추가 로직

```ts
function addItem() {
  setItems((prev) => [
    ...prev,
    { id: Date.now().toString(), title: input },
  ]);
  setInput('');
  setModalOpen(false);
}
```

### 삭제 로직

```ts
function deleteItem(id) {
  setItems((prev) => prev.filter((i) => i.id !== id));
}
```

### 렌더링 흐름

1. 버튼 → 모달 열기
2. 입력 → 상태 업데이트
3. 확인 → 리스트 추가
4. Pressable 아이템 → 삭제

이 흐름이 **모든 CRUD 앱의 기본 골격**이다.

---

## 이 파트의 결론

* 리스트 성능은 **선택**에서 갈린다
* 입력/삭제/모달은 **상태 흐름 문제**
* 컴포넌트보다 **데이터 흐름을 먼저 설계**해야 한다

이 구조가 머리에 들어오면
다음 단계인 **내비게이션과 상태 관리**가 훨씬 단순해진다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
