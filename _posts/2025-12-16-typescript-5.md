---
title: "TypeScript 데코레이터의 동작 원리 – 프레임워크가 쓰는 이유를 “실행 시점”으로 설명"
description: "데코레이터 실행 시점과 메타데이터 수집 역할, factory·autobind·validation 패턴과 주의점을 정리"
categories: ["🟦 TypeScript & Language"]
tags: ["Decorators", "Metadata", "Autobind", "Validation"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:35:00 +09:00
last_modified_at: 2025-12-16 13:35:00 +09:00
---

## 결론: 데코레이터는 “실행 로직”이 아니라 “정의 시점 메타데이터”를 만든다

데코레이터는 함수처럼 보이지만 **호출 타이밍과 목적이 전혀 다르다**. 데코레이터의 핵심 가치는 로직 실행이 아니라, **클래스/멤버가 정의될 때 정보를 수집·부착**하는 데 있다. 이 지점을 이해하지 못하면 데코레이터는 곧바로 디버깅 지옥이 된다.

---

## 데코레이터는 “정의 시점”에 실행된다 (인스턴스 생성 전)

**결론:** 데코레이터는 객체가 만들어질 때가 아니라, 클래스가 로드될 때 실행된다.

### 실행 시점 구분

* **정의 시점:** 클래스 선언이 평가될 때 즉시 실행
* **인스턴스 시점:** `new`로 객체를 만들 때

```ts
function Log(target: any) {
  console.log("decorator executed");
}

@Log
class Example {
  constructor() {
    console.log("instance created");
  }
}

// 출력 순서
// decorator executed
// instance created
```

### 흔한 오해 / 디버깅 포인트

* “인스턴스마다 데코레이터가 실행된다” → ❌
* “this에 접근할 수 있다” → ❌ (정의 시점에는 인스턴스가 없다)

---

## 데코레이터 종류는 “어디에 붙느냐”에 따라 역할이 다르다

**결론:** 데코레이터는 위치에 따라 받을 수 있는 정보가 완전히 다르다.

### 개념 정리

* **클래스 데코레이터:** 생성자 함수
* **메서드 데코레이터:** 프로토타입 + 메서드 이름 + descriptor
* **접근자 데코레이터:** getter/setter descriptor
* **속성 데코레이터:** 프로토타입 + 프로퍼티 이름 (descriptor 없음)
* **매개변수 데코레이터:** 프로토타입 + 메서드 이름 + 인덱스

```ts
function LogMethod(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  console.log(propertyKey);
}

class Example {
  @LogMethod
  run() {}
}
```

### 실무 포인트

* **속성 데코레이터는 값에 접근할 수 없다** → 메타데이터 저장용
* 실제 동작 변경은 **메서드/클래스 데코레이터**에서만 가능

---

## Decorator Factory는 “옵션을 전달하기 위한 필수 패턴”이다

**결론:** 인자를 받는 데코레이터는 항상 “함수를 한 번 더 감싼다”.

```ts
function Role(role: "admin" | "user") {
  return function (target: any) {
    target.prototype.role = role;
  };
}

@Role("admin")
class User {}
```

### 실행 순서 핵심

1. `Role("admin")` 실행 (정의 시점)
2. 반환된 함수가 실제 데코레이터로 실행

### 흔한 실수

* factory 없이 옵션을 바로 쓰려다 타입/실행 오류 발생
* factory 호출 시점과 decorator 적용 시점 혼동

---

## autobind 데코레이터는 “this 바인딩 문제”를 구조적으로 해결한다

**결론:** autobind는 이벤트 핸들러에서 `this` 유실을 막는 설계 도구다.

### autobind 구현 예제

```ts
function Autobind(
  _: any,
  _2: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  return {
    configurable: true,
    get() {
      return original.bind(this);
    }
  };
}

class ButtonHandler {
  message = "clicked";

  @Autobind
  handleClick() {
    console.log(this.message);
  }
}
```

### 대안과 비교

* **arrow function:** 간단하지만 메서드 재사용/상속 불리
* **bind in constructor:** 보일러플레이트 증가
* **decorator:** 선언적, 프레임워크 친화적

---

## validation 데코레이터는 “검증 로직”이 아니라 “검증 규칙 저장”이다

**결론:** 데코레이터는 검증을 하지 않는다. **검증 정보만 모은다.**

### 간단한 validation 메타데이터 설계

```ts
const validators: Record<string, string[]> = {};

function Required(target: any, prop: string) {
  const className = target.constructor.name;
  validators[className] = [
    ...(validators[className] ?? []),
    prop
  ];
}

class User {
  @Required
  name!: string;
}
```

```ts
function validate(obj: any): boolean {
  const rules = validators[obj.constructor.name] ?? [];
  return rules.every(prop => !!obj[prop]);
}
```

### 핵심 함정

* TypeScript 타입은 **런타임에 사라진다**
* 데코레이터만으로는 값 검증 불가
* 반드시 **별도의 validate 실행 단계**가 필요

---

## 데코레이터 남용 시 디버깅이 어려워지는 포인트 3가지

**결론:** 데코레이터는 “보이지 않는 코드”를 만든다.

1. **실행 순서 추적이 어렵다**
   * 정의 시점 실행 → 로그 위치가 예상과 다름

2. **숨은 부작용**
   * prototype 변형, descriptor 변경이 코드 밖에서 발생

3. **타입과 런타임 불일치**
   * 컴파일은 통과, 실행에서만 문제 발생

---

## 프레임워크가 데코레이터를 쓰는 구조적 이유

**결론:** 프레임워크는 “코드를 실행”하는 게 아니라 “구조를 해석”해야 한다.

### Nest / Angular 관점

* 클래스 로드 시 메타데이터 수집
* DI 컨테이너, 라우팅, validation 규칙 구성
* 이후 런타임에서는 **이미 만들어진 구조**를 사용

**핵심:**
데코레이터 = 선언적 설정 + 정적 분석 가능한 구조
→ 대규모 시스템에서 **중앙 집중 제어** 가능

---

## 실무 기준: 언제 쓰고, 언제 피하나?

**결론:** 프레임워크 경계에서는 쓰고, 비즈니스 로직에서는 피하라.

### 쓰는 경우

* DI, 라우팅, 권한, validation
* 프레임워크가 메타데이터를 소비할 때

### 피하는 경우

* 단순 유틸/비즈니스 로직
* 실행 순서가 중요한 코드
* 팀원이 데코레이터 모델에 익숙하지 않을 때

---

## 체크리스트

* [ ] 데코레이터 실행 시점을 정확히 이해하고 있는가?
* [ ] 데코레이터가 “로직”이 아니라 “정보”임을 인지했는가?
* [ ] 런타임 검증 로직이 별도로 존재하는가?
* [ ] prototype/descriptor 변경을 팀이 감당할 수 있는가?
* [ ] 프레임워크 외부 코드에 남용하고 있지 않은가?

---

## 요약 5줄

1. 데코레이터는 인스턴스가 아니라 **정의 시점**에 실행된다.
2. 데코레이터의 본질은 로직 실행이 아닌 **메타데이터 수집**이다.
3. Decorator Factory는 옵션 전달을 위한 필수 구조다.
4. validation/autobind는 구조적 문제를 해결하지만 런타임 검증은 별도다.
5. 프레임워크 경계에서는 강력하지만, 남용하면 디버깅 비용이 폭증한다.

---

## 자기점검 질문 5개

1. 데코레이터가 실행되는 정확한 시점을 설명할 수 있는가?
2. 현재 사용 중인 데코레이터는 정보를 저장하는가, 로직을 숨기는가?
3. 타입 안정성과 런타임 검증을 혼동하고 있지 않은가?
4. 이 기능은 함수/설정 객체로 대체 가능하지 않은가?
5. 팀원이 이 데코레이터 구조를 이해하지 못해도 유지보수 가능한가?

---

## 실전 미션 3개

1. 기존 이벤트 핸들러의 `bind` 코드를 autobind 데코레이터로 교체하고 비교하라.
2. validation 데코레이터 + validate 함수를 분리해 “정의/실행” 구조를 명확히 하라.
3. 사용 중인 데코레이터 하나를 제거하고, 동일 기능을 함수/설정 기반으로 재구현해보라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

