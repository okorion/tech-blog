---
layout: post
title: "React Native 전환 로드맵 9. 백엔드 연동 · 인증"
description: "RN에서 네트워크 안정성과 인증 상태 모델링을 위해 레이어 분리와 시퀀스 고정을 다루는 가이드"
categories: ["📱 React Native"]
tags: [ReactNative, Networking, Authentication, APIs]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 21:00:00 +09:00
last_modified_at: 2025-12-17 21:00:00 +09:00
---

---

RN 앱이 “데모”를 넘어 “서비스”가 되려면 결국 두 가지를 통과해야 한다.

- 네트워크 요청이 **끊기지 않고** 동작한다
- 인증 상태가 **예측 가능하게** 유지된다

이 파트의 핵심은 라이브러리(Axios)가 아니라  
**레이어 분리 + 상태 모델링 + 인증 시퀀스 고정**이다.

---

## 네트워크 레이어 설계

### 목표
- 컴포넌트에서 `axios.get(...)`를 직접 치지 않는다
- 요청 로직/엔드포인트/에러 처리를 한 곳에 모은다

### 1) Axios 인스턴스 분리

```ts
// api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://YOUR_BASE_URL',
  timeout: 10000,
});
```

**포인트**

* baseURL, timeout, 공통 헤더를 단일화
* 나중에 토큰 헤더 주입도 여기서 처리

---

### 2) 서비스 함수로 CRUD 캡슐화

```ts
// api/expenses.ts
import { api } from './client';

export async function fetchExpenses() {
  const res = await api.get('/expenses');
  return res.data;
}

export async function createExpense(payload) {
  const res = await api.post('/expenses', payload);
  return res.data;
}
```

**원칙**

* Screen/컴포넌트는 “데이터 요청”만
* URL/HTTP 메서드/응답 형태는 서비스가 책임

---

### 3) 인증이 붙으면 인터셉터로 표준화

```ts
// api/client.ts
api.interceptors.request.use((config) => {
  // token이 있으면 헤더에 넣기
  // config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

토큰이 퍼지기 시작하면, 여기서 막아야 한다.

---

## 로딩/에러 상태 처리 (모델링)

RN 네트워크에서 UI가 깨지는 이유는 대체로 **상태 모델이 빈약해서**다.
최소한 아래 3개는 분리해야 한다.

* `isLoading`
* `error`
* `data`

### 기본 패턴

```ts
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState([]);
```

### 요청 흐름 (정석)

```ts
async function load() {
  setIsLoading(true);
  setError(null);
  try {
    const items = await fetchExpenses();
    setData(items);
  } catch (e) {
    setError('데이터 로딩 실패');
  } finally {
    setIsLoading(false);
  }
}
```

### UI 반영 규칙

* 로딩이면 스피너/스켈레톤
* 에러면 재시도 버튼
* 데이터면 렌더링

```tsx
if (isLoading) return <Loading />;
if (error) return <ErrorView onRetry={load} />;
return <List data={data} />;
```

**중요**

* “로딩 중인데 이전 데이터가 남아있는 상태”를 의도적으로 선택해야 한다
* 기본값은 단순하게: 로딩 시 스피너, 실패 시 재시도

---

## 인증 플로우 (전체 시퀀스)

인증은 기능이 아니라 **상태 머신**이다.
아래 시퀀스를 고정하면 흔들리지 않는다.

### 1) 가입 (Sign Up)

* 이메일/비번 입력
* 서버에 생성 요청
* 성공 시 로그인 화면으로

### 2) 로그인 (Sign In)

* 서버로 인증 요청
* 응답: `token` + `expiresIn`(또는 만료 시각)

### 3) 토큰 저장

* 앱 재시작에도 유지되도록 로컬 저장소에 저장

### 4) 보호 화면(Protected Routes)

* 토큰 존재 여부로 네비게이터 분기

  * Auth Stack / App Stack

**핵심**

* “로그인 상태”는 화면이 아니라 **전역 상태**
* 내비게이션 구조로 강제한다

---

## 토큰 저장 / 자동 로그인

### 토큰 저장의 목적

* 앱을 껐다 켜도 로그인 유지
* 보호 화면 접근 통제

### 표준 흐름

1. 로그인 성공 → 토큰 저장
2. 앱 시작 → 저장된 토큰 로드
3. 유효하면 App Stack
4. 아니면 Auth Stack

```ts
// 의사 코드
const token = await storage.get('token');
if (token) setAuth(token);
```

### 토큰 만료 처리 전략

토큰은 반드시 만료된다. 선택지는 두 가지다.

#### 1) 재로그인(단순/안전)

* 만료 시 로그아웃 처리
* 로그인 화면으로 이동

**장점**

* 구현 단순
* 보안적으로 안전

**단점**

* UX 떨어짐

#### 2) 갱신(refresh token)(복잡/UX 좋음)

* access token 만료 시 refresh token으로 재발급
* 인터셉터에서 자동 재시도

**장점**

* 끊김 없는 UX

**단점**

* 서버 설계 필요
* 보안 설계 난이도 상승

**현실적인 판단**

* 강의 수준/개인 앱: 재로그인
* 상용 서비스: 갱신 고려

---

## RN에서 흔한 네트워크 버그 Top 5 (체크 포함)

### 1) 실제 기기에서만 API 호출 실패

* 원인: 로컬호스트 착각(PC의 localhost ≠ 폰의 localhost)
* 체크: baseURL이 디바이스에서 접근 가능한 주소인가?

### 2) Android에서만 네트워크 에러

* 원인: 네트워크 보안/HTTP 차단/권한
* 체크: HTTPS 사용 여부, Android 설정/권한 확인

### 3) 요청은 갔는데 UI가 안 바뀜

* 원인: 로딩/에러 상태 모델 부재, setState 흐름 누락
* 체크: try/catch/finally 구조가 있는가?

### 4) 토큰이 여기저기 흩어져서 관리 불가

* 원인: 컴포넌트마다 헤더 주입
* 체크: axios 인스턴스/인터셉터로 중앙화했는가?

### 5) “가끔” 401/403이 터짐

* 원인: 토큰 만료, 동시 요청 레이스
* 체크: 만료 처리(재로그인/갱신) 정책이 명확한가?

---

## 이 파트의 결론

* 네트워크는 컴포넌트가 아니라 **레이어**가 담당해야 한다
* UI는 data가 아니라 **상태(loading/error)**를 먼저 렌더링해야 한다
* 인증은 기능이 아니라 **시퀀스와 분기 구조**다
* 토큰 만료는 예외가 아니라 **정상 시나리오**다

다음 단계에서는
이 앱을 실제 배포 가능한 형태로 정리하는 **퍼블리싱/빌드 전략**으로 넘어간다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
