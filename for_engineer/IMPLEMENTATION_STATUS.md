# 구현 상태

## ✅ 완료된 작업

### 1. ONNX 모델 생성 스크립트
- `generate_onnx_model.py` 작성 완료
- YOLOv8n 모델을 ONNX로 변환

### 2. JavaScript 구현
- `static/js/tracker.js` - 객체 추적 로직
- `static/js/yolo-onnx-detector.js` - ONNX 모델 탐지
- `static/js/video-processor-onnx.js` - 비디오 처리 파이프라인

### 3. 정적 HTML 변환
- ✅ `docs/index.html` - 메인 페이지
- ✅ `docs/count_view.html` - 사람 수 카운팅 (ONNX Runtime Web 통합)
- ✅ `docs/area_view.html` - 혼잡도 분석 (ONNX Runtime Web 통합)
- ✅ `docs/_nav.html` - 네비게이션 (정적 버전)
- ⚠️ `docs/video_view.html` - 비디오 뷰 (추가 작업 필요)
- ⚠️ `docs/map_view.html` - 지도 뷰 (추가 작업 필요)
- ⚠️ `docs/map_view_info.html` - 지도 정보 (추가 작업 필요)

### 4. 정적 파일 복사
- ✅ CSS, 이미지, 폰트, 비디오 파일 복사 완료
- ✅ JavaScript 파일 복사 완료

## 🔄 추가 작업 필요

### 1. ONNX 모델 생성
```bash
conda activate moyeobom_310
python generate_onnx_model.py
mkdir docs\static\models
copy static\models\yolov8n.onnx docs\static\models\
```

### 2. 나머지 HTML 파일 변환
- `video_view.html` - 파일 업로드 방식으로 변경 필요
- `map_view.html` - API 호출 제거, 이벤트 기반으로 변경
- `map_view_info.html` - 정적 변환

### 3. GitHub Pages 배포
- GitHub 저장소에 푸시
- Settings → Pages에서 `/docs` 폴더 선택

## 📝 주요 변경 사항

### 제거된 것
- Flask 서버 (`app.py` - 더 이상 필요 없음)
- 서버 사이드 API 엔드포인트
- Jinja2 템플릿 문법
- 서버에서의 YOLO 모델 실행

### 추가된 것
- ONNX 모델 파일 (생성 필요)
- ONNX Runtime Web (CDN)
- 클라이언트 사이드 JavaScript
- 브라우저 웹캠 API

### 유지된 것
- HTML 구조 및 CSS 스타일
- UI/UX 디자인
- 정적 파일들

## 🎯 다음 단계

1. ONNX 모델 생성 및 복사
2. 나머지 HTML 파일 변환
3. 로컬 테스트
4. GitHub Pages 배포

