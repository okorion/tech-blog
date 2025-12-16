---
title: "TypeScript에서 객체지향을 다루는 현실적인 방법 – 클래스가 답이 아닌 이유까지"
description: "TypeScript OOP를 컴파일 계약 관점에서 다루며 접근 제어, 추상화, 상속과 컴포지션 판단 기준을 설명"
categories: ["🟦 TypeScript & Language"]
tags: ["OOP", "Classes", "Interfaces", "Abstraction"]
image: /assets/posts/2025-12-16-typescript/image.png
date: 2025-12-16 13:34:00 +09:00
last_modified_at: 2025-12-16 13:34:00 +09:00
---

## 결론: TypeScript의 OOP는 “런타임 은닉”이 아니라 “컴파일 타임 계약”을 만드는 도구다

TypeScript의 클래스/OOP는 Java나 C#의 그것과 다르다. **접근 제어·추상화는 런타임 보호가 아니라 컴파일 단계의 사용 제약**이다. 따라서 목적 없이 클래스를 쓰면 복잡도만 늘고, 목적이 명확하면 강력한 설계 도구가 된다.

---

## 접근 제어자(public/private/protected/readonly)는 “컴파일 규칙”이다

**결론:** 접근 제어자는 런타임 보안이 아니라 오용을 막는 가이드다.

### 정의

* `public`: 어디서나 접근 가능(기본값)
* `private`: 클래스 내부에서만 접근 가능
* `protected`: 클래스 + 서브클래스에서 접근 가능
* `readonly`: 생성 이후 재할당 금지

### 언제 쓰나 (판단 기준)

* `private`: 내부 불변식 유지
* `protected`: 상속 확장 포인트
* `readonly`: 생성 이후 바뀌면 안 되는 식별자

### 흔한 실수 / 디버깅 포인트

* “private이니까 런타임에서 숨겨진다”는 오해 → JS로 컴파일되면 그대로 노출
* `readonly`를 불변성 보장으로 착각 → 객체 내부 변경은 막지 못함

### 예제

```ts
class User {
  public name: string;
  private password: string;
  readonly id: string;

  constructor(id: string, name: string, password: string) {
    this.id = id;
    this.name = name;
    this.password = password;
  }
}
```

---

## 생성자 축약 초기화는 편하지만, 유지보수 리스크가 있다

**결론:** 축약은 “안 바뀌는 단순 모델”에서만 써라.

### 정의

* 생성자 매개변수에 접근 제어자를 붙여 필드 선언+할당을 동시에 수행

### 언제 쓰나

* DTO, 단순 값 객체
* 필드가 적고 변경 가능성이 낮을 때

### 흔한 실수

* 비즈니스 로직이 커진 클래스에도 무분별하게 사용
* 필드가 늘어나며 생성자 시그니처가 비대해짐

### 예제

```ts
class Point {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}
}
```

**주의:** 생성자 로직이 늘어나는 순간, 축약은 가독성과 확장성을 해친다.

---

## interface vs abstract class는 “상속이냐, 계약이냐”의 선택이다

**결론:** 구현 강제가 목적이면 interface, 기본 동작 공유가 필요하면 abstract class다.

### interface

* 객체의 **형태(계약)** 만 정의
* 다중 구현 가능
* 런타임 코드 없음

### abstract class

* 일부 구현 + 확장 포인트 제공
* 단일 상속
* 런타임 코드 존재

### interface로 계약 정의 → class 구현 예제

```ts
interface Repository {
  save(data: string): void;
}

class ApiRepository implements Repository {
  save(data: string) {
    console.log("save to api", data);
  }
}
```

### abstract class로 템플릿 메서드 유사 구조

```ts
abstract class Logger {
  log(message: string) {
    const formatted = this.format(message);
    console.log(formatted);
  }

  protected abstract format(message: string): string;
}

class JsonLogger extends Logger {
  protected format(message: string) {
    return JSON.stringify({ message });
  }
}
```

### 흔한 실수

* union/type을 interface로 표현하려다 막힘
* 단순 계약인데 abstract class를 써서 상속 고정

---

## static과 getter/setter는 “경계가 명확할 때”만 가치가 있다

**결론:** 상태가 섞이는 순간 테스트와 추론이 어려워진다.

### static

* 클래스 인스턴스와 무관한 로직/상수
* 전역 상태처럼 동작할 수 있음

