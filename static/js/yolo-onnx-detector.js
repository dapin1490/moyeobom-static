/**
 * YOLO ONNX 모델을 사용한 객체 탐지 클래스
 * ONNX Runtime Web 사용
 */
class YOLOONNXDetector {
    constructor() {
        this.session = null;
        this.inputSize = 640;
        this.inputShape = [1, 3, 640, 640];
        this.confidenceThreshold = 0.5;
        this.nmsThreshold = 0.45;
    }

    async loadModel(modelPath) {
        try {
            // ONNX Runtime Web 세션 생성
            this.session = await ort.InferenceSession.create(modelPath);
            console.log('✓ ONNX 모델 로드 성공');
            
            // 입력/출력 정보 확인
            console.log('입력:', this.session.inputNames);
            console.log('출력:', this.session.outputNames);
            
            return true;
        } catch (error) {
            console.error('모델 로드 실패:', error);
            return false;
        }
    }

    async detect(imageElement) {
        if (!this.session) {
            throw new Error('모델이 로드되지 않았습니다.');
        }

        // 이미지 전처리
        const preprocessed = this.preprocess(imageElement);
        
        // 추론 실행
        const feeds = {};
        feeds[this.session.inputNames[0]] = preprocessed;
        
        const results = await this.session.run(feeds);
        
        // 후처리 (NMS, 바운딩 박스 변환)
        const detections = this.postProcess(results, imageElement);
        
        return detections;
    }

    preprocess(imageElement) {
        // Canvas에 이미지 그리기
        const canvas = document.createElement('canvas');
        canvas.width = this.inputSize;
        canvas.height = this.inputSize;
        const ctx = canvas.getContext('2d');
        
        // 이미지를 640x640으로 리사이즈하여 그리기
        ctx.drawImage(imageElement, 0, 0, this.inputSize, this.inputSize);
        
        // 이미지 데이터 추출
        const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);
        const data = imageData.data;
        
        // RGB → BGR 변환 및 정규화
        const input = new Float32Array(3 * this.inputSize * this.inputSize);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // BGR 순서로 변환 및 정규화 (0-255 → 0-1)
            const idx = Math.floor(i / 4);
            input[idx] = b / 255.0;                    // B
            input[this.inputSize * this.inputSize + idx] = g / 255.0;  // G
            input[2 * this.inputSize * this.inputSize + idx] = r / 255.0;  // R
        }
        
        // 텐서 생성 [1, 3, 640, 640]
        return new ort.Tensor('float32', input, this.inputShape);
    }

    postProcess(results, originalImage) {
        // YOLO 출력 파싱
        // YOLOv8 출력 형식: [1, num_detections, 84] 또는 [1, 84, num_detections]
        // (x, y, w, h, confidence, class_scores...)
        
        const output = results[this.session.outputNames[0]];
        const detections = [];
        
        // 출력 텐서 형태 확인 및 변환
        let outputData = output.data;
        let outputDims = output.dims;
        
        // YOLOv8 출력은 보통 [1, 84, 8400] 형태 (8400 = 80*80 + 40*40 + 20*20)
        // 또는 [1, 8400, 84] 형태일 수 있음
        let numDetections, numClasses;
        
        if (outputDims[1] === 84) {
            // [1, 84, 8400] 형태
            numDetections = outputDims[2];
            numClasses = 80;
        } else {
            // [1, 8400, 84] 형태
            numDetections = outputDims[1];
            numClasses = 80;
            // 데이터 재구성 필요
            const reshaped = new Float32Array(84 * numDetections);
            for (let i = 0; i < numDetections; i++) {
                for (let j = 0; j < 84; j++) {
                    reshaped[j * numDetections + i] = outputData[i * 84 + j];
                }
            }
            outputData = reshaped;
        }
        
        const scaleX = originalImage.width / this.inputSize;
        const scaleY = originalImage.height / this.inputSize;
        
        // 탐지 결과 파싱
        for (let i = 0; i < numDetections; i++) {
            const baseIdx = i;
            
            // 바운딩 박스 (center_x, center_y, width, height)
            const cx = outputData[baseIdx] * scaleX;
            const cy = outputData[baseIdx + numDetections] * scaleY;
            const w = outputData[baseIdx + numDetections * 2] * scaleX;
            const h = outputData[baseIdx + numDetections * 3] * scaleY;
            
            // Confidence 및 클래스 점수
            let maxScore = 0;
            let classId = 0;
            
            for (let j = 0; j < numClasses; j++) {
                const score = outputData[baseIdx + numDetections * (4 + j)];
                if (score > maxScore) {
                    maxScore = score;
                    classId = j;
                }
            }
            
            // 사람 클래스만 필터링 (COCO 데이터셋에서 사람은 클래스 0)
            if (classId === 0 && maxScore > this.confidenceThreshold) {
                detections.push({
                    bbox: [cx, cy, w, h], // center_x, center_y, width, height
                    confidence: maxScore,
                    class: classId,
                    center: [cx, cy]
                });
            }
        }
        
        // NMS 적용
        return this.nonMaxSuppression(detections, this.nmsThreshold);
    }

    nonMaxSuppression(detections, iouThreshold) {
        // IoU 기반 NMS 구현
        detections.sort((a, b) => b.confidence - a.confidence);
        
        const selected = [];
        const suppressed = new Set();
        
        for (let i = 0; i < detections.length; i++) {
            if (suppressed.has(i)) continue;
            
            selected.push(detections[i]);
            
            for (let j = i + 1; j < detections.length; j++) {
                if (suppressed.has(j)) continue;
                
                const iou = this.calculateIoU(detections[i].bbox, detections[j].bbox);
                if (iou > iouThreshold) {
                    suppressed.add(j);
                }
            }
        }
        
        return selected;
    }

    calculateIoU(bbox1, bbox2) {
        // bbox: [center_x, center_y, width, height]
        const [cx1, cy1, w1, h1] = bbox1;
        const [cx2, cy2, w2, h2] = bbox2;
        
        const x1_min = cx1 - w1 / 2;
        const y1_min = cy1 - h1 / 2;
        const x1_max = cx1 + w1 / 2;
        const y1_max = cy1 + h1 / 2;
        
        const x2_min = cx2 - w2 / 2;
        const y2_min = cy2 - h2 / 2;
        const x2_max = cx2 + w2 / 2;
        const y2_max = cy2 + h2 / 2;
        
        const inter_x_min = Math.max(x1_min, x2_min);
        const inter_y_min = Math.max(y1_min, y2_min);
        const inter_x_max = Math.min(x1_max, x2_max);
        const inter_y_max = Math.min(y1_max, y2_max);
        
        const inter_area = Math.max(0, inter_x_max - inter_x_min) * 
                          Math.max(0, inter_y_max - inter_y_min);
        
        const area1 = w1 * h1;
        const area2 = w2 * h2;
        const union_area = area1 + area2 - inter_area;
        
        return union_area > 0 ? inter_area / union_area : 0;
    }
}

