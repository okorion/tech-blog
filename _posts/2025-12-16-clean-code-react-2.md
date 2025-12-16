---
title: "State 설계 함정과 원천/파생 분리"
description: "원천 상태만 두고 파생은 계산으로 처리하는 방법과 상태 모델링 체크리스트"
categories: ["🧹 React & Clean Code"]
tags: ["State", "DerivedState", "Reducer", "useRef"]
image: /assets/posts/2025-12-16-clean-code-react/image.png
date: 2025-12-16 13:17:00 +09:00
last_modified_at: 2025-12-16 13:17:00 +09:00
---

# State 설계의 모든 함정  
## — 리액트 버그의 80%는 “상태를 잘못 둔 것”에서 시작한다

---

## 1) State란 무엇이 아닌가

왜 중요한가: 상태를 “그냥 화면에 필요한 값”으로 두기 시작하면, 값이 늘수록 변경 비용이 기하급수로 증가한다.

흔한 잘못된 코드 사고:
- “화면에 보이니까 state”
- “계산하기 귀찮으니 state”
- “props로 내려오는 값도 일단 state로 복사”
- “리렌더가 무서우니 다 state로 고정”

더 나은 설계 방향:
- State는 **시간에 따라 변하는 ‘원천(source of truth)’**만 둔다.
- **파생값(derived)**은 state가 아니라 **렌더 시 계산**하거나 `useMemo` 같은 “캐시”로 처리한다.
- “화면에 필요”가 아니라 “**사용자 이벤트/비동기 결과로 변하고**, 그 변화가 UI에 영향을 준다”가 state의 조건이다.

짧은 예시:
```tsx
// ❌ 파생값을 state로 둠 (동기화 지옥 시작)
const [items, setItems] = useState<Item[]>([]);
const [filtered, setFiltered] = useState<Item[]>([]);

// ✅ 원천만 state, 파생은 계산
const [items, setItems] = useState<Item[]>([]);
const filtered = items.filter(/* ... */);
```

실무 체크리스트:

* 이 값은 **이벤트/요청 결과로 변하는가**, 아니면 계산 가능한가
* 이 값이 바뀔 때 **바뀌어야 하는 화면**을 한 문장으로 말할 수 있는가
* 동일한 의미의 값이 **두 군데 이상** 저장되고 있지 않은가(동기화 위험)
* state를 늘리면 늘릴수록 **버그 가능성이 선형이 아니라 제곱**으로 늘어난다는 걸 인지하는가
* “원천”과 “파생”을 구분해서 다이어그램(원천 → 파생)을 그릴 수 있는가

---

## 2) 초기값 설계 실수

왜 중요한가: 초기값은 단순 디폴트가 아니라, 이후 로직 전체의 분기/예외 처리를 결정한다.

흔한 잘못된 코드 사고:

* “일단 빈 문자열/0/null로 두자”
* “타입 맞추려고 억지 초기값”
* “나중에 데이터 오면 덮어쓰면 되지”

더 나은 설계 방향:

* 초기값은 “없음”을 의미해야 할 때 `null`/`undefined`를 쓰되, **도메인 의미가 명확**해야 한다.
* **로딩/에러/데이터 상태**를 한 값에 억지로 담지 말고, 상태 모델을 분리한다.
* “빈 배열”과 “아직 로딩 전”은 의미가 다르다. 이걸 섞는 순간 조건문이 늘어난다.

짧은 예시:

```tsx
// ❌ [] 가 '데이터 없음'인지 '아직 안 옴'인지 불명확
const [users, setUsers] = useState<User[]>([]);

// ✅ 명확한 상태 모델
const [users, setUsers] = useState<User[] | null>(null);
```

실무 체크리스트:

* 초기값이 **도메인 의미**를 갖는가, 단지 타입 맞추기용인가
* “로딩 전/로딩 완료(0개)/에러”를 **구분**하고 있는가
* 초기값 때문에 `if (!value)` 같은 **모호한 분기**가 늘어나지 않는가
* 초기값과 UI 표현이 **1:1로 매핑**되는가
* 상태 모델을 코드로 설명할 수 있는가(예: `null=로딩 전`, `[] = 결과 0개`)

---

## 3) 업데이트되지 않는 값의 정체 (state로 둔 ‘고정값’)

왜 중요한가: 업데이트가 없는 state는 유지보수 관점에서 “거짓 정보”다. 상태로 보이지만 상태가 아니다.

흔한 잘못된 코드 사고:

* “props로 받은 값도 state에 넣어두면 편하겠지”
* “초기 한 번만 쓰니까 state로”
* “나중에 바뀔 수도 있으니까 미리 state로”

