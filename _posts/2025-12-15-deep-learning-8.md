---
title: "추천 시스템의 두 갈래:"
description: "RBM/에너지 기반과 Stacked AutoEncoder 관점으로 추천 시스템 행렬 복원 접근을 비교 정리"
categories: ["🧬 Deep Learning"]
tags: [Recommendation, AutoEncoder, RBM, MatrixFactorization]
image: /assets/posts/2025-12-15-deep-learning/image.jpg
date: 2025-12-15 21:57:00 +09:00
last_modified_at: 2025-12-15 21:57:00 +09:00
---

## TL;DR

* 추천 시스템의 본질은 **“유저–아이템 행렬의 빈칸을 어떻게 채울 것인가”**다.
* RBM은 **확률·에너지 관점**에서, AutoEncoder는 **표현학습 관점**에서 접근한다.
* RBM은 이론적으로 깔끔하지만 **학습 난이도와 운영 복잡도**가 높다.
* Stacked AutoEncoder는 **구현·확장·실무 적용**에서 더 현실적이다.
* Contrastive Divergence는 “정확한 확률 계산이 불가능해서 쓰는 근사”다.
* 실제 추천 성능은 모델보다 **implicit feedback 처리·cold start·metric@K**에서 갈린다.
* Netflix Prize 이후, 산업 표준은 점점 **AE → 딥러닝 기반 하이브리드**로 이동했다.

---

## 전체 지도: 추천 시스템은 딥러닝에서 어디에 위치하는가

**한 문장 요약:** 추천 시스템은 “분류/회귀”가 아니라 **행렬 복원(matrix completion)** 문제다.

딥러닝 관점에서 추천 모델의 계보는 다음 흐름을 가진다.

```
협업 필터링
 ├─ Matrix Factorization
 ├─ RBM (에너지 기반, 확률 모델)
 └─ AutoEncoder (표현학습)
     └─ Stacked / Deep AutoEncoder
```

* ANN/CNN/RNN과 달리:

  * 입력은 이미지나 시계열이 아니라 **유저×아이템 행렬**
  * 출력은 클래스가 아니라 **선호 점수**
* Netflix Prize는 이 영역을 “딥러닝 문제”로 끌어올린 대표 사건이다.

---

## 핵심 개념: 왜 추천 시스템은 특별한가

### 1) 추천 문제의 본질

**한 문장 요약:** 추천은 “안 본 것 = 싫음”이 아니라 **“모름”**이다.

* 유저-아이템 행렬:

  * 대부분 비어 있음(sparse)
  * 관측되지 않은 값은 0이 아니라 unknown
* 목표:

  * 관측된 선호 패턴으로
  * 비어 있는 칸을 합리적으로 추정

**미니 사례:**
넷플릭스에서 영화를 안 봤다고 해서
→ 싫어한다고 가정하면 추천은 망한다.

---

## 두 갈래의 접근: RBM vs AutoEncoder

### 1) RBM(Restricted Boltzmann Machine)

**한 문장 요약:** RBM은 “선호 패턴을 확률 분포로 모델링”한다.

* 에너지 기반 모델:

  * 낮은 에너지 = 높은 확률
* 구조:

  * Visible layer: 유저-아이템 입력
  * Hidden layer: 잠재 요인
* 목표:

  * 관측 데이터의 확률을 최대화

---

### 2) AutoEncoder / Stacked AutoEncoder

**한 문장 요약:** AutoEncoder는 “입력을 잘 복원하도록 압축 표현을 학습”한다.

* 구조:

  * Encoder: 고차원 → 저차원
  * Decoder: 저차원 → 원래 차원
* 추천에서의 해석:

  * 입력: 일부만 채워진 선호 벡터
  * 출력: 전체 선호 벡터 복원

---

## RBM vs AutoEncoder 비교 (핵심 표)

| 구분        | RBM                | Stacked AutoEncoder |
| ----------- | ------------------ | ------------------- |
| 입력 형태   | 유저–아이템 행렬   | 유저–아이템 행렬    |
| 관점        | 확률 / 에너지 기반 | 표현학습 / 재구성   |
| 목적함수    | 로그 가능도(근사)  | 재구성 오차         |
| 학습 난이도 | 높음 (CD 필요)     | 비교적 낮음         |
| 구현 복잡도 | 큼                 | 중                  |
| 장점        | 이론적 우아함      | 실무 친화, 확장성   |
| 단점        | 불안정, 느림       | 확률 해석 약함      |
| 실무 채택   | 낮음               | 높음                |

