---
layout: post
title: "React Native 전환 로드맵 1. RN 기초 & 프로젝트 셋업"
description: "웹 React와 다른 RN 렌더링 구조, 기본 셋업(Expo/CLI)과 핵심 개념을 정리한 입문 가이드"
categories: ["📱 React Native"]
tags: [ReactNative, Setup, "Expo vs CLI"]
image: /assets/posts/2025-12-17-react-native/image.png
date: 2025-12-17 20:52:00 +09:00
last_modified_at: 2025-12-17 20:52:00 +09:00
---

---

## RN의 핵심 아이디어 (웹 React와 비교)

React Native는 “React 문법으로 네이티브 UI를 선언한다”는 점에서 웹 React와 닮았지만, **렌더링 대상과 실행 구조는 완전히 다르다.**

### 웹 React
- JSX → Virtual DOM → 실제 DOM
- CSS로 스타일링
- 브라우저가 렌더링과 이벤트를 처리

### React Native
- JSX → Virtual Tree → **Native View(UI 컴포넌트)**
- DOM 없음, HTML 태그 없음
- 스타일은 JS 객체(`StyleSheet`)
- 실제 렌더링은 iOS/Android 네이티브 엔진이 수행

즉, React Native는 **“웹 기술로 네이티브 UI를 흉내 내는 것”이 아니라**,  
**React를 UI 선언 DSL로 사용해 네이티브 앱을 만드는 방식**이다.

이 차이를 인지하지 못하면 이후 모든 학습에서 혼란이 누적된다.

---

## Expo vs React Native CLI  
### 선택 기준표 + 예시 시나리오

### Expo (Managed / Bare)

**가능한 것**
- 즉시 실행 가능한 개발 환경
- 카메라, 이미지, 알림, 위치 등 대부분의 네이티브 기능
- iOS 없이도 iOS 앱 빌드(EAS)
- 빠른 MVP 제작

**불가능/제한**
- 지원되지 않는 네이티브 SDK 직접 수정
- 특수 하드웨어 연동
- 네이티브 레벨 최적화 세밀 제어

**팀/운영 관점**
- 개인 개발자, 초기 스타트업에 최적
- 설정/유지보수 비용 최소

---

### React Native CLI

**가능한 것**
- 모든 네이티브 코드 직접 수정
- SDK, 하드웨어, 플랫폼 특화 기능 자유 사용

**불리한 점**
- 환경 설정 비용 큼
- iOS 빌드는 macOS 필수
- 초기 진입 장벽 높음

**팀/운영 관점**
- 대규모 팀, 장기 유지보수
- 네이티브 전문 인력 보유 시 유리

---

### 현실적인 선택 시나리오

- **“RN 처음 + 빠른 결과물”** → Expo
- **“네이티브 SDK 연동 예정”** → Expo Bare
- **“완전한 네이티브 제어 필요”** → RN CLI

대부분은 **Expo → Bare → (필요 시) CLI**로 이동한다.

---

## 프로젝트 생성부터 실행까지 (흐름 중심)

### 1단계: 프로젝트 생성
- Expo: `npx create-expo-app`
- CLI: `npx react-native init`

이 단계의 목적은 **코드를 이해하는 것보다 ‘실행되는 상태’를 만드는 것**이다.

### 2단계: 개발 서버 실행
- Metro Bundler가 실행됨
- JS 번들을 실시간으로 빌드해 디바이스로 전달

### 3단계: 앱 실행
- 에뮬레이터 또는 실제 기기
- QR 코드 스캔(Expo) 또는 로컬 실행(CLI)

중요한 건 명령어 암기가 아니라  
**“JS 코드 변경 → 즉시 네이티브 UI 반영”이라는 피드백 루프**를 체감하는 것이다.

---

## 생성된 프로젝트 해부 (핵심 파일만)

### 공통 핵심

- `App.js / App.tsx`  
  → 앱의 시작점. 모든 화면의 루트 컴포넌트

- `package.json`  
  → RN/Expo 의존성, 스크립트 정의

- `node_modules`  
  → 네이티브 브리지 포함 라이브러리

---

### Expo 프로젝트에서 자주 보는 것

- `app.json / app.config.js`  
  → 앱 이름, 아이콘, 권한, 빌드 설정

- `assets/`  
  → 이미지, 폰트 등 정적 리소스

---

### CLI 프로젝트에서 추가되는 것

- `android/`, `ios/`  
  → 실제 네이티브 프로젝트
  → 이 폴더가 있다는 순간 “웹 앱”이 아니다

초기에는 **절대 건드리지 말고**, 구조만 인지하면 충분하다.

---

## 실제 기기 실행 트러블슈팅 Top 5

### 1️⃣ 앱이 실행되지 않는다
- Metro 서버 미실행
- 포트 충돌
→ 서버 재시작, 포트 확인

### 2️⃣ 실제 기기 연결이 안 된다
- 동일 네트워크 아님
- USB 디버깅 비활성화
→ 네트워크/권한 점검

### 3️⃣ 변경 사항이 반영되지 않는다
- 캐시 문제
→ Metro 캐시 초기화

### 4️⃣ Android만 오류 발생
- Android SDK/에뮬레이터 설정 문제
→ Android Studio 설정 재확인

### 5️⃣ iOS 빌드 실패
- Xcode 서명/시뮬레이터 문제
→ Apple 계정, 시뮬레이터 상태 확인

대부분의 문제는 **코드가 아니라 환경**이다.

---

## 용어 정리 (최소 필수)

- **Metro**  
  React Native 전용 JS 번들러

- **Bundler**  
  JS 코드를 하나의 번들로 묶는 도구

- **Dev Menu**  
  흔들기/단축키로 여는 개발자 메뉴  
  (리로드, 디버깅, 로그 확인)

- **Bridge**  
  JS ↔ Native 통신 계층(개념)

---

## 정리

이 단계의 목표는 “RN을 잘 아는 것”이 아니다.  
**“RN 앱을 스스로 생성하고, 실행하고, 구조를 설명할 수 있는 상태”**다.

다음 단계부터는  
UI, 스타일링, 레이아웃이라는 **진짜 전쟁 구간**으로 들어간다.

---

- 참고: [  React Native 완벽 가이드 2025
](https://www.udemy.com/course/react-native-2022-ko/)
