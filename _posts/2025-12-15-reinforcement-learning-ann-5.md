---
title: "A3C의 핵심: Actor–Critic, Advantage, 비동기 학습, 멀티 환경, (선택) LSTM"
description: "Actor–Critic 분리, 비동기 워커, 멀티 환경, LSTM 활용까지 A3C 핵심을 압축 정리"
categories: ["🔁 Reinforcement Learning & ANN"]
tags: [A3C, ActorCritic, Advantage, ReinforcementLearning]
image: /assets/posts/2025-12-15-reinforcement-learning-ann/image.jpg
date: 2025-12-15 21:44:00 +09:00
last_modified_at: 2025-12-15 21:44:00 +09:00
---

## 이 글의 목적

**핵심 요약**

* A3C는 Value-based 한계를 넘어 **정책을 직접 학습**하면서도 안정성을 확보한 구조다.
* 핵심은 알고리즘 이름이 아니라 **역할 분리(Actor/Critic) + 비동기 수집**이다.
* 멀티 환경과 비동기 워커로 **샘플 상관관계를 구조적으로 제거**한다.
* 부분 관측 문제에서는 LSTM이 성능의 분기점이 된다.

**예시**

* 단일 환경에서 정체되던 학습이 멀티 워커로 즉시 진전
* 같은 보상 구조에서 DQN 대비 더 빠른 수렴

---

## 1. Actor–Critic: 왜 역할을 분리하는가

### 정의

* **Actor**: 상태에서 행동을 샘플링하는 정책 ( \pi(a|s) )
* **Critic**: 상태(또는 상태-행동)의 가치를 평가 ( V(s) ) 또는 ( Q(s,a) )

**핵심 요약**

* 정책을 직접 학습하면 분산이 커진다.
* Critic은 Actor의 업데이트를 **안정화하는 기준선** 역할을 한다.
* 평가(가치)와 제어(정책)를 분리해 **학습 신호의 품질**을 높인다.

**직관**

```text
Actor: 지금 이 행동을 할까?
Critic: 그 선택이 평균적으로 좋은가?
→ Critic의 피드백으로 Actor가 덜 흔들린다
```

**왜 필요했나**

* 순수 Policy Gradient는 변동성이 커 수렴이 느리다.
* Value-only는 연속 행동/확률적 정책에 취약하다.

---

## 2. Advantage: 왜 기준선(baseline)이 필요한가

### 정의

* **Advantage**: 특정 행동이 평균 대비 얼마나 나았는지
* 보통 ( A(s,a) = R - V(s) ) (직관적 형태)

**핵심 요약**

* 보상 (R) 그대로 쓰면 분산이 크다.
* 기준선 (V(s))를 빼면 **불필요한 변동을 제거**한다.
* “평균보다 나았는가?”만 학습 신호로 남긴다.

**예시**

```text
보상 R = 10
평균 기대 V(s) = 8
Advantage = +2 → 강화
```

**구현 포인트**

* Advantage 정규화(normalization)로 안정성 추가
* Critic 품질이 곧 Actor 성능 상한

---

## 3. A3C 비동기 구조: 여러 워커가 동시에 경험을 모은다

### 정의

* **A3C(Asynchronous Advantage Actor-Critic)** 는 다수의 워커가
  각자 환경을 돌며 **동시에 경험을 수집·학습**한다.

**핵심 요약**

* 시간적으로 상관된 샘플 문제를 **구조적으로 제거**한다.
* Replay Buffer 없이도 안정적인 학습이 가능하다.
* CPU 병렬화를 활용해 **벽시계 시간(wall-clock)** 기준 학습 가속.

**직관**

```text
Worker 1: 경험 수집 → 그래디언트
Worker 2: 경험 수집 → 그래디언트
Worker 3: 경험 수집 → 그래디언트
→ 중앙 파라미터에 비동기 업데이트
```

**왜 필요했나**

* DQN의 Replay/Target 복잡도를 줄이고
* On-policy 정책 학습을 실용적으로 만들기 위해

---

## 4. 멀티 환경(EnvBatch)의 이점

**정의**

* 하나의 프로세스에서 **여러 환경 인스턴스**를 동시에 스텝

**핵심 요약**

