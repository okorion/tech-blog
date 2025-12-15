---
title: "DQN 실전 템플릿: Q-Network, Target Network, Replay Buffer, ε-greedy, Soft Update"
description: "대규모 상태 공간용 DQN 설계 부품과 디버깅 포인트를 묶은 실전 템플릿"
categories: ["🔁 Reinforcement Learning & ANN"]
tags: [DQN, ReplayBuffer, TargetNetwork, ReinforcementLearning]
image: /assets/posts/2025-12-15-reinforcement-learning-ann/image.jpg
date: 2025-12-15 21:42:00 +09:00
last_modified_at: 2025-12-15 21:42:00 +09:00
---

# DQN 실전 템플릿: Q-Network, Target Network, Replay Buffer, ε-greedy, Soft Update

---

## 이 글의 목적

**핵심 요약**

* DQN은 Q-Learning을 **대규모 상태 공간**으로 확장한 표준 템플릿이다.
* 핵심은 알고리즘 이름이 아니라 **불안정성을 제거하는 설계 장치들**이다.
* 이 글은 DQN을 “외워서 구현”이 아니라 **부품 조합으로 재사용**하게 만드는 데 목적이 있다.
* LunarLander 같은 환경을 기준으로 **성공/실패 판정과 디버깅 포인트**까지 정리한다.

**예시**

* 상태가 벡터/이미지로 커졌을 때 Q-table 대신 Q-network 선택
* 학습 발산 시 Target Network/Replay Buffer 점검

---

## 1. 왜 신경망이 필요한가: Q-Table의 붕괴

**정의**

* Q-Learning은 원래 `Q(s,a)` 테이블을 업데이트한다.

**핵심 요약**

* 상태 공간이 커지면 Q-table은 **메모리·샘플 측면에서 즉시 붕괴**한다.
* 연속 상태/고차원 상태에서는 테이블 기반 일반화가 불가능하다.
* 신경망은 **유사한 상태를 묶어 일반화**하는 근사기다.

**예시**

* LunarLander 상태: 8차원 실수 벡터
  → 가능한 상태 수가 사실상 무한
  → 테이블 불가, 함수 근사 필요

---

## 2. Q-Network: Q(s,a)를 근사하는 함수

**정의**

* Q-Network는 상태를 입력으로 받아 **각 행동의 Q값 벡터**를 출력하는 신경망이다.

**핵심 요약**

* 입력: 상태 `s`
* 출력: `[Q(s,a1), Q(s,a2), ...]`
* 행동 선택은 `argmax`로 분리한다.

**작동 원리 (의사코드)**

```pseudo
q_values = Q_network(state)
action = argmax(q_values)
```

**구현 포인트**

* 출력 차원 = 행동 개수
* 마지막 레이어에는 활성화 함수 사용 안 함

---

## 3. Experience Replay: 상관관계 제거 + 샘플 효율

**정의**

* Experience Replay는 경험 `(s,a,r,s')`를 **버퍼에 저장**하고 무작위로 샘플링한다.

**핵심 요약**

* 온라인 데이터는 시간적으로 강한 상관관계를 가진다.
* 무작위 샘플링은 **i.i.d. 가정에 근접**시킨다.
* 과거 경험 재사용으로 **샘플 효율이 급증**한다.

**예시**

```pseudo
memory.append((s, a, r, s'))
batch = random_sample(memory)
```

**실전 기준**

* buffer size가 너무 작으면: 최근 경험에 과적합
* 너무 크면: 최신 정책 반영 지연

---

## 4. Target Network: 왜 없으면 발산하는가

**문제**

* Q-learning은 **부트스트래핑**을 사용한다.
* 같은 네트워크로 예측값과 타깃을 동시에 쓰면 **자기 자신을 쫓아가는 구조**가 된다.

**핵심 요약**

* 타깃이 계속 움직이면 학습이 불안정해진다.
* Target Network는 **고정된 기준점**을 제공한다.
* 일정 주기 또는 soft update로만 갱신한다.

**TD Target**

```text
r + γ * max_a Q_target(s', a)
```

---

## 5. ε-greedy vs Softmax: 탐험 전략 선택 기준

**핵심 요약**

* ε-greedy: 단순, 기준선, 안정적
* Softmax: Q값 차이를 확률로 반영, 민감
* 대부분의 DQN 실전에서는 ε-greedy가 기본값이다.

### 선택 기준 표

| 전략     | 장점        | 단점        | 추천 상황        |
| -------- | ----------- | ----------- | ---------------- |
| ε-greedy | 단순/안정   | 둔감        | 대부분           |
| Softmax  | 섬세한 탐험 | 튜닝 어려움 | Q 스케일 안정 시 |

