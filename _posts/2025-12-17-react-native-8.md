---
layout: post
title: "React Native 전환 로드맵 8. 네이티브 기능 통합"
description: "카메라·지도·스토리지·알림 등 네이티브 기능을 권한→호출→결과→상태→UI 흐름으로 안전하게 통합"
categories: ["📱 React Native"]
tags: [ReactNative, Permissions, NativeModules, Integrations]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:59:00 +09:00
last_modified_at: 2025-12-17 20:59:00 +09:00
---

---

React Native의 진짜 가치는 **네이티브 기능을 “웹처럼” 쓰는 것**이 아니라  
**네이티브 제약을 이해한 상태에서 안전하게 통합하는 것**에 있다.

이 파트에서 다루는 모든 기능(카메라, 지도, 저장소, 알림)은 공통 구조를 가진다.

> **권한 → 비동기 호출 → 결과 처리 → 상태 저장 → UI 반영**

이 흐름을 규칙으로 잡지 않으면, 기능이 늘어날수록 앱은 급격히 불안정해진다.

---

## 권한 처리 표준 흐름

권한은 “한 번 허용받으면 끝”이 아니다.  
**권한 상태 자체가 앱 상태의 일부**다.

### 표준 권한 흐름 (모든 네이티브 기능 공통)

1. **권한 상태 확인**
2. **요청**
3. **거절 시 대안 UX**
4. **허용 후 기능 실행**

```ts
const { status } = await requestPermissionsAsync();

if (status !== 'granted') {
  Alert.alert('권한 필요', '기능 사용 불가');
  return;
}
```

### 권한 UX 원칙

* 요청 이유를 먼저 설명
* 거절을 “에러”로 취급하지 말 것
* 재요청 강요 ❌

**실무 판단**

* 권한 거절 = 사용자 선택
* 앱이 망가지면 설계 실패

---

## 카메라 / 이미지 선택 패턴

카메라와 이미지 선택기는 **대표적인 비동기 네이티브 기능**이다.

### 공통 구조

1. 권한 확인
2. 비동기 실행
3. 결과 확인
4. 상태 저장
5. UI 반영

```ts
const result = await launchCameraAsync({
  quality: 0.5,
});

if (!result.canceled) {
  setImage(result.assets[0].uri);
}
```

### 핵심 포인트

* 항상 **취소(canceled)** 고려
* 결과는 즉시 상태로 저장
* 파일 경로(uri)만 관리

### 자주 터지는 문제

* 권한 요청 누락
* Android/iOS 권한 설정 불일치
* 큰 이미지로 인한 메모리 문제

👉 이미지 자체를 state에 넣지 말고 **경로만 저장**

---

## 지도 / 위치 / 주소 변환 흐름

지도 기능은 **좌표 → 의미 있는 정보**로 바꾸는 과정이다.

### 전체 흐름

1. 위치 권한 요청
2. 현재 좌표 획득
3. 지도에 표시
4. 좌표 → 주소 변환 (지오코딩)
5. 사용자 확인

```ts
const location = await getCurrentPositionAsync();
const { latitude, longitude } = location.coords;
```

### 지오코딩에서 고려할 점

* 네트워크 의존
* 응답 지연 가능성
* 주소 포맷 불일치

```ts
const address = await reverseGeocodeAsync({
  latitude,
  longitude,
});
```

**실무 원칙**

* 좌표는 항상 저장
* 주소는 보조 정보
* 주소 실패해도 앱은 동작해야 함

---

## SQLite 로컬 저장 (최소 스키마 설계)

SQLite는 “작은 백엔드”다.
설계를 대충 하면 바로 기술 부채가 된다.

### 언제 SQLite를 쓰는가

* 오프라인 접근 필요
* 영구 저장
* 구조화된 데이터

---

### 최소 데이터 모델 예시 (장소 저장)

```sql
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  imageUri TEXT,
  lat REAL,
  lng REAL,
  address TEXT
);
```

### 설계 원칙

* 필수 값만 NOT NULL
* 이미지 자체 저장 ❌
* 좌표는 숫자 타입

---

### CRUD 흐름

1. 앱 시작 시 테이블 생성
2. INSERT: 사용자 입력 저장
3. SELECT: 리스트/상세 조회
4. UI 상태와 연결

**중요**

* DB는 상태의 “원천(source)”
* UI 상태는 DB를 반영할 뿐

---

## 알림: 로컬 vs 푸시

알림은 기능이 아니라 **사용자와의 약속**이다.

### 로컬 알림

**특징**

* 기기 내부에서 예약
* 서버 불필요
* 즉시 구현 가능

**적합한 경우**

* 리마인더
* 일정 알림
* 반복 알림

---

### 푸시 알림

**특징**

* 서버 필요
* 토큰 관리
* 비동기 통신

**적합한 경우**

* 서버 이벤트
* 메시지
* 실시간 업데이트

---

### 선택 기준 요약

| 기준        | 로컬 | 푸시 |
| ----------- | ---- | ---- |
| 서버 필요   | ❌    | ⭕    |
| 구현 난이도 | 낮음 | 높음 |
| 실시간      | ❌    | ⭕    |
| 개인화      | 제한 | 높음 |

**실무 판단**

* 내부 이벤트 → 로컬
* 외부 트리거 → 푸시

---

## 이 파트의 결론

* 네이티브 기능은 모두 같은 구조를 가진다
* 권한은 상태다
* 비동기는 항상 실패를 전제로
* 데이터는 “UI보다 오래 산다”
* 알림은 UX 설계 문제

이 흐름이 정리되면
React Native는 “웹 느낌의 네이티브 앱”이 아니라
**진짜 모바일 앱 도구**가 된다.

다음 단계에서는
이 기능들을 **백엔드·인증·배포**와 연결한다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
