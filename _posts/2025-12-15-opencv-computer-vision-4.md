---
title: "전통적 객체 탐지·추적"
description: "템플릿·코너·컨투어·옵티컬 플로우 등 전통 CV 탐지/추적을 언제 쓰고 언제 포기할지 기준 정리"
categories: ["🧿 OpenCV & Computer Vision"]
tags: [Detection, Tracking, OpenCV, OpticalFlow]
image: /assets/posts/2025-12-15-opencv-computer-vision/image.jpg
date: 2025-12-15 23:03:00 +09:00
last_modified_at: 2025-12-15 23:03:00 +09:00
---

## TL;DR
- 전통 CV는 **강한 가정** 위에서만 안정적으로 동작한다.
- 핵심은 “무엇을 쓰느냐”가 아니라 **언제 통하고 언제 깨지는가**다.
- 탐지는 **초기화**, 추적은 **유지** 역할로 분리해야 한다.
- 실패 원인의 대부분은 조명·스케일·가림 변화다.
- 간단한 문제는 전통 CV가 **빠르고 설명 가능**하다.
- 가정이 깨지면 **즉시 딥러닝으로 전환**하는 기준을 가져야 한다.

---

## 1. 전통적 접근의 전제(가정) 정리

전통적 CV는 데이터가 아니라 **환경을 믿는다**.

```text
전통 CV의 암묵적 가정
├─ 조명: 큰 변화 없음
├─ 스케일: 객체 크기 일정
├─ 회전: 제한적
├─ 배경: 비교적 단순
└─ 노이즈: 전처리로 제거 가능
````

이 가정이 깨지는 순간, 성능은 **급격히 붕괴**한다.

---

## 2. 개념 지도: 탐지·추적 알고리즘 스펙트럼

```text
전통적 탐지 / 추적
├─ 탐지 (Detection)
│  ├─ Template Matching
│  ├─ Corner / Edge
│  ├─ Contour 기반 분할
│  ├─ Feature Matching
│  └─ Watershed
└─ 추적 (Tracking)
   ├─ Optical Flow
   ├─ MeanShift / CamShift
   └─ Tracking API (OpenCV)
```

---

## 3. 언제 통하고, 언제 깨지는가 (핵심 요약)

### Template Matching

* **통함:** 크기·회전 고정, 패턴 명확
* **깨짐:** 스케일/회전 변화, 조명 변화

### Corner / Edge

* **통함:** 구조적 형태(문서, 건축물)
* **깨짐:** 텍스처 약함, 노이즈 많음

### Contour 기반

* **통함:** 전경-배경 분리 명확
* **깨짐:** 그림자, 반사, 복잡한 배경

### Feature Matching

* **통함:** 반복 구조, 비교적 큰 객체
* **깨짐:** 저해상도, 모션 블러

### Watershed

* **통함:** 접촉 객체 분리
* **깨짐:** seed 설정 실패, 노이즈

### Optical Flow / Tracking

* **통함:** 프레임 간 변화 작음
* **깨짐:** 급격한 움직임, 가림

---

## 4. 알고리즘 선택 트리 (텍스트 플로우차트)

```text
문제 정의
├─ 객체 위치를 "한 번" 찾고 싶다
│  ├─ 형태 고정 → Template
│  ├─ 경계 명확 → Contour
│  └─ 구조적 특징 → Corner / Edge
└─ 객체를 "계속" 따라가고 싶다
   ├─ 초기 위치 있음 → Tracking
   │  ├─ 색상 기반 → MeanShift
   │  └─ 움직임 기반 → Optical Flow
   └─ 초기 위치 없음 → Detection → Tracking
```

---

## 5. 최소 실습 ①

### Contour 기반 단순 물체 분리

```python
import cv2
import numpy as np

def contour_segmentation():
    """
    출력:
    - contours 개수
    - 입력/이진 이미지 정보
    """
    img = np.zeros((120, 200), dtype=np.uint8)
    cv2.rectangle(img, (40, 30), (160, 90), 200, -1)
    noise = np.random.randint(0, 40, img.shape, dtype=np.uint8)
    img = cv2.add(img, noise)

    _, th = cv2.threshold(img, 120, 255, cv2.THRESH_BINARY)
    kernel = np.ones((3,3), np.uint8)
    clean = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print("contours:", len(contours))
    print("img:", img.shape, img.dtype, img.min(), img.max())

contour_segmentation()
```

**해석 포인트**

* 전처리가 분리 성능의 90%
* contour는 **결과 표현 수단**, 해법이 아니다

---

## 6. 최소 실습 ②

### Synthetic Optical Flow 데모

```python
import cv2
import numpy as np

def optical_flow_demo():
    """
    출력:
    - 평균 이동 벡터 크기
    """
    prev = np.zeros((100, 200), dtype=np.uint8)
    cv2.circle(prev, (60, 50), 10, 255, -1)

    next = np.zeros_like(prev)
    cv2.circle(next, (70, 50), 10, 255, -1)  # 이동

    flow = cv2.calcOpticalFlowFarneback(
        prev, next, None,
        0.5, 3, 15, 3, 5, 1.2, 0
    )

    mag, _ = cv2.cartToPolar(flow[...,0], flow[...,1])
    print("mean flow magnitude:", mag.mean())

optical_flow_demo()
```

**해석 포인트**

* Optical Flow는 “객체”가 아니라 **픽셀 이동량**
* 작은 이동, 연속 프레임에서만 신뢰 가능

---

## 7. 실패 케이스 10가지 & 대응

1. 회전 변화 → Feature/DL
2. 스케일 변화 → Pyramid/DL
3. 조명 변화 → Histogram/DL
4. 가림 → Re-detection
5. 그림자 → 색공간 분리
6. 모션 블러 → FPS/셔터
7. 배경 복잡 → DL
8. 저해상도 → 포기
9. 객체 변형 → DL
10. 카메라 이동 → 보정 필요

---

## 8. 흔한 실수 / 디버깅 체크리스트

1. 전처리 없이 탐지
2. tracking을 detection으로 해결
3. 초기화 없는 추적
4. 실패를 파라미터 탓
5. 프레임 드롭 무시
6. 알고리즘 가정 미확인
7. 결과 설명 불가
8. DL 전환 기준 없음
9. 단일 방법 고집
10. synthetic 테스트 생략

---

## 9. 딥러닝으로 넘어가야 하는 결정 규칙

```text
아래 중 2개 이상 해당 → DL 전환
- 조명/스케일 변화 큼
- 가림 빈번
- 배경 복잡
- 설명보다 성능 중요
- 라벨 데이터 확보 가능
```

---

## 섹션 요약

* 전통 CV는 “빠르고 명확하지만 조건부”다.
* 탐지와 추적을 **역할로 분리**해야 안정적이다.
* 실패 패턴을 알면, **딥러닝 전환 시점**이 보인다.

---

## 다음 글 / 다음 학습

➡️ **다음 글:**
`딥러닝 기반 컴퓨터 비전: CNN부터 YOLO까지`

전통 CV의 한계를 **딥러닝이 어떻게 대체하는지**를 구조적으로 정리한다.

---

- 참고: [OpenCV 및 딥러닝 을 이용한 Computer Vision 파이썬
](https://www.udemy.com/course/best-opencv-computer-vision/)
