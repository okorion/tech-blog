---
title: "Q-Learning의 핵심 직관: Bellman, TD Error, Living Penalty, 탐험–활용, 그리고 V→Q 전환"
description: "Bellman부터 TD Error, Living Penalty, 탐험–활용까지 Q-Learning 원리를 직관적으로 정리"
categories: ["🔁 Reinforcement Learning & ANN"]
tags: [ReinforcementLearning, QLearning, TDError, Exploration]
image: /assets/posts/2025-12-15-reinforcement-learning-ann/image.jpg
date: 2025-12-15 21:41:00 +09:00
last_modified_at: 2025-12-15 21:41:00 +09:00
---

## 이 글의 목적

**핵심 요약**

* Q-Learning은 강화학습 전체의 **사고 방식 원형**이다.
* 수식보다 중요한 것은 **왜 이런 업데이트 규칙이 나왔는지**다.
* Bellman → TD Error → Q(s,a) → 탐험 전략은 하나의 흐름이다.
* 이 글을 이해하면 DQN, A3C, PPO에서 길을 잃지 않는다.

**예시**

* 게임 AI에서 “왜 저 행동을 골랐는가?”를 설명할 수 있음
* 보상 설계가 잘못됐을 때 **정책이 어떻게 망가지는지** 예측 가능

---

## 1. Bellman 방정식: 미래 가치의 재귀적 정의

### 정의

* Bellman 방정식은 “**지금의 가치는 미래 가치의 함수**”라는 원칙이다.

### 직관 (수식 없이)

**핵심 요약**

* 현재 상태의 가치는 **다음 상태가 얼마나 좋은지**에 달려 있다.
* 강화학습은 “정답”이 아니라 **예측을 반복 수정**하는 문제다.
* Bellman은 이 반복 구조를 공식화한 것이다.

**텍스트 직관**

```text
지금 상태가 좋다
= 지금 보상 + (미래에 받을 보상들의 기대값)
```

### 왜 필요했나

* 전체 미래를 한 번에 계산할 수 없기 때문
* “한 스텝 앞”만 보고 점진적으로 갱신해야 현실적인 학습이 가능

---

## 2. TD Error: 학습을 움직이는 유일한 신호

### 정의

* **TD Error(Temporal Difference Error)**
  = 예측한 가치 − 실제로 경험한 가치

### 직관

**핵심 요약**

* TD Error는 **틀린 정도**다.
* 강화학습에서 “손실 함수” 역할을 한다.
* 값이 클수록 **더 많이 수정해야 한다**는 의미다.

### 개념적 표현

```text
TD Error
= (즉시 보상 + 미래 가치 추정)
  - (현재 내가 믿고 있던 가치)
```

### 왜 중요한가

* 강화학습은 정답 라벨이 없다.
* 오직 **예측 오차(TD Error)** 만이 학습 방향을 알려준다.

---

## 3. 왜 V(s)로는 부족한가? → Q(s,a)가 필요한 이유

### 문제 제기

**핵심 요약**

* V(s)는 “상태가 좋다/나쁘다”만 말해준다.
* 하지만 실제 문제는 항상 **행동 선택**이다.
* 행동 비교가 안 되면 정책을 만들 수 없다.

### 직관적 반례

```text
상태 s는 좋다 (V(s) 높음)
하지만:
  - 행동 a1 → 바로 실패
  - 행동 a2 → 성공
V(s)는 이 차이를 말해주지 못함
```

### 해결

* **Q(s,a)** 는 “이 상태에서 이 행동을 하면 얼마나 좋은가”를 직접 평가
* 평가 + 선택을 동시에 해결

---

## 4. Living Penalty: 정책을 ‘움직이게’ 만드는 장치

### 정의

* **Living Penalty**: 살아 있는 매 스텝마다 주는 작은 음의 보상

### 직관

**핵심 요약**

* 보상이 없으면 에이전트는 **가만히 있으려 한다**.
* Living Penalty는 “빨리 끝내라”는 압박이다.
* 경로 길이와 행동 속도를 조절한다.