```ts
class MathUtil {
  static clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}
```

### getter/setter

* 값 접근 시 검증/계산이 필요한 경우

```ts
class User {
  private _age = 0;

  get age() {
    return this._age;
  }

  set age(value: number) {
    if (value < 0) throw new Error("invalid age");
    this._age = value;
  }
}
```

### 흔한 실수

* 모든 필드에 getter/setter 남발 → 추론 비용 증가
* static에 상태를 두어 테스트 격리 실패

---

## Singleton 패턴은 “편리하지만 비용이 큰 선택”이다

**결론:** 전역 상태가 필요한지부터 의심하라.

### 잘못 쓴 Singleton 예제 (문제점)

```ts
class AppState {
  private static instance: AppState;
  private data = 0;

  private constructor() {}

  static getInstance() {
    if (!this.instance) {
      this.instance = new AppState();
    }
    return this.instance;
  }

  setData(v: number) {
    this.data = v;
  }
}
```

**문제점**

* 테스트 간 상태 공유
* 의존성 주입 불가
* 숨은 전역 상태

### 개선안: 의존성으로 주입

```ts
class AppState {
  constructor(private data = 0) {}

  setData(v: number) {
    this.data = v;
  }
}

// 필요한 곳에서 명시적으로 주입
const appState = new AppState();
```

**판단 기준:** “전역으로 하나여야 한다”는 요구는 대부분 **설계 미비**다.

---

## TS에서 OOP가 과한 순간: 함수형/컴포지션이 더 낫다

**결론:** 상태 공유·상속 깊이가 늘어나면 OOP는 비용이 된다.

### OOP가 과한 신호

* 상속 계층이 3단계 이상
* `protected` 남발
* 클래스보다 헬퍼 함수가 더 많음

### 대안: 컴포지션

```ts
type Logger = (msg: string) => void;

const createService = (logger: Logger) => ({
  run() {
    logger("run");
  }
});
```

**효과:** 테스트 용이, 의존성 명시, 타입 단순화.

---

## 실무 판단 기준: 언제 class가 유리한가?

**결론:** “상태 + 생명주기 + 계약”이 동시에 필요할 때다.

* [ ] 내부 상태를 유지해야 하는가?
* [ ] 명확한 생명주기(start/stop 등)가 있는가?
* [ ] 여러 구현체를 계약으로 교체해야 하는가?
* [ ] 인스턴스 단위 테스트가 필요한가?

위 조건이 2개 이상이면 class를 고려할 가치가 있다.

---

## 체크리스트

* [ ] 접근 제어자를 런타임 보호로 착각하지 않았는가?
* [ ] 생성자 축약을 남용하고 있지 않은가?
* [ ] interface와 abstract class를 목적에 맞게 구분했는가?
* [ ] static 상태로 테스트를 오염시키지 않는가?
* [ ] Singleton이 진짜 필요한지 재검토했는가?

---

## 요약 5줄

1. TypeScript의 OOP는 컴파일 타임 계약을 만드는 도구다.
2. 접근 제어자는 런타임 은닉이 아니라 오용 방지 규칙이다.
3. interface는 계약, abstract class는 기본 구현 공유에 쓰인다.
4. static·singleton은 편리하지만 테스트와 확장성 비용이 크다.
5. 상태와 생명주기가 명확할 때만 class가 합리적이다.

---

## 자기점검 질문 5개

1. 현재 클래스는 “상태와 생명주기”를 실제로 관리하는가?
2. interface 대신 abstract class를 쓴 이유가 명확한가?
3. static 필드/메서드가 전역 상태처럼 쓰이고 있지 않은가?
4. Singleton이 테스트를 어렵게 만들고 있지 않은가?
5. 이 클래스는 함수/컴포지션으로 대체 가능하지 않은가?

---

## 실전 미션 3개

1. 상속받는 클래스 하나를 interface + 컴포지션 구조로 리팩터링하라.
2. Singleton 하나를 제거하고 의존성 주입 방식으로 바꿔 테스트를 추가하라.
3. getter/setter를 쓰는 필드를 일반 메서드로 바꿔 가독성을 비교하라.

---

- 참고: [  Typescript :기초부터 실전형 프로젝트까지 with React + NodeJS
](https://www.udemy.com/course/best-typescript-21/)

