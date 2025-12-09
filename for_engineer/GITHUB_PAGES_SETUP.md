# GitHub Pages 배포 가이드

## 현재 상태

✅ 완료된 작업:
- ONNX 모델 생성 스크립트 (`generate_onnx_model.py`)
- ONNX Runtime Web 기반 JavaScript 구현
- 템플릿 정적 HTML 변환
- 정적 파일 복사

## 다음 단계

### 1. ONNX 모델 생성

가상환경에서 실행:

```bash
conda activate moyeobom_310
python generate_onnx_model.py
```

이 명령은 `static/models/yolov8n.onnx` 파일을 생성합니다.

### 2. 모델 파일 복사

생성된 ONNX 모델을 `docs/static/models/`로 복사:

```bash
mkdir docs\static\models
copy static\models\yolov8n.onnx docs\static\models\
```

또는 Python 스크립트 실행:

```python
import shutil
import os
os.makedirs('docs/static/models', exist_ok=True)
shutil.copy('static/models/yolov8n.onnx', 'docs/static/models/yolov8n.onnx')
```

### 3. GitHub에 푸시

```bash
git add docs/
git add static/js/
git add generate_onnx_model.py
git commit -m "Add GitHub Pages static site"
git push
```

### 4. GitHub Pages 설정

1. GitHub 저장소로 이동
2. Settings → Pages
3. Source: `Deploy from a branch` 선택
4. Branch: `main` 선택
5. Folder: `/docs` 선택
6. Save 클릭

### 5. 접속 확인

몇 분 후 다음 URL로 접속:
- `https://[사용자명].github.io/moyeobom-static/`

## 파일 구조

```
docs/
├── index.html
├── count_view.html
├── area_view.html
├── video_view.html (추가 필요)
├── map_view.html (추가 필요)
├── map_view_info.html (추가 필요)
├── _nav.html
└── static/
    ├── css/
    ├── images/
    ├── fonts/
    ├── videos/
    ├── js/
    │   ├── tracker.js
    │   ├── yolo-onnx-detector.js
    │   └── video-processor-onnx.js
    └── models/
        └── yolov8n.onnx (생성 필요)
```

## 주의사항

1. **모델 파일 크기**: ONNX 모델은 약 6-10MB입니다. GitHub의 파일 크기 제한을 확인하세요.
2. **로딩 시간**: 첫 방문 시 모델 다운로드로 인해 시간이 걸릴 수 있습니다.
3. **웹캠 권한**: 사용자가 웹캠 권한을 허용해야 합니다.
4. **HTTPS 필요**: 웹캠 접근은 HTTPS 환경에서만 가능합니다. GitHub Pages는 자동으로 HTTPS를 제공합니다.

## 문제 해결

### 모델 로드 실패
- 브라우저 콘솔에서 오류 확인
- 모델 파일 경로 확인 (`static/models/yolov8n.onnx`)
- 네트워크 탭에서 파일 다운로드 확인

### 웹캠 접근 실패
- 브라우저 권한 설정 확인
- HTTPS 연결 확인
- 다른 브라우저에서 시도

### ONNX Runtime Web 로드 실패
- 인터넷 연결 확인
- CDN URL 확인: `https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js`