### 정책에 미치는 영향

| Living Penalty | 결과 정책         |
| -------------- | ----------------- |
| 없음           | 무한 배회         |
| 작음           | 신중하지만 진행   |
| 큼             | 공격적, 최단 경로 |

**예시**

* 미로 문제에서 목표까지 빠르게 가게 만들고 싶을 때 필수

---

## 5. 탐험–활용 트레이드오프와 ε-greedy

### 정의

* **탐험(Exploration)**: 새로운 행동 시도
* **활용(Exploitation)**: 지금까지 최고라고 아는 행동 선택

### ε-greedy 전략

**핵심 요약**

* 확률 ε로 랜덤 행동
* 확률 1−ε로 최적 행동
* 단순하지만 강력한 기준선

```pseudo
if random() < ε:
    action = random_action()
else:
    action = argmax_a Q(s, a)
```

### 실패 사례

* ε가 너무 작음 → 초기에 잘못 배운 정책에 고착
* ε가 너무 큼 → 끝까지 랜덤, 수렴 안 됨

---

## 6. 장난감 환경 예시: Gridworld 3-step 업데이트

### 환경 설정

* 목표 도달 시 +10
* 매 스텝 Living Penalty −1
* γ = 0.9

### Step-by-step 업데이트

| Step | 상태 | 행동 | 보상 | TD Target       | Q 업데이트 |
| ---- | ---- | ---- | ---- | --------------- | ---------- |
| 1    | s0   | a→   | −1   | −1 + 0.9·0 = −1 | Q(s0,a)=−1 |
| 2    | s1   | a↑   | −1   | −1 + 0.9·0 = −1 | Q(s1,a)=−1 |
| 3    | s2   | a→   | +10  | 10              | Q(s2,a)=10 |

**관찰**

* 보상이 뒤에서 와도 **Bellman 구조로 앞쪽 상태가 점점 수정**된다.

---

## 7. Q-Learning 업데이트 의사코드

```pseudo
initialize Q(s,a) arbitrarily

for each episode:
    s = initial_state
    while not terminal:
        choose a using ε-greedy(Q)
        s', r = env.step(a)

        td_target = r + γ * max_a' Q(s', a')
        td_error  = td_target - Q(s, a)
        Q(s, a)  += α * td_error

        s = s'
```

**구현 포인트**

* terminal 상태에서는 미래 항 제거
* α(learning rate), γ(discount)가 안정성에 결정적

---

## 8. 흔히 하는 실수 3가지와 교정

**실수 1: γ를 의미 없이 설정**

* → **교정**: 문제의 “장기성”을 반영해야 함

**실수 2: 보상을 너무 복잡하게 설계**

* → **교정**: 단순한 보상 + Living Penalty부터 시작

**실수 3: terminal 상태 처리 누락**

* → **교정**: 종료 시 미래 Q를 반드시 0으로 처리

---

## 핵심 체크리스트 (재학습용)

* [ ] Bellman을 “미래 가치의 재귀”로 설명할 수 있는가
* [ ] TD Error가 왜 유일한 학습 신호인지 이해했는가
* [ ] V(s)와 Q(s,a)의 역할 차이를 말할 수 있는가
* [ ] Living Penalty가 정책에 미치는 영향을 예측할 수 있는가
* [ ] ε-greedy 실패 조건을 알고 있는가
* [ ] Q 업데이트에서 terminal 처리를 정확히 하는가
* [ ] 이 구조가 DQN으로 어떻게 확장되는지 떠올릴 수 있는가

---

## 한 줄 요약

**Q-Learning은 수식이 아니라, “미래를 예측하고 틀린 만큼 고친다”는 사고 방식이다.**

---

- 참고: [ AI 만들기 2025: 강화학습과 인공신경망 완전정복, Agentic AI, Gen AI, RL
](https://www.udemy.com/course/best-ai-17-hours/)
