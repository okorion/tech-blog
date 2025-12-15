---
title: "딥러닝 기반 Computer Vision"
description: "분류·검출·분할 문제 정의부터 YOLO 파이프라인까지 딥러닝 CV를 역할 분리로 정리"
categories: ["🧿 OpenCV & Computer Vision"]
tags: [ComputerVision, CNN, YOLO, Detection]
image: /assets/posts/2025-12-15-opencv-computer-vision/image.jpg
date: 2025-12-15 23:04:00 +09:00
last_modified_at: 2025-12-15 23:04:00 +09:00
---

## TL;DR
- 딥러닝 CV의 핵심은 **모델 종류가 아니라 문제 유형의 구분**이다.
- 분류·검출·분할은 **출력 형태와 평가 기준**이 다르다.
- CNN은 “판별기”가 아니라 **특징 추출기**다.
- 데이터 파이프라인이 성능의 절반 이상을 결정한다.
- YOLO는 속도를 위해 **단일 패스 검출**을 선택한 구조다.
- 실무에서는 전통 CV와 DL을 **전·후처리로 결합**해야 한다.

---

## 1. CV 관점에서 필요한 ML/DL 최소 개념

### 문제 유형의 차이
- **분류(Classification)**: 이미지 → 하나의 라벨
- **검출(Detection)**: 이미지 → (bbox, class, score)
- **분할(Segmentation)**: 이미지 → 픽셀 단위 라벨

### Metric과 데이터 불균형
- accuracy는 **대부분 쓸모없다**
- 검출/분류에서는:
  - precision: 거짓 양성 억제
  - recall: 놓침 억제
  - F1: 균형 지표
- 불균형 데이터에서는 **recall 저하가 먼저 발생**

---

## 2. 개념 지도: 딥러닝 기반 CV 구조

```text
딥러닝 기반 CV
├─ 문제 정의
│  ├─ 분류
│  ├─ 검출
│  └─ 분할
├─ 모델
│  ├─ CNN (feature extractor)
│  └─ Detection Head
├─ 데이터
│  ├─ train / val / test
│  └─ augmentation
└─ 시스템
   ├─ 전처리 (CV)
   ├─ 추론 (DL)
   └─ 후처리 (CV/Tracking)
````

---

## 3. CNN은 무엇을 하는가 (직관 중심)

CNN은 “이미지를 이해”하지 않는다.
**국소 패턴을 점점 추상화**할 뿐이다.

* 초기: 엣지/코너
* 중간: 텍스처/부품
* 후반: 객체 수준 패턴

👉 그래서 CNN은 **전통 CV의 자동화된 특징 추출기**다.

---

## 4. MNIST / CIFAR의 진짜 의미

* 목적: **모델 구조와 학습 파이프라인 검증**
* 실무와 다른 점:

  * 데이터 깨끗함
  * 라벨 명확
* 실무 핵심은:

  * train/val 분리
  * overfitting 감시
  * augmentation 전략

### 전이학습 체크포인트

* 데이터 1k 미만 → 필수
* backbone freeze → head만 학습
* domain gap 크면 성능 급락

---

## 5. YOLO v3: 왜 등장했는가

### 기존 문제

* Region Proposal 기반 → 느림
* 다단계 파이프라인 → 복잡

### YOLO 선택

* **단일 패스**
* grid 기반 예측
* 속도 우선 설계

### 출력 해석

* bbox (x, y, w, h)
* confidence
* class probability
* NMS로 중복 제거

---

## 6. 문제 유형별 추천 접근 표

| 문제           | 추천 접근            | 이유      |
| -------------- | -------------------- | --------- |
| 단일 객체 분류 | CNN                  | 단순      |
| 다중 객체 위치 | YOLO                 | 속도      |
| 정밀 경계      | Segmentation         | 픽셀 단위 |
| 실시간 추적    | Detection + Tracking | 안정성    |
| 단순 환경      | 전통 CV              | 빠름      |

---

## 7. YOLO 추론 파이프라인 (의사코드)

```text
입력 이미지
→ resize / normalize
→ DNN forward
→ raw detections
→ confidence threshold
→ NMS
→ bbox + class 출력
```

### 최소 실행 코드 (Mock 구조)

```python
import numpy as np

def yolo_inference_mock(image):
    """
    입력: image (H, W, 3)
    출력: detections list
    """
    H, W, _ = image.shape
    detections = [
        {"bbox": [0.3*W, 0.3*H, 0.4*W, 0.4*H],
         "class": "object",
         "score": 0.85}
    ]
    return detections

img = np.zeros((416, 416, 3), dtype=np.uint8)
print(yolo_inference_mock(img))
```

**해석 포인트**

* 실제 YOLO도 구조는 동일
* 성능 차이는 **전처리·threshold·NMS**에서 발생

---

## 8. 전통 CV + DL 결합 구조

```text
입력 프레임
→ 전통 CV 전처리 (resize, ROI)
→ DL 추론 (YOLO)
→ 후처리 (NMS, smoothing)
→ 추적 (tracking)
```

* DL은 **결정**
* CV는 **안정화**

---

## 9. 실무 체크리스트 (12+)

1. 라벨 정의 명확한가
2. 클래스 불균형 존재?
3. val set 누수 없음?
4. metric 적절?
5. augmentation 과도?
6. input scale 일관?
7. threshold 근거 있음?
8. NMS 파라미터 검증?
9. FPS 측정 분리?
10. 추론 실패 대비?
11. 배포 환경 고려?
12. 재학습 전략?
13. 로그/모니터링?

---

## 10. 캡스톤으로 이어지는 최소 프로젝트 설계

**목표:** 실시간 객체 검출 + 추적

* 입력: 비디오
* 전처리: resize + grayscale 보조
* 검출: YOLO
* 유지: tracking
* 출력: bbox + ID

👉 이 구조 하나면 **CV 전 범위**를 관통한다.

---

## 섹션 요약

* 딥러닝 CV는 **역할 분리**가 핵심이다.
* YOLO는 만능이 아니라 **속도 최적화 도구**다.
* 전통 CV와 결합할 때 실무 품질이 나온다.

---

- 참고: [OpenCV 및 딥러닝 을 이용한 Computer Vision 파이썬
](https://www.udemy.com/course/best-opencv-computer-vision/)
