---
title: "TypeScript 모듈 시스템과 Webpack 실전 설정 – “코드가 어떻게 실행되는지”부터 잡기"
description: "ESM과 Webpack 실행 모델, ts-loader 역할, import/export 패턴과 번들 전략을 실무 관점에서 정리"
categories: ["🟦 TypeScript & Language"]
tags: ["Modules", "Webpack", "Bundling", "ESM"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:37:00 +09:00
last_modified_at: 2025-12-16 13:37:00 +09:00
---

## 결론: 모듈과 번들링을 이해하지 못하면 “돌아가는 코드”는 만들어도 “예측 가능한 코드”는 만들 수 없다

TypeScript에서 모듈과 Webpack은 선택 기술이 아니라 **실행 모델을 통제하기 위한 필수 지식**이다. 이 글의 핵심은 문법이 아니라, **코드가 어떻게 연결되고, 언제 실행되며, 어떤 형태로 배포되는지**를 명확히 이해하는 데 있다.

---

## Namespace가 레거시가 되는 이유는 “실행 단위”를 분리하지 못하기 때문이다

**결론:** Namespace는 파일을 나눌 뿐, 실행 경계를 만들지 못한다.

### Namespace의 본질

* 전역 스코프를 나누기 위한 과거 TS 전용 문법
* 하나의 JS 파일(또는 전역 공간)에 모두 합쳐짐

```ts
namespace Utils {
  export function sum(a: number, b: number) {
    return a + b;
  }
}
```

### 한계

* 파일 단위 의존성 그래프가 없다
* lazy loading, tree shaking 불가
* 표준 아님 (TS 전용)

### ES Module이 표준인 이유

* 파일 = 실행 단위
* import/export로 의존성 명시
* 브라우저, Node, 번들러 공통 표준

```ts
// sum.ts
export function sum(a: number, b: number) {
  return a + b;
}
```

---

## import/export 패턴은 “편의”가 아니라 “유지보수 비용”의 문제다

**결론:** import 스타일은 팀 규모가 커질수록 비용 차이가 난다.

### 기본 export

```ts
export default function sum(a: number, b: number) {
  return a + b;
}
```

* ✔ 단일 책임 모듈
* ❌ 이름 변경이 쉬워 추적 어려움

### 명명 export (권장)

```ts
export function sum(a: number, b: number) {
  return a + b;
}
```

* ✔ 명확한 API
* ✔ 자동완성/리팩터링 안전

### 배럴(barrel) 패턴

```ts
// index.ts
export * from "./sum";
export * from "./multiply";
```

**주의:**

* 대규모 프로젝트에서 배럴 남용 → 순환 참조, 번들 비대화

---

## Webpack은 “파일을 하나로 합치는 도구”가 아니다

**결론:** Webpack의 핵심은 “의존성 그래프 기반 실행 통제”다.

### Webpack이 해결하는 문제

* 여러 파일을 하나의 번들로 묶음
* import/export 기반 **의존성 그래프 생성**
* 개발 서버(dev-server) 제공
* 코드 분할, 캐싱, 최적화

### Webpack이 없으면 생기는 문제

* 브라우저에서 모듈 로딩 순서 직접 관리
* 다수의 네트워크 요청
* 구형 브라우저 대응 어려움

---

## ts-loader는 “타입 체크 도구”가 아니라 “변환기”다

**결론:** 번들링과 타입 체크는 **완전히 다른 단계**다.

### 빌드 파이프라인 개념

```
TypeScript
  ↓ (ts-loader)
JavaScript
  ↓ (Webpack)
Bundle
```

### ts-loader의 역할

* TS → JS 변환
* Webpack 파이프라인에 TypeScript 연결

**중요한 오해**

* ❌ Webpack이 타입을 검사한다
* ❌ 번들 에러 = 타입 에러

→ 타입 체크는 `tsc`, 번들은 Webpack의 책임

---

## ESM 기반 폴더 구조 예시

**결론:** 폴더 구조는 “의존성 방향”을 드러내야 한다.

```text
src/
 ├─ index.ts
 ├─ app/
 │   ├─ App.ts
 │   └─ app.service.ts
 ├─ utils/
 │   ├─ sum.ts
 │   └─ index.ts
 └─ types/
     └─ common.ts
```

* `index.ts`: 진입점(entry)
* utils/types는 **하위에서만 참조**
* 순환 참조 방지

---

## Webpack 최소 구성 (개발/운영 분리)

**결론:** 개발과 운영은 요구사항이 다르다.

### webpack.config.js (최소 예시)

```ts
import path from "path";

export default {
  entry: "./src/index.ts",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  devtool: "source-map"
};
```

### npm scripts

```json
{
  "scripts": {
    "dev": "webpack --mode development",
    "build": "webpack --mode production"
  }
}
```

### 개발 vs 운영 분리 포인트

* dev: source-map ON, 빠른 빌드
* prod: minify, tree-shaking, 캐시 최적화

---

## 흔한 오류 3가지와 해결책

**결론:** 대부분 “모듈 해석” 문제다.

### 1️⃣ 경로 오류

```ts
import { sum } from "./utils"; // ❌ index.ts 없음
```

**해결:**

* `./utils/index.ts` 존재 확인
* barrel 패턴 명확화

---

### 2️⃣ 모듈 해석 실패

```ts
Cannot use import statement outside a module
```

**원인**

* module 설정 불일치 (CommonJS vs ESModule)

**해결**

* tsconfig / webpack module 설정 일치

---

### 3️⃣ 타입 선언 문제

```ts
Cannot find module 'lodash'
```

**원인**

* JS 라이브러리 타입 선언 없음

**해결**

* `@types/lodash` 설치
* 또는 최소한의 `declare module` 작성

---

## Webpack 없이도 되는 경우 / 꼭 필요한 경우

**결론:** 번들링 필요 여부는 “실행 환경”이 결정한다.

### Webpack 없이도 되는 경우

* Node 18+ (ESM 지원)
* 단순 스크립트/라이브러리
* Vite 같은 상위 툴 사용

### 꼭 필요한 경우

* 복잡한 프론트엔드 SPA
* 레거시 브라우저 대응
* 커스텀 빌드 파이프라인 필요

---

## 체크리스트

* [ ] Namespace를 새 코드에 쓰고 있지 않은가?
* [ ] import/export 스타일이 팀 기준으로 통일돼 있는가?
* [ ] 번들링과 타입 체크를 분리해서 이해하고 있는가?
* [ ] Webpack 설정이 실행 환경과 맞는가?
* [ ] 순환 참조가 구조적으로 발생하지 않는가?

---

## 요약 5줄

1. Namespace는 실행 단위를 만들지 못해 레거시가 됐다.
2. ES Module은 파일 기반 실행 모델을 제공하는 표준이다.
3. Webpack은 번들러이자 의존성 그래프 관리자다.
4. ts-loader는 변환기이며, 타입 체크는 별도 단계다.
5. 번들링 필요 여부는 프로젝트의 실행 환경이 결정한다.

---

## 자기점검 질문 5개

1. 내 프로젝트의 “실행 진입점(entry)”은 명확한가?
2. import/export 패턴이 유지보수에 불리하게 쓰이고 있지는 않은가?
3. 번들 에러와 타입 에러를 구분해서 설명할 수 있는가?
4. Webpack 없이도 가능한 구조인데 관성으로 쓰고 있지는 않은가?
5. 모듈 의존성 방향이 한쪽으로 흐르고 있는가?

---

## 실전 미션 3개

1. Namespace로 작성된 코드를 ES Module 구조로 리팩터링하라.
2. Webpack 설정에서 source-map ON/OFF 차이를 직접 디버깅으로 확인하라.
3. 순환 참조가 발생하는 import 구조 하나를 찾아 분리하라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