* 샘플 다양성 증가 → 탐험 향상
* 단일 환경의 국소 패턴 과적합 감소
* GPU/CPU 자원 활용도 개선

**비교**

| 방식      | 장점      | 단점        |
| --------- | --------- | ----------- |
| 단일 환경 | 구현 단순 | 상관관계 큼 |
| 멀티 환경 | 안정·빠름 | 관리 복잡   |

**실전 기준**

* 환경이 가볍다면 EnvBatch 우선
* 무거우면 워커 수를 줄이고 rollout 길이 조정

---

## 5. (선택) LSTM: 왜 붙이는가

### 정의

* **LSTM**은 과거 정보를 내부 상태로 유지하는 순환 구조

**핵심 요약**

* 관측이 불완전하면 현재 상태만으로 결정이 어렵다.
* LSTM은 **속도/방향/패턴** 같은 숨은 정보를 축적한다.
* 프레임 스택으로 부족한 경우 성능 차이를 만든다.

**예시**

* 쿵푸 마스터에서 적의 공격 타이밍 예측
* 동일 프레임이라도 이전 움직임에 따라 대응이 달라짐

**구현 포인트**

* rollout 단위로 hidden state 관리
* 초기화/리셋 타이밍 명확화

---

## 6. A3C 학습 루프 의사코드

```pseudo
initialize global Actor, Critic parameters

for each worker in parallel:
    sync local params from global
    s = env.reset()
    for t in rollout:
        a ~ π(a|s)
        s', r = env.step(a)
        store (s, a, r)
        s = s'

    compute returns R
    compute Advantage A = R - V(s)
    compute gradients (Actor + Critic)
    async update global params
```

**구현 포인트**

* rollout 길이 너무 길면 on-policy 붕괴
* 너무 짧으면 분산 증가

---

## 7. DQN vs A3C 비교

| 항목        | DQN            | A3C              |           |
| ----------- | -------------- | ---------------- | --------- |
| 학습 대상   | Q(s,a)         | π(a              | s) + V(s) |
| 행동 공간   | 이산           | 이산/연속        |           |
| 안정성 장치 | Replay, Target | Advantage, Async |           |
| 샘플 효율   | 높음           | 중간             |           |
| 구현 난이도 | 중             | 높음             |           |
| 멀티 환경   | 선택           | 핵심             |           |

**선택 기준**

* 이산·단순 → DQN
* 연속·복잡·정책 중심 → A3C

---

## 8. 쿵푸 마스터 환경: 성공 기준과 튜닝

**성공 기준**

* 평균 reward의 **지속적 상승**
* 공격/회피 패턴의 **안정적 반복**
* 에피소드 길이 증가

**튜닝 우선순위**

1. Advantage 정규화 여부
2. rollout length
3. 워커 수
4. learning rate(Actor/Critic 분리 권장)
5. (선택) LSTM 사용 여부

---

## 흔히 하는 오해 3가지와 교정

**오해 1**: “A3C는 DQN의 상위호환이다”
→ **교정**: 문제 구조가 다르다. 선택의 문제다.

**오해 2**: “워커 수를 늘리면 무조건 좋다”
→ **교정**: 그래디언트 노이즈가 커질 수 있다.

**오해 3**: “LSTM은 항상 성능을 올린다”
→ **교정**: 부분 관측이 아닐 땐 오히려 불안정하다.

---

## 핵심 체크리스트 (재학습용)

* [ ] Actor와 Critic의 역할을 명확히 구분하는가
* [ ] Advantage의 목적을 분산 감소로 설명할 수 있는가
* [ ] 비동기 워커 구조를 그림 없이 설명할 수 있는가
* [ ] 멀티 환경의 효과를 데이터 관점에서 이해했는가
* [ ] LSTM이 필요한 조건을 판단할 수 있는가
* [ ] rollout 길이와 워커 수의 트레이드오프를 아는가
* [ ] DQN 대신 A3C를 선택할 이유를 말할 수 있는가

---

## 한 줄 요약

**A3C는 “정책을 직접 배우되, 분산과 상관관계를 구조적으로 제거한” 실전형 강화학습 설계다.**

---

- 참고: [ AI 만들기 2025: 강화학습과 인공신경망 완전정복, Agentic AI, Gen AI, RL
](https://www.udemy.com/course/best-ai-17-hours/)