더 나은 설계 방향:

* 한 번만 정해지고 안 바뀌는 값은 `const` 또는 `useMemo`가 맞다.
* props를 state로 복사하는 순간 **동기화 문제**가 생긴다(“왜 최신이 아니지?”).
* 정말로 “처음 값만 필요”하면 의도를 코드로 드러낸다.

짧은 예시:

```tsx
// ❌ props를 state로 복사: 동기화 누락 위험
const [name, setName] = useState(props.name);

// ✅ 파생이면 그냥 사용
const name = props.name;

// ✅ '처음 값만'이면 의도 표시
const initialNameRef = useRef(props.name);
```

실무 체크리스트:

* 이 state는 실제로 `setState`가 호출되는가(호출 안 되면 의심)
* props 복사가 필요한 이유를 설명할 수 있는가(대부분 불필요)
* “처음 값만”이 필요하면 `useRef`로 의도를 표현했는가
* 동기화가 필요하다면, 그 책임(언제/누가)을 명확히 했는가
* 상태의 생명주기(초기화/갱신/폐기)를 말로 설명할 수 있는가

---

## 4) Flag state가 늘어날 때의 비용

왜 중요한가: boolean 플래그는 늘어날수록 조합이 폭발한다. 조합은 곧 버그다.

흔한 잘못된 코드 사고:

* “모달 열림/닫힘, 로딩, 에러… 그냥 boolean 여러 개 두자”
* “일단 필요한 것부터 추가하자”
* “상태가 많아도 어차피 동작하면 OK”

더 나은 설계 방향:

* boolean이 3개만 넘어가도 **상태 조합(2^n)**을 의식해야 한다.
* “서로 배타적인 상태”라면 boolean 여러 개가 아니라 **단일 enum/state machine**이 맞다.
* 플래그가 ‘원인’인지 ‘결과’인지 구분한다. 결과 플래그는 파생이다.

짧은 예시:

```tsx
// ❌ 조합 지옥
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);

// ✅ 배타 상태는 하나로
type Status = "idle" | "loading" | "success" | "error";
const [status, setStatus] = useState<Status>("idle");
```

실무 체크리스트:

* boolean이 3개 이상이면 “상태 조합표”를 그려봤는가
* 서로 배타인지(동시에 true가 되면 안 되는지) 점검했는가
* 상태가 “원인”인지 “결과”인지 구분했는가(결과면 파생 가능)
* 로딩/성공/에러는 `status` 하나로 표현할 수 있는가
* 플래그 추가가 “빠른 해결”이 아니라 “미래 부채”임을 인지하는가

---

## 5) useState vs useRef 판단 기준

왜 중요한가: 렌더링과 무관한 값을 state로 두면 불필요한 리렌더/복잡도가 발생한다.

흔한 잘못된 코드 사고:

* “값 저장은 다 useState”
* “렌더링 다시 되는 게 무서워서 다 useRef”
* “둘 차이를 체감 못하니 아무거나”

더 나은 설계 방향:

* **UI에 영향을 주면 useState**, UI와 무관한 내부 보관이면 `useRef`.
* `useRef`는 값이 바뀌어도 렌더를 트리거하지 않는다. 즉 **화면을 바꾸는 값**을 ref로 두면 화면이 안 바뀐다.
* 대표적 ref 용도: 타이머 id, 이전 값 보관, 외부 라이브러리 인스턴스, “초기값 고정”.

짧은 예시:

```tsx
// ✅ 이전 값 보관
const prevQueryRef = useRef<string | null>(null);

// ✅ 렌더에 영향을 주는 값은 state
const [query, setQuery] = useState("");
```

실무 체크리스트:

* 이 값 변경이 화면에 반영돼야 하는가? (Yes → state)
* 렌더링 사이에 값을 “기억”만 하면 되는가? (Yes → ref)
* ref로 둔 값을 화면에서 쓰고 있지 않은가(업데이트 안 보임)
* state로 둔 값이 사실 렌더와 무관하지 않은가(불필요 리렌더)
* “왜 state/왜 ref”를 한 문장으로 설명할 수 있는가

---

## 6) 연관된 상태를 다루는 단계별 전략 (제거 → 단순화 → 구조화)

왜 중요한가: 연관 상태는 방치하면 ‘동기화 책임’이 코드 전체로 퍼진다.

흔한 잘못된 코드 사고:

* 상태가 꼬이면 “또 state 추가”로 해결
* 여기저기서 setState를 호출해 우연히 맞추기
* 연관된 값들이 서로를 참조하며 순환

