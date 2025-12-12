const videoFile = document.getElementById('videoFile');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const videoContainer = document.getElementById('video-container');
const videoPlaceholder = document.getElementById('video-placeholder');
const videoInfo = document.getElementById('video-info');
const countValue = document.getElementById('count-value');
const ratioValue = document.getElementById('ratio-value');
const errorMessage = document.getElementById('error-message');

let processor = null;

// 상태별 색상
const statusColors = {
    '여유': 'rgba(20, 209, 0, 1)',
    '보통': 'rgba(255, 221, 0, 1)',
    '혼잡': 'rgba(255, 99, 130, 1)'
};

// 탐지 업데이트 이벤트 리스너
window.addEventListener('detection-update', (event) => {
    const stats = event.detail;

    // 사람 수 업데이트
    countValue.textContent = stats.peopleCount;
    countValue.style.color = stats.peopleCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)';

    // 혼잡도 업데이트
    let statusText = '여유';
    if (stats.ratioCode === '2') statusText = '보통';
    else if (stats.ratioCode === '3') statusText = '혼잡';

    ratioValue.textContent = statusText;
    ratioValue.style.color = statusColors[statusText] || 'var(--color-text-primary)';
});

// 비디오 파일 선택 이벤트
videoFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        errorMessage.style.display = 'none';
        videoInfo.textContent = `선택된 파일: ${file.name}`;
        videoInfo.style.display = 'block';

        // 기존 프로세서 정지
        if (processor) {
            processor.stop();
            processor = null;
        }

        // 비디오 URL 생성
        const videoURL = URL.createObjectURL(file);
        video.src = videoURL;
        // 비디오는 숨김 상태 유지 (canvas만 표시)
        video.style.display = 'none';
        videoPlaceholder.style.display = 'none';

        // 비디오 메타데이터 로드 대기
        video.addEventListener('loadedmetadata', async () => {
            try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.style.display = 'block';

                // ONNX Runtime Web 확인
                if (typeof ort === 'undefined') {
                    throw new Error('ONNX Runtime Web을 로드할 수 없습니다.');
                }

                processor = new VideoProcessorONNX();
                await processor.initialize(video, canvas, 'static/models/yolov8n.onnx');
                await processor.start();
                console.log('✓ 비디오 처리 시작');
            } catch (error) {
                console.error('프로세서 초기화 실패:', error);
                errorMessage.textContent = `초기화 실패: ${error.message}`;
                errorMessage.style.display = 'block';
            }
        }, { once: true });

        // 비디오 재생
        video.play();

    } catch (error) {
        console.error('비디오 로드 실패:', error);
        errorMessage.textContent = `비디오 로드 오류: ${error.message}`;
        errorMessage.style.display = 'block';
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (processor) {
        processor.stop();
    }
    if (video.src) {
        URL.revokeObjectURL(video.src);
    }
});