**실패 사례**

* ε 감소 너무 빠름 → 초기 오판 고착
* Softmax 온도 미조정 → 랜덤/결정론 붕괴

---

## 6. Soft Update: Target Network를 부드럽게 옮기기

**정의**

* Hard update: N step마다 통째로 복사
* Soft update: 매 스텝 조금씩 섞기

**의사코드**

```pseudo
θ_target = τ * θ_online + (1 - τ) * θ_target
```

**핵심 요약**

* τ가 작을수록 안정적, 반응 느림
* 연속 제어/불안정 환경에서 유리

---

## 7. DQN 학습 루프를 “부품”으로 분해

**핵심 요약**

* DQN은 하나의 코드가 아니라 **조립식 구조**다.
* 각 부품을 분리하면 디버깅과 재사용이 쉬워진다.

### 6–8개 핵심 모듈

1. Environment wrapper
2. Q-Network
3. Target Network
4. Replay Buffer
5. Action Selector (ε-greedy)
6. Learner (loss/optimizer)
7. Target Updater (hard/soft)
8. Logger/Visualizer

---

## 8. DQN 전체 파이프라인 (입력 → 처리 → 출력)

```text
[State]
   ↓
Q-Network
   ↓
Action Selector (ε-greedy)
   ↓
Environment Step
   ↓
Replay Buffer
   ↓
Batch Sample
   ↓
TD Target (Target Network)
   ↓
Loss / Backprop
   ↓
Q-Network Update
```

---

## 9. 재사용 가능한 코드 템플릿 구조 제안

**핵심 요약**

* 파일 단위로 역할을 고정하면 환경만 바꿔 재사용 가능

```text
dqn/
 ├─ env.py          # 환경 래퍼
 ├─ model.py        # Q-network
 ├─ replay.py       # replay buffer
 ├─ agent.py        # action/learning logic
 ├─ train.py        # training loop
 └─ config.yaml     # hyperparameters
```

---

## 10. LunarLander 기준: 성공/실패/디버깅

**성공 기준**

* 평균 reward ≥ 200 (100 에피소드 이동 평균)

**보상 구조**

* 착륙 성공: 큰 양의 보상
* 연료 사용/충돌: 패널티
* 지속 시간: 간접 보상

**주요 디버깅 포인트**

* reward가 계속 음수 → ε/보상/γ 점검
* 초반 급등 후 붕괴 → target/replay 점검
* 학습 느림 → batch/buffer/learning rate 점검

---

## 11. 핵심 하이퍼파라미터와 조정 방향

| 파라미터      | 역할        | 기본 범위   | 조정 방향     |
| ------------- | ----------- | ----------- | ------------- |
| learning rate | 학습 속도   | 1e-4 ~ 1e-3 | 발산 시 ↓     |
| gamma (γ)     | 미래 가중치 | 0.95 ~ 0.99 | 장기 목표면 ↑ |
| batch size    | 안정성      | 32 ~ 128    | 노이즈 크면 ↑ |
| buffer size   | 샘플 다양성 | 1e4 ~ 1e6   | 과적합 시 ↑   |
| τ (soft)      | 타깃 안정성 | 1e-3 ~ 1e-2 | 발산 시 ↓     |
| ε start/end   | 탐험        | 1.0 → 0.01  | 고착 시 end ↑ |

---

## 흔히 하는 오해 3가지와 교정

**오해 1**: “DQN은 그냥 Q-network 하나다”
→ **교정**: 핵심은 **Replay + Target** 이다.

**오해 2**: “학습 안 되면 네트워크를 키운다”
→ **교정**: 대부분은 **탐험/타깃/보상 문제**다.

**오해 3**: “한 번 학습되면 끝이다”
→ **교정**: DQN은 환경 변화에 매우 민감하다.

---

## 핵심 체크리스트 (재학습용)

* [ ] Q-table이 왜 무너지는지 설명 가능한가
* [ ] Replay Buffer의 두 가지 효과를 아는가
* [ ] Target Network 없을 때 발산 이유를 설명할 수 있는가
* [ ] ε-greedy 실패 조건을 경험해봤는가
* [ ] Soft update의 τ 의미를 이해했는가
* [ ] 학습 루프를 모듈 단위로 분해할 수 있는가
* [ ] LunarLander 성공 기준을 명확히 아는가

---

## 한 줄 요약

**DQN은 신경망이 아니라, 불안정한 Q-Learning을 실전에서 작동하게 만든 설계 패턴이다.**

---

- 참고: [ AI 만들기 2025: 강화학습과 인공신경망 완전정복, Agentic AI, Gen AI, RL
](https://www.udemy.com/course/best-ai-17-hours/)