**한 줄 결론:**

> “연구적 흥미는 RBM, 실무적 효율은 AutoEncoder”

---

## 작동 원리: RBM과 AE는 어떻게 학습되는가

### 1) RBM 학습과 Contrastive Divergence

**한 문장 요약:** CD는 “정확한 확률 계산이 불가능해서 쓰는 타협”이다.

#### 왜 근사가 필요한가

* RBM의 목표는:

  * 전체 데이터 분포에 대한 **정확한 확률 계산**
* 문제:

  * 모든 상태의 확률 합(정규화 상수) 계산 불가능

#### Contrastive Divergence 직관

1. 실제 데이터에서 시작
2. 짧은 Gibbs Sampling 수행
3. “진짜 데이터 vs 짧게 샘플된 가짜 데이터” 차이를 줄임

**비유:**
전체 산맥의 높이를 정확히 재려다 포기하고,
“현재 위치에서 몇 발자국만 왔다 갔다” 하며 대략적인 경사를 추정하는 것.

---

### 2) Stacked AutoEncoder 학습

**한 문장 요약:** AE는 “입력을 스스로 잘 복원하도록 학습”한다.

* 손실:

  * 관측된 항목에 대해서만 재구성 오차 계산
* 스택:

  * 얕은 AE를 쌓아 점점 추상적인 표현 학습
* 결과:

  * 유저/아이템의 잠재 표현(latent representation)

---

## 구현 체크리스트 (추천 시스템 기준)

### 데이터

* [ ] 유저–아이템 행렬 구성
* [ ] 결측값 처리 전략 명확화(0 vs mask)
* [ ] implicit/explicit 구분

### 모델

* [ ] RBM: hidden unit 수 보수적으로
* [ ] AE: bottleneck 크기 점진 조정
* [ ] Stacked 시 과적합 점검

### 학습

* [ ] RBM: CD step 수 제한
* [ ] AE: dropout/정규화
* [ ] 조기 종료 필수

### 평가

* [ ] 전체 정확도 사용 금지
* [ ] Top-K 기반 평가

### 디버깅

* [ ] 인기 아이템만 추천하는지 확인
* [ ] cold user/ item 처리 확인

---

## 실전 적용: Netflix Prize 맥락에서 배우는 교훈

**한 문장 요약:** 추천 시스템의 성능은 “모델”보다 “설계”에서 갈린다.

### 실제 추천에서 중요한 체크리스트

#### 1) Implicit Feedback

* 클릭/시청/구매는 “선호 신호”
* 미관측은 부정 신호가 아님
* 가중치/마스킹 필요

#### 2) Cold Start

* 신규 유저/아이템은 정보 없음
* 콘텐츠 기반/규칙 기반과 결합 필요

#### 3) 평가 Metric@K

* Precision@K, Recall@K, NDCG@K
* “맞췄나?”가 아니라 **“상위 K에 있나?”**

---

## 흔한 함정 TOP 7 + 해결책

1. **미관측 = 0으로 처리**
   → 해결: mask 또는 가중치 처리

2. **RMSE만 보고 성능 판단**
   → 해결: Top-K metric 병행

3. **RBM을 실무 표준으로 착각**
   → 해결: AE 기반부터 검토

4. **Cold start 무시**
   → 해결: 하이브리드 전략 필수

5. **인기 편향(popularity bias)**
   → 해결: 정규화/재가중

6. **추천 다양성 무시**
   → 해결: diversity 지표 고려

7. **모델 성능 = 비즈니스 성과 착각**
   → 해결: CTR/전환율과 연결 검증

---

## 미니 Q&A

1. **RBM을 배울 가치가 있나?**
   개념 이해에는 있다. 실무 채택은 드물다.

2. **AE만으로 충분한가?**
   중소 규모 문제에서는 충분하다.

3. **Netflix Prize 이후 표준은?**
   딥러닝 기반 AE + 하이브리드 접근.

4. **추천은 지도학습인가?**
   아니다. 행렬 복원 문제다.

5. **요즘은 뭘 쓰나?**
   AE 계열 + sequence 모델 + 비즈니스 룰 조합.

---

- 참고: [딥러닝의 모든 것 with Python, Tensorflow, Pytorch
](https://www.udemy.com/course/best-artificial-neural-networks/)