더 나은 설계 방향(3단계):

1. **제거**: 파생 상태를 없애고 원천만 남긴다.
2. **단순화**: 여러 boolean 조합을 단일 status로 합친다.
3. **구조화**: 그래도 복잡하면 객체/리듀서로 “변경 규칙”을 중앙화한다.

짧은 예시:

```tsx
// ✅ 원천 + 파생 분리
const [items, setItems] = useState<Item[]>([]);
const [query, setQuery] = useState("");
const filtered = items.filter(i => i.name.includes(query));
```

실무 체크리스트:

* 파생 상태를 먼저 제거했는가(“계산으로 대체 가능?”)
* 상태가 많아지는 이유가 “동기화” 때문 아닌가
* 배타 상태는 enum으로 합쳤는가
* 업데이트 규칙이 한 곳에 모여 있는가
* 상태 변경 흐름이 “한 방향”으로 읽히는가

---

## 7) useReducer 도입 시점

왜 중요한가: state가 “값”이 아니라 “규칙”이 되는 순간, useState는 흩어진다.

흔한 잘못된 코드 사고:

* “복잡하니까 그냥 useReducer(이유 없음)”
* “useState 너무 많으니 reducer(근본 해결 아님)”
* reducer를 도입했는데 액션이 난잡해짐

더 나은 설계 방향:

* 다음 조건이면 reducer를 고려한다:

  * 상태가 여러 값이고 **함께 바뀌는 경우**가 많다
  * 업데이트가 이벤트 중심이고 **규칙(전이)**이 있다
  * setState 호출이 파일 곳곳에 흩어져 추적이 어렵다
* reducer는 “상태 저장”이 아니라 **상태 전이 규칙의 중앙화**다.

짧은 예시:

```tsx
type Action =
  | { type: "REQUEST" }
  | { type: "SUCCESS"; payload: User[] }
  | { type: "ERROR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "REQUEST": return { ...state, status: "loading" };
    case "SUCCESS": return { status: "success", users: action.payload };
    case "ERROR": return { ...state, status: "error" };
  }
}
```

실무 체크리스트:

* 상태 변경 규칙을 한 군데로 모아야 하는가
* 여러 state를 “같이” 업데이트하는 케이스가 반복되는가
* 이벤트(액션) 목록이 명확히 정의 가능한가
* reducer 도입이 “정리”가 아니라 “규칙 모델링”인지 확인했는가
* 액션 이름이 UI가 아니라 **도메인 사건**을 표현하는가

---

## 8) Custom Hook으로 상태 로직 분리

왜 중요한가: 상태 로직이 컴포넌트에 섞이면 재사용이 아니라 “복사-붙여넣기”가 된다.

흔한 잘못된 코드 사고:

* 컴포넌트가 데이터 패칭/상태/렌더를 다 한다
* 비슷한 로직이 여러 컴포넌트에 퍼짐
* 훅으로 뽑았는데 내부 구현이 더 복잡해짐(의도 불명확)

더 나은 설계 방향:

* Custom Hook은 “코드를 줄이는 도구”가 아니라 **책임을 분리하는 인터페이스**다.
* 반환값은 단순해야 한다: `state`, `actions`, (필요 시) `derived`.
* 훅 내부에서 무엇이 원천이고 무엇이 파생인지 유지한다.

짧은 예시:

```tsx
function useUsers() {
  const [status, setStatus] = useState<Status>("idle");
  const [users, setUsers] = useState<User[]>([]);
  const fetchUsers = async () => { /* ... */ };
  return { status, users, fetchUsers };
}
```

실무 체크리스트:

* 훅 이름만으로 책임이 드러나는가 (`useUsers`, `useModal`)
* 반환값이 “상태+행동”으로 정리돼 있는가
* 훅을 쓰는 쪽이 내부 구현을 몰라도 되는가
* 파생값을 훅 안에서 계산해 제공할지, 밖에서 계산할지 기준이 있는가
* 로직 중복을 제거했는가, 아니면 복잡도만 이동했는가

---

## 정리: “State는 많을수록 위험하다”를 판단 기준으로 바꾸면

* 원천(state)과 파생(계산)을 분리하라
* boolean 플래그 조합을 의식하라
* 렌더와 무관한 값은 ref로 격리하라
* 규칙이 생기면 reducer로 중앙화하라
* 로직이 반복되면 custom hook으로 책임을 분리하라

이걸 못 지키면 “기능은 되는데 유지보수가 안 되는 React”가 된다.

---

- 참고: [ 클린코드 리액트(React)
](https://www.udemy.com/course/clean-code-react/)
