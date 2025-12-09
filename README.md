# 모여봄 - GitHub Pages 버전

이 폴더는 GitHub Pages에 배포하기 위한 정적 사이트입니다.

## 주요 변경 사항

### 서버 없이 동작
- Flask 서버 제거
- 모든 처리가 브라우저에서 실행
- ONNX Runtime Web을 사용한 클라이언트 사이드 AI

### 사용자 웹캠 사용
- 각 사용자의 로컬 웹캠을 사용
- 서버로 데이터 전송 없음
- 개인정보 보호 강화

## 파일 구조

```
moyeobom-static/
├── index.html              # 메인 페이지
├── count_view.html         # 사람 수 카운팅 (ONNX Runtime Web 통합)
├── area_view.html         # 혼잡도 분석 (ONNX Runtime Web 통합)
├── video_view.html        # 비디오 파일 분석
├── map_view.html          # 데모 지도 뷰
├── map_view_info.html     # 지도 정보
├── nav.html              # 네비게이션
└── static/
    ├── css/               # 스타일시트
    ├── images/            # 이미지
    ├── fonts/             # 폰트
    ├── videos/            # 비디오 파일
    ├── js/                # JavaScript 파일
    │   ├── tracker.js
    │   ├── yolo-onnx-detector.js
    │   └── video-processor-onnx.js
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

- **ONNX Runtime Web**: 브라우저에서 ONNX 모델 실행
- **YOLOv8**: 객체 탐지 모델
- **Web API**: 웹캠 접근 (getUserMedia)
- **Vanilla JavaScript**: 프레임워크 없이 순수 JavaScript

## 주의사항

1. **모델 파일**: `static/models/yolov8n.onnx` 파일이 필요합니다
2. **웹캠 권한**: 사용자가 웹캠 권한을 허용해야 합니다
3. **HTTPS**: 웹캠 접근은 HTTPS 환경에서만 가능합니다 (GitHub Pages는 자동 제공)
4. **초기 로딩**: 첫 방문 시 모델 다운로드로 인해 시간이 걸릴 수 있습니다

## 문제 해결

### 모델 로드 실패
- 브라우저 콘솔에서 오류 확인
- 모델 파일 경로 확인
- 네트워크 탭에서 파일 다운로드 확인

### 웹캠 접근 실패
- 브라우저 권한 설정 확인
- HTTPS 연결 확인
- 다른 브라우저에서 시도

