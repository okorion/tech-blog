---
title: "OpenCV 이미지 처리 연산"
description: "목적별로 픽셀·영역·통계 연산을 선택하고 전처리 파이프라인을 설계하는 실전 기준"
categories: ["🧿 OpenCV & Computer Vision"]
tags: [OpenCV, Preprocessing, Threshold, Morphology]
image: /assets/posts/2025-12-15-opencv-computer-vision/image.jpg
date: 2025-12-15 23:01:00 +09:00
last_modified_at: 2025-12-15 23:01:00 +09:00
---

## TL;DR
- OpenCV 이미지 처리는 **연산 나열**이 아니라 **목적 기반 선택** 문제다.
- 모든 처리는 `입력 상태(shape/dtype/range)`를 고정하는 것에서 시작한다.
- 연산은 크게 **픽셀 / 영역 / 통계 기반**으로 나뉜다.
- 실패 원인의 대부분은 **파라미터 감각 부족**과 **경계 효과**다.
- 전처리는 단발 연산이 아니라 **파이프라인 레시피**로 관리해야 한다.
- 이 글은 “언제 무엇을 쓰는가”를 결정하는 기준을 제공한다.

---

## 1. OpenCV 이미지 I/O의 핵심 (전처리의 출발점)

### 핵심 API와 불변 규칙
- `cv2.imread` → **BGR**, `uint8`
- `cv2.cvtColor` → 색공간 변환의 유일한 정공법
- `cv2.resize` → 연산 전에 **해상도 고정**
- `cv2.imwrite` → 디버깅 시 중간 산출물 저장 필수

> 전처리의 1단계는 **색공간과 스케일을 고정**하는 것이다.

---

## 2. 개념 지도: OpenCV 이미지 처리 연산 분류

```text
OpenCV 이미지 처리 연산
├─ 픽셀 기반 연산
│  ├─ threshold / normalization
│  └─ 밝기·대비 조정
├─ 영역 기반 연산
│  ├─ blur / smoothing
│  ├─ morphology (open / close)
│  └─ gradient / edge
└─ 통계 기반 연산
   ├─ histogram
   └─ histogram equalization
````

---

## 3. 왜 “목적별 분류”가 중요한가

같은 문제를 다른 연산으로 풀 수 있다.
문제는 **어떤 연산이 안정적인가**다.

* 노이즈 문제 → blur
* 분리 문제 → threshold + morphology
* 경계 문제 → gradient / edge
* 조명 문제 → histogram 계열

👉 **증상 → 연산 → 파라미터** 순으로 사고해야 한다.

---

## 4. 문제 상황 → 추천 연산 조합 표

| 문제 상황          | 추천 연산 조합     | 파라미터 팁   |
| ------------------ | ------------------ | ------------- |
| 노이즈 많은 이미지 | GaussianBlur       | kernel 3~7    |
| 점 노이즈          | MedianBlur         | 홀수 kernel   |
| 물체 분리          | threshold + open   | iter=1~2      |
| 구멍 메우기        | close              | kernel 크게   |
| 조명 불균형        | hist equalization  | grayscale     |
| 경계 강조          | Sobel              | ksize=3       |
| 엣지 추출          | Canny              | low/high 비율 |
| 텍스트 강조        | adaptive threshold | blockSize     |
| ROI 합성           | addWeighted        | alpha=0.5     |
| 작은 객체 제거     | open               | kernel 조정   |

---

## 5. 최소 실습: Synthetic 이미지 기반 전처리 파이프라인

### 5-1. 테스트 이미지 생성

```python
import numpy as np
import cv2

def create_synthetic():
    """
    출력: grayscale image (H, W), uint8
    """
    img = np.zeros((100, 200), dtype=np.uint8)
    cv2.rectangle(img, (30, 30), (170, 70), 200, -1)
    noise = np.random.randint(0, 30, img.shape, dtype=np.uint8)
    return cv2.add(img, noise)

img = create_synthetic()
print("orig:", img.shape, img.dtype, img.min(), img.max())
```

---

### 5-2. Blur 비교

```python
blur_g = cv2.GaussianBlur(img, (5, 5), 0)
blur_m = cv2.medianBlur(img, 5)

print("gaussian:", blur_g.min(), blur_g.max())
print("median:", blur_m.min(), blur_m.max())
```

**해석**

* Gaussian: 전체적으로 부드러움
* Median: 점 노이즈 제거에 강함

---

### 5-3. Threshold

```python
_, th_bin = cv2.threshold(blur_g, 120, 255, cv2.THRESH_BINARY)
th_adp = cv2.adaptiveThreshold(
    blur_g, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
    cv2.THRESH_BINARY, 11, 2
)

print("binary unique:", np.unique(th_bin))
print("adaptive unique:", np.unique(th_adp))
```

---

### 5-4. Morphology

```python
kernel = np.ones((3, 3), np.uint8)
opened = cv2.morphologyEx(th_bin, cv2.MORPH_OPEN, kernel)
closed = cv2.morphologyEx(th_bin, cv2.MORPH_CLOSE, kernel)

print("open sum:", opened.sum())
print("close sum:", closed.sum())
```

---

### 5-5. Edge / Gradient

```python
sobel = cv2.Sobel(blur_g, cv2.CV_64F, 1, 0, ksize=3)
edges = cv2.Canny(blur_g, 50, 150)

print("sobel:", sobel.min(), sobel.max())
print("edges:", np.unique(edges))
```

**핵심**

* Gradient는 **변화량**
* Edge는 **이진 경계**

---

## 6. 파라미터 감 잡는 규칙 (실무 기준)

* Blur kernel: 노이즈 크기 ≥ kernel
* Morphology:

  * open → 작은 객체 제거
  * close → 구멍 메우기
* Threshold:

  * 전역 → 조명 균일
  * adaptive → 조명 불균일
* Edge:

  * Canny high ≈ 2~3 × low

---

## 7. 흔한 실수 / 함정 체크리스트

1. blur 없이 threshold
2. kernel 짝수 사용
3. morphology 목적 혼동
4. grayscale 없이 histogram
5. edge를 segmentation에 사용
6. 파라미터 하드코딩
7. 이미지 스케일 미고정
8. 경계 효과 무시
9. 연산 순서 임의 변경
10. 중간 결과 미검증

---

## 섹션 요약

* OpenCV 연산은 **조합 문제**다.
* 성공하는 전처리는 항상 **목적 → 증상 → 연산** 순서를 따른다.
* 이 구조를 이해하면 연산을 외울 필요가 없다.

---

## 다음 글 / 다음 학습

➡️ **다음 글:**
`OpenCV 비디오 처리: 프레임 루프와 실시간 파이프라인`

이미지 전처리 개념은 비디오에서 **프레임 단위로 그대로 확장**된다.

---

- 참고: [OpenCV 및 딥러닝 을 이용한 Computer Vision 파이썬
](https://www.udemy.com/course/best-opencv-computer-vision/)
