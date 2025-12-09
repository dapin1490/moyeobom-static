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
        this.SKIP_FRAMES = 1; // 프레임 스킵 제거 (깜빡임 방지)
        this.lastTracked = []; // 이전 프레임의 트래킹 결과 저장
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
        
        // 비디오 메타데이터 로드 대기
        return new Promise((resolve) => {
            const checkVideoSize = () => {
                if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                    // 캔버스 크기를 비디오 크기에 맞춤
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    console.log(`✓ 비디오 프로세서 초기화 완료 (${this.canvas.width}x${this.canvas.height})`);
                    resolve();
                } else {
                    setTimeout(checkVideoSize, 100);
                }
            };
            checkVideoSize();
        });
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
            // 스킵된 프레임은 이전 트래킹 결과를 사용하여 렌더링
            this.ctx.drawImage(this.video, 0, 0, 
                this.canvas.width, this.canvas.height);
            if (this.lastTracked.length > 0) {
                this.renderResults(this.lastTracked, []);
            }
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
            
            // 이전 트래킹 결과 저장 (스킵된 프레임에서 사용)
            this.lastTracked = tracked;
            
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
        
        // 디버깅: 렌더링 정보 (주기적으로 로그)
        if (tracked.length > 0) {
            if (!this._renderLogged || (this._renderCount || 0) % 30 === 0) {
                console.log('렌더링할 객체 수:', tracked.length);
                if (tracked.length > 0) {
                    console.log('첫 번째 객체:', tracked[0]);
                    console.log('bbox (xyxy):', tracked[0].bbox);
                }
                this._renderLogged = true;
            }
            this._renderCount = (this._renderCount || 0) + 1;
        }
        
        // 바운딩 박스 그리기 (Python 코드와 동일한 방식)
        // Python: cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        tracked.forEach(obj => {
            if (!obj.bbox || obj.bbox.length !== 4) {
                if (!this._bboxErrorLogged) {
                    console.warn('잘못된 bbox:', obj);
                    this._bboxErrorLogged = true;
                }
                return;
            }
            
            // bbox는 이제 xyxy 형식 [x1, y1, x2, y2]
            const [x1, y1, x2, y2] = obj.bbox;
            
            // bbox 유효성 검사
            if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || 
                x2 <= x1 || y2 <= y1 || x1 < 0 || y1 < 0) {
                if (!this._bboxErrorLogged) {
                    console.warn('유효하지 않은 bbox 값:', {x1, y1, x2, y2});
                    this._bboxErrorLogged = true;
                }
                return;
            }
            
            // 박스 그리기 (Python cv2.rectangle과 동일)
            this.ctx.strokeStyle = '#00ff00'; // (0, 255, 0) in BGR
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            
            // 중심점 그리기 (Python cv2.circle과 동일)
            if (obj.position && obj.position.length === 2) {
                const [px, py] = obj.position;
                if (!isNaN(px) && !isNaN(py)) {
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, 5, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // ID 표시 (Python cv2.putText와 동일: 중심점 옆에 표시)
                    // Python: cv2.putText(frame, f"ID: {obj_id}", (x + 5, y - 5), ...)
                    if (obj.id !== undefined) {
                        this.ctx.fillStyle = '#00ff00';
                        this.ctx.font = 'bold 16px Arial';
                        // 중심점에서 오른쪽 위로 5픽셀씩 이동한 위치에 ID 표시
                        this.ctx.fillText(`ID: ${obj.id}`, px + 5, Math.max(py - 5, 15));
                    }
                }
            }
        });
    }

    updateStats(tracked, detections) {
        // Python 코드와 동일: people_count는 탐지된 사람 수 (detections.length)
        // tracked.length는 추적된 객체 수이므로 다를 수 있음
        this.stats.peopleCount = detections.length;
        
        // 방향 통계
        this.stats.directionCounts = {left: 0, right: 0, up: 0, down: 0};
        tracked.forEach(obj => {
            if (obj.direction) {
                this.stats.directionCounts[obj.direction]++;
            }
        });
        
        // 면적 비율 계산 (Python 코드와 동일)
        // Python: person_area = (x2 - x1) * (y2 - y1)
        const frameArea = this.canvas.width * this.canvas.height;
        let totalPersonArea = 0;
        detections.forEach(det => {
            // bbox는 xyxy 형식 [x1, y1, x2, y2]
            const [x1, y1, x2, y2] = det.bbox;
            const personArea = (x2 - x1) * (y2 - y1);
            totalPersonArea += personArea;
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

