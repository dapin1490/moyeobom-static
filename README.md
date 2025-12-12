# 모여봄 - GitHub Pages 버전

이 폴더는 GitHub Pages에 배포하기 위한 정적 사이트입니다.

## 주요 기능

### 1. People Counter (사람 수 카운팅)
- 실시간 웹캠 스트림에서 사람 탐지 및 카운팅
- 방향별 이동 추적 (좌/우/상/하)
- YOLOv8 모델 기반 정확한 인원 수 추적

### 2. Person Area Ratio (혼잡도 분석)
- 특정 영역 내 사람 밀도 분석
- 여유/보통/혼잡 상태 시각적 표시
- 실시간 혼잡도 비율 계산

### 3. Video View (동영상 분석)
- 로컬 동영상 파일 업로드 및 분석
- 동영상에서 사람 탐지 및 카운팅
- 혼잡도 분석 기능 제공

### 4. Demo Map View (데모 지도)
- 페스티벌 지도에서 각 구역의 혼잡도 확인
- 실시간 상태 표시 (여유/보통/혼잡)
- 데모 버전으로 제공

## 주요 변경 사항

### 서버 없이 동작
- Flask 서버 제거
- 모든 처리가 브라우저에서 실행
- ONNX Runtime Web을 사용한 클라이언트 사이드 AI

### 사용자 웹캠 사용
- 각 사용자의 로컬 웹캠을 사용
- 서버로 데이터 전송 없음
- 개인정보 보호 강화

### 클라이언트 사이드 처리
- 모든 AI 추론이 브라우저에서 실행
- ONNX Runtime Web을 통한 모델 실행
- 실시간 비디오 처리 및 객체 추적

## 파일 구조

```
moyeobom-static/
├── index.html              # 메인 페이지
├── count_view.html         # 사람 수 카운팅 (ONNX Runtime Web 통합)
├── area_view.html         # 혼잡도 분석 (ONNX Runtime Web 통합)
├── video_view.html        # 비디오 파일 분석
├── map_view.html          # 데모 지도 뷰
├── map_view_info.html     # 지도 정보
├── nav.html               # 네비게이션 컴포넌트
└── static/
    ├── css/               # 스타일시트
    │   ├── common.css
    │   ├── font.css
    │   ├── map_view.css
    │   └── map_view_info.css
    ├── images/            # 이미지 리소스
    ├── fonts/             # Pretendard 폰트
    ├── videos/            # 비디오 파일
    ├── favicon/           # 파비콘 및 웹 앱 매니페스트
    ├── js/                # JavaScript 파일
    │   ├── tracker.js              # 객체 추적 로직
    │   ├── yolo-onnx-detector.js   # YOLO ONNX 모델 탐지
    │   ├── video-processor-onnx.js # 비디오 처리 파이프라인
    │   ├── count-view.js           # People Counter 페이지 로직
    │   ├── area-view.js            # Person Area Ratio 페이지 로직
    │   ├── video-view.js           # Video View 페이지 로직
    │   └── nav-loader.js           # 네비게이션 로더
    └── models/
        └── yolov8n.onnx   # ONNX 모델 (필수, 약 12MB)
```

## 배포 방법

1. GitHub 저장소에 푸시
2. Settings → Pages
3. Source: `Deploy from a branch` 선택
4. Branch: `main`, Folder: `/ (root)` 선택
5. Save

## 기술 스택

- **ONNX Runtime Web**: 브라우저에서 ONNX 모델 실행 (CDN)
- **YOLOv8n**: 경량 객체 탐지 모델 (ONNX 형식)
- **Web API**:
    - `getUserMedia`: 웹캠 접근
    - `File API`: 동영상 파일 업로드
    - `Canvas API`: 비디오 프레임 처리
- **Vanilla JavaScript**: 프레임워크 없이 순수 JavaScript
- **CSS3**: 모던 UI/UX 디자인

## 주의사항

1. **모델 파일**: `static/models/yolov8n.onnx` 파일이 필요합니다 (약 12MB)
2. **웹캠 권한**: 사용자가 웹캠 권한을 허용해야 합니다
3. **HTTPS**: 웹캠 접근은 HTTPS 환경에서만 가능합니다 (GitHub Pages는 자동 제공)
4. **초기 로딩**: 첫 방문 시 모델 다운로드로 인해 시간이 걸릴 수 있습니다
5. **인터넷 연결**: ONNX Runtime Web은 CDN에서 로드되므로 인터넷 연결이 필요합니다
6. **브라우저 호환성**: 최신 브라우저 권장 (Chrome, Firefox, Edge, Safari)

## 문제 해결

### 모델 로드 실패
- 브라우저 콘솔에서 오류 확인
- 모델 파일 경로 확인
- 네트워크 탭에서 파일 다운로드 확인

### 웹캠 접근 실패
- 브라우저 권한 설정 확인
- HTTPS 연결 확인
- 다른 브라우저에서 시도
- 카메라가 다른 애플리케이션에서 사용 중인지 확인

### 성능 문제
- 모델 로딩이 느린 경우: 네트워크 연결 확인
- 프레임 레이트가 낮은 경우: 브라우저 성능 설정 확인
- 메모리 부족: 다른 탭 닫기 또는 브라우저 재시작

## 개발자 가이드

### ONNX 모델 생성
`for_engineer/` 폴더에 모델 생성 스크립트가 포함되어 있습니다:
- `generate_onnx_model.py`: YOLOv8 모델을 ONNX 형식으로 변환
- 자세한 내용은 `for_engineer/IMPLEMENTATION_STATUS.md` 참조

### 로컬 테스트
1. 로컬 웹 서버 실행 (Python 예시):
    ```bash
    python -m http.server 8000
    ```
2. 브라우저에서 `http://localhost:8000` 접속
3. HTTPS가 필요한 경우 (웹캠 테스트):
    - `mkcert` 또는 유사한 도구로 로컬 인증서 생성
    - 또는 GitHub Pages에서 테스트

