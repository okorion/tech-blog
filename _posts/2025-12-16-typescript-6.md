---
title: "tsconfig.json으로 코드 품질을 통제하는 법 – 설정 파일이 아니라 팀 정책이다"
description: "tsconfig를 팀 품질 정책으로 보고 watch/build, target·module·lib, strict, noEmitOnError 설정 판단 기준을 정리"
categories: ["🟦 TypeScript & Language"]
tags: ["tsconfig", "CompilerOptions", "StrictMode", "Build"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:36:00 +09:00
last_modified_at: 2025-12-16 13:36:00 +09:00
---

## 결론: tsconfig.json은 “컴파일 옵션 모음”이 아니라 팀의 품질 기준을 강제하는 장치다

tsconfig는 개인 취향이 아니라 **조직의 코드 품질·안전성·배포 정책을 코드로 고정한 문서**다. 이 파일을 어떻게 쓰느냐에 따라 TypeScript는 “타입 힌트 도구”가 될 수도, “빌드 게이트키퍼”가 될 수도 있다.

---

## watch vs build, 단일 파일 컴파일 vs 프로젝트 컴파일은 목적이 다르다

**결론:** 개발 편의와 품질 보장은 다른 명령이다.

### watch 모드

* 파일 변경 시 즉시 재컴파일
* 개발 피드백 루프 최적화

```bash
tsc --watch
```

### build(프로젝트) 컴파일

* tsconfig 기준으로 전체 프로젝트를 일괄 검사
* CI/CD에서 사용하는 모드

```bash
tsc --build
```

### 단일 파일 컴파일의 함정

```bash
tsc index.ts
```

* tsconfig 일부 옵션 무시
* 실제 빌드 환경과 다른 결과 발생

**실무 판단 기준**

* 로컬 개발: watch
* 배포/검증: build
* CI에서는 **항상 프로젝트 컴파일만 허용**

---

## include / exclude / files는 “컴파일 대상 범위”를 결정한다

**결론:** 범위를 명확히 하지 않으면 타입 체크 비용이 기하급수로 늘어난다.

### 차이점 정리

* `files`: 명시한 파일만 포함 (소규모/라이브러리)
* `include`: glob 패턴 기반 포함
* `exclude`: include에서 제외

### 대규모 레포 전략

```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### 흔한 실수

* exclude 없이 include만 넓게 설정
* 빌드 산출물(outDir)을 다시 include해서 무한 확장

---

## target / module / lib는 “실행 환경”과 정확히 매칭돼야 한다

**결론:** 이 옵션들은 문법 문제가 아니라 **실행 실패 여부**를 결정한다.

### 의미 정리

* `target`: JS 문법 레벨 (ES5, ES2017 등)
* `module`: 모듈 시스템 (ESNext, CommonJS 등)
* `lib`: 전역 API 타입 집합 (DOM, ES2020 등)

### 브라우저 vs Node 예시

```json
// Web (Browser)
{
  "target": "ES2020",
  "module": "ESNext",
  "lib": ["DOM", "ES2020"]
}
```

```json
// Node
{
  "target": "ES2020",
  "module": "CommonJS",
  "lib": ["ES2020"]
}
```

### 흔한 실수

* Node 프로젝트에 DOM lib 포함 → 타입은 통과, 런타임에서 undefined
* target을 너무 낮게 잡아 불필요한 폴리필 강제

---

## strict 옵션은 “실제 버그를 막는다”, 귀찮게 하는 게 아니다

**결론:** strict는 비용이 아니라 **미래 장애를 선불로 결제**하는 옵션이다.

### strict가 묶고 있는 주요 옵션

* `strictNullChecks`
* `noImplicitAny`
* `strictFunctionTypes`
* `strictPropertyInitialization` 등

### strict OFF → ON으로 막히는 버그 예시 ①

```ts
function printLength(value: string | null) {
  return value.length; // ❌ strictNullChecks ON 시 에러
}
```

### 버그 예시 ②

```ts
function log(value) { // ❌ noImplicitAny
  console.log(value);
}
```

**실무 포인트**

* 처음부터 strict ON이 이상적
* 기존 프로젝트는 파일 단위로 점진 적용

---

## sourceMap, rootDir/outDir, noEmitOnError는 “디버깅·배포 안전장치”다

**결론:** 이 옵션들은 개발자 경험과 장애 확률을 직접적으로 좌우한다.

### sourceMap: TS ↔ JS 디버깅 연결

```json
{
  "sourceMap": true
}
```

**디버깅 흐름**

1. 브라우저/Node에서 JS 실행
2. sourceMap으로 TS 위치 매핑
3. TS 코드 기준으로 디버깅

### rootDir / outDir

```json
{
  "rootDir": "src",
  "outDir": "dist"
}
```

* 소스/산출물 경계 명확화
* 빌드 산출물이 다시 컴파일되는 사고 방지

### noEmitOnError

```json
{
  "noEmitOnError": true
}
```

**의미:** 타입 에러가 있으면 JS를 **아예 생성하지 않는다**
→ “컴파일은 되는데 런타임에서 터지는” 배포 차단

---

## 코드 품질 옵션은 “팀 합의” 없이는 독이 된다

**결론:** 옵션은 기술 문제가 아니라 조직 문제다.

### 대표 옵션

* `noImplicitAny`
* `noUnusedLocals`
* `noUnusedParameters`
* `exactOptionalPropertyTypes`

### 합의 포인트

* 어디까지 에러로 볼 것인가?
* 레거시 코드는 예외로 둘 것인가?
* CI에서 fail 기준은?

**원칙:**
로컬에서는 경고, CI에서는 에러 → 점진 강화

---

## 스타트업 기본값 vs 엔터프라이즈 엄격 세팅

**결론:** 규모가 커질수록 “편의”보다 “통제”가 이득이다.

### 스타트업/소규모 팀

* strict ON
* unused 계열은 warning 수준
* 빠른 피드백 우선

### 엔터프라이즈/장기 프로젝트

* strict + noEmitOnError 필수
* unused도 에러 처리
* 빌드 실패 = 배포 차단

---

## 복붙 가능한 tsconfig 템플릿

### Web 프로젝트용

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["DOM", "ES2020"],
    "strict": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "noEmitOnError": true
  },
  "include": ["src/**/*"]
}
```

### Node 프로젝트용

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "strict": true,
    "rootDir": "src",
    "outDir": "dist",
    "noEmitOnError": true
  },
  "include": ["src/**/*"]
}
```

---

## 체크리스트

* [ ] CI에서 프로젝트 컴파일만 허용하는가?
* [ ] 실행 환경과 target/lib가 정확히 맞는가?
* [ ] strict를 끈 이유를 설명할 수 있는가?
* [ ] sourceMap이 디버깅 환경에 맞게 설정됐는가?
* [ ] 타입 에러가 배포를 막고 있는가?

---

## 요약 5줄

1. tsconfig는 컴파일 설정이 아니라 팀의 품질 정책이다.
2. watch와 build는 목적이 다르며, CI는 항상 프로젝트 컴파일이어야 한다.
3. target/module/lib는 실행 환경과 정확히 맞아야 한다.
4. strict 옵션은 실제 장애를 사전에 차단한다.
5. noEmitOnError는 TypeScript를 “게이트키퍼”로 만든다.

---

## 자기점검 질문 5개

1. 타입 에러가 있는 코드가 현재 배포 가능한 구조인가?
2. tsconfig 옵션 중 “왜 켰는지 설명 못하는 옵션”은 무엇인가?
3. 실행 환경과 lib 설정이 불일치한 곳은 없는가?
4. strict를 끄지 않고 문제를 해결할 수는 없는가?
5. 이 tsconfig는 팀원 모두가 이해하고 합의한 결과인가?

---

## 실전 미션 3개

1. CI에서 `tsc --build`만 허용하도록 파이프라인을 수정하라.
2. strictNullChecks를 켜고 컴파일 에러 3개를 실제 로직 수정으로 해결하라.
3. sourceMap을 켜고 TS 기준으로 디버깅해 실제 버그 하나를 추적하라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

