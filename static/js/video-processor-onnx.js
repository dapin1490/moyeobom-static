/**
 * 비디오 처리 클래스 (ONNX Runtime Web 기반)
 */
class VideoProcessorONNX {
    constructor() {
        this.detector = new YOLOONNXDetector();
        this.tracker = new SimpleTracker(120);
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isProcessing = false;
        this.frameSkip = 0;
        this.SKIP_FRAMES = 2; // 2프레임마다 1번만 처리 (성능 최적화)
        this.stats = {
            peopleCount: 0,
            directionCounts: {left: 0, right: 0, up: 0, down: 0},
            areaRatio: 0
        };
    }

    async initialize(videoElement, canvasElement, modelPath) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // 모델 로드
        console.log('모델 로드 중...');
        const loaded = await this.detector.loadModel(modelPath);
        if (!loaded) {
            throw new Error('모델 로드 실패');
        }
        
        // 캔버스 크기 조정
        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;
        
        console.log('✓ 비디오 프로세서 초기화 완료');
    }

    async start() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.frameSkip = 0;
        await this.processFrame();
    }

    async processFrame() {
        if (!this.isProcessing) return;
        
        // 프레임 스킵 (성능 최적화)
        this.frameSkip++;
        if (this.frameSkip < this.SKIP_FRAMES) {
            // 스킵된 프레임은 비디오만 그리기
            this.ctx.drawImage(this.video, 0, 0, 
                this.canvas.width, this.canvas.height);
            requestAnimationFrame(() => this.processFrame());
            return;
        }
        this.frameSkip = 0;
        
        try {
            // 비디오 프레임을 캔버스에 그리기
            this.ctx.drawImage(this.video, 0, 0, 
                this.canvas.width, this.canvas.height);
            
            // ONNX 모델로 탐지
            const detections = await this.detector.detect(this.video);
            
            // 추적 업데이트
            const tracked = this.tracker.update(
                detections.map(d => ({
                    center: d.center,
                    bbox: d.bbox
                }))
            );
            
            // 결과 렌더링
            this.renderResults(tracked, detections);
            
            // 통계 업데이트
            this.updateStats(tracked, detections);
            
        } catch (error) {
            console.error('프레임 처리 오류:', error);
        }
        
        // 다음 프레임
        requestAnimationFrame(() => this.processFrame());
    }

    renderResults(tracked, detections) {
        // 원본 비디오 다시 그리기
        this.ctx.drawImage(this.video, 0, 0, 
            this.canvas.width, this.canvas.height);
        
        // 바운딩 박스 그리기
        tracked.forEach(obj => {
            const [cx, cy, w, h] = obj.bbox;
            const x1 = cx - w / 2;
            const y1 = cy - h / 2;
            
            // 박스
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x1, y1, w, h);
            
            // 중심점
            const [px, py] = obj.position;
            this.ctx.fillStyle = '#00ff00';
            this.ctx.beginPath();
            this.ctx.arc(px, py, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // ID 표시
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`ID: ${obj.id}`, x1 + 5, y1 - 5);
        });
    }

    updateStats(tracked, detections) {
        this.stats.peopleCount = tracked.length;
        
        // 방향 통계
        this.stats.directionCounts = {left: 0, right: 0, up: 0, down: 0};
        tracked.forEach(obj => {
            if (obj.direction) {
                this.stats.directionCounts[obj.direction]++;
            }
        });
        
        // 면적 비율 계산
        const frameArea = this.canvas.width * this.canvas.height;
        let totalPersonArea = 0;
        detections.forEach(det => {
            const [, , w, h] = det.bbox;
            totalPersonArea += w * h;
        });
        this.stats.areaRatio = (totalPersonArea / frameArea) * 100;
        
        // 혼잡도 코드 계산
        let ratioCode = '1';
        if (this.stats.areaRatio >= 70) {
            ratioCode = '3'; // 혼잡
        } else if (this.stats.areaRatio >= 30) {
            ratioCode = '2'; // 보통
        } else {
            ratioCode = '1'; // 여유
        }
        this.stats.ratioCode = ratioCode;
        
        // 가장 많은 이동 방향 찾기
        const maxDirection = Object.entries(this.stats.directionCounts)
            .reduce((a, b) => a[1] > b[1] ? a : b, ['left', 0]);
        this.stats.mostMovementDirection = maxDirection[0];
        this.stats.mostMovementCount = maxDirection[1];
        
        // 이벤트 발생
        window.dispatchEvent(new CustomEvent('detection-update', {
            detail: this.stats
        }));
    }

    stop() {
        this.isProcessing = false;
    }

    getStats() {
        return this.stats;
    }
}

