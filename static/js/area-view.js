let previousStatus = null;
const ratioOutputInner = document.getElementById("ratio-output-inner");
const ratioOutputLabel = document.getElementById("ratio-output-label");
const statusBadge = document.getElementById("status-badge");
const errorMessage = document.getElementById("error-message");
const loadingMessage = document.getElementById("loading-message");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const cameraSelect = document.getElementById("cameraSelect");

let processor = null;
let currentStream = null;
let availableCameras = [];

// 상태별 설정
const statusConfig = {
    '여유': {
        percentage: 33,
        color: 'rgba(20, 209, 0, 1)',
        class: 'status-free',
        text: '여유'
    },
    '보통': {
        percentage: 66,
        color: 'rgba(255, 221, 0, 1)',
        class: 'status-normal',
        text: '보통'
    },
    '혼잡': {
        percentage: 100,
        color: 'rgba(255, 99, 130, 1)',
        class: 'status-crowded',
        text: '혼잡'
    }
};

// 상태 업데이트
function updateStatus(ratioCode) {
    let status = null;
    if (ratioCode === '1') status = '여유';
    else if (ratioCode === '2') status = '보통';
    else if (ratioCode === '3') status = '혼잡';

    if (!status || !statusConfig[status]) {
        ratioOutputInner.style.width = '0%';
        ratioOutputInner.style.backgroundColor = 'var(--color-bg-light)';
        ratioOutputLabel.textContent = '-';
        statusBadge.style.display = 'none';
        return;
    }

    const config = statusConfig[status];

    // 이전 상태와 다르면 애니메이션
    if (previousStatus !== status) {
        ratioOutputInner.classList.add('updated');
        setTimeout(() => {
            ratioOutputInner.classList.remove('updated');
        }, 500);
        previousStatus = status;
    }

    // 프로그레스 바 업데이트
    ratioOutputInner.style.width = config.percentage + '%';
    ratioOutputInner.style.backgroundColor = config.color;
    ratioOutputLabel.textContent = config.text;

    // 상태 배지 업데이트
    statusBadge.textContent = config.text;
    statusBadge.className = `status-badge ${config.class}`;
    statusBadge.style.display = 'inline-block';
}

// 탐지 업데이트 이벤트 리스너
window.addEventListener('detection-update', (event) => {
    const stats = event.detail;
    updateStatus(stats.ratioCode);
});

// 사용 가능한 카메라 목록 가져오기
async function getAvailableCameras() {
    try {
        // 먼저 권한을 요청해야 deviceId를 얻을 수 있습니다
        await navigator.mediaDevices.getUserMedia({ video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        availableCameras = videoDevices;

        // 드롭다운 업데이트
        cameraSelect.innerHTML = '';
        if (videoDevices.length === 0) {
            cameraSelect.innerHTML = '<option value="">사용 가능한 카메라가 없습니다</option>';
            cameraSelect.disabled = true;
        } else {
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `카메라 ${index + 1}`;
                cameraSelect.appendChild(option);
            });
            cameraSelect.style.display = 'block';

            // 첫 번째 카메라 선택
            if (videoDevices.length > 0) {
                cameraSelect.value = videoDevices[0].deviceId;
            }
        }
    } catch (error) {
        console.error('카메라 목록 가져오기 실패:', error);
        cameraSelect.innerHTML = '<option value="">카메라 목록을 불러올 수 없습니다</option>';
        cameraSelect.disabled = true;
    }
}

// 선택된 카메라로 스트림 시작
async function startCameraStream(deviceId) {
    try {
        // 기존 스트림 정지
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // 기존 프로세서 정지
        if (processor) {
            processor.stop();
            processor = null;
        }

        loadingMessage.textContent = '카메라 접근 중...';
        loadingMessage.style.display = 'block';
        canvas.style.display = 'none';

        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        video.play();

        loadingMessage.style.display = 'none';

        // 비디오 메타데이터 로드 대기
        video.addEventListener('loadedmetadata', async () => {
            try {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.style.display = 'block';
                video.style.display = 'none';

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

    } catch (error) {
        console.error('카메라 접근 실패:', error);
        loadingMessage.textContent = '카메라 접근에 실패했습니다. 권한을 확인해주세요.';
        errorMessage.textContent = `카메라 오류: ${error.message}`;
        errorMessage.style.display = 'block';
    }
}

// 카메라 선택 변경 이벤트
cameraSelect.addEventListener('change', (e) => {
    const selectedDeviceId = e.target.value;
    if (selectedDeviceId) {
        startCameraStream(selectedDeviceId);
    }
});

// 웹캠 초기화 및 시작
async function initializeCamera() {
    // 먼저 카메라 목록 가져오기
    await getAvailableCameras();

    // 카메라가 있으면 첫 번째 카메라로 시작
    if (availableCameras.length > 0) {
        await startCameraStream(availableCameras[0].deviceId);
    } else {
        loadingMessage.textContent = '사용 가능한 카메라가 없습니다.';
        errorMessage.textContent = '카메라를 찾을 수 없습니다.';
        errorMessage.style.display = 'block';
    }
}

// 페이지 로드 시 초기화
window.addEventListener('load', () => {
    if (typeof ort === 'undefined') {
        errorMessage.textContent = 'ONNX Runtime Web을 로드할 수 없습니다. 인터넷 연결을 확인해주세요.';
        errorMessage.style.display = 'block';
        return;
    }

    initializeCamera();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (processor) {
        processor.stop();
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});

