/**
 * YOLO ONNX 모델을 사용한 객체 탐지 클래스
 * ONNX Runtime Web 사용
 */
class YOLOONNXDetector {
    constructor() {
        this.session = null;
        this.inputSize = 640;
        this.inputShape = [1, 3, 640, 640];
        this.confidenceThreshold = 0.5; // 기본값
        this.nmsThreshold = 0.5; // NMS threshold (IoU가 0.5 이상이면 중복으로 간주)
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
        // YOLOv8 출력 파싱
        const output = results[this.session.outputNames[0]];
        const detections = [];
        
        let outputData = output.data; // let으로 변경 (재할당 가능하도록)
        const outputDims = output.dims;
        
        // 디버깅: 출력 형식 확인 (첫 번째 호출 시만)
        if (!this._debugLogged) {
            console.log('=== YOLO 출력 디버깅 ===');
            console.log('출력 형식 (dims):', outputDims);
            console.log('출력 데이터 길이:', outputData.length);
            console.log('출력 데이터 샘플 (처음 50개):', Array.from(outputData.slice(0, 50)));
            this._debugLogged = true;
        }
        
        // YOLOv8 출력 형식 확인
        // 일반적으로 [1, 8400, 84] 형태 (batch, detections, features)
        let numDetections, numClasses = 80;
        
        if (outputDims.length === 3) {
            if (outputDims[2] === 84) {
                // [1, 8400, 84] 형태 - 일반적인 YOLOv8 출력
                numDetections = outputDims[1];
            } else if (outputDims[1] === 84) {
                // [1, 84, 8400] 형태 - 전치된 형식
                numDetections = outputDims[2];
                // 데이터 재구성 필요: [1, 84, numDetections] → [1, numDetections, 84]
                const reshaped = new Float32Array(numDetections * 84);
                for (let i = 0; i < numDetections; i++) {
                    for (let j = 0; j < 84; j++) {
                        reshaped[i * 84 + j] = outputData[j * numDetections + i];
                    }
                }
                outputData = reshaped; // 이제 재할당 가능
            } else {
                console.error('예상치 못한 출력 형식:', outputDims);
                return detections;
            }
        } else {
            console.error('예상치 못한 출력 차원:', outputDims);
            return detections;
        }
        
        // originalImage가 video element인 경우 videoWidth/videoHeight 사용
        // canvas나 img element인 경우 width/height 사용
        const imageWidth = originalImage.videoWidth || originalImage.width || 640;
        const imageHeight = originalImage.videoHeight || originalImage.height || 480;
        
        const scaleX = imageWidth / this.inputSize;
        const scaleY = imageHeight / this.inputSize;
        
        let totalDetections = 0;
        let personDetections = 0;
        
        // 탐지 결과 파싱
        let maxConfidence = 0;
        let maxClassId = -1;
        let sampleDetection = null;
        
        for (let i = 0; i < numDetections; i++) {
            const baseIdx = i * 84;
            
            // YOLOv8 출력: [x, y, w, h, class_scores...]
            // x, y, w, h는 입력 크기(640) 기준 픽셀 값
            const x = outputData[baseIdx + 0];
            const y = outputData[baseIdx + 1];
            const w = outputData[baseIdx + 2];
            const h = outputData[baseIdx + 3];
            
            // 클래스 점수 찾기 (5번째부터 84개가 클래스 점수)
            let maxClassScore = 0;
            let classId = 0;
            
            for (let j = 0; j < numClasses; j++) {
                const classScore = outputData[baseIdx + 4 + j];
                if (classScore > maxClassScore) {
                    maxClassScore = classScore;
                    classId = j;
                }
            }
            
            // YOLOv8은 class score가 이미 confidence를 포함
            const confidence = maxClassScore;
            
            totalDetections++;
            
            // 디버깅: 최대 confidence 추적
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                maxClassId = classId;
                if (i < 10) { // 처음 10개만 샘플로 저장
                    sampleDetection = {
                        x, y, w, h, confidence, classId,
                        classScores: Array.from(outputData.slice(baseIdx + 4, baseIdx + 4 + 10)) // 처음 10개 클래스만
                    };
                }
            }
            
            // 사람 클래스만 필터링 (COCO 데이터셋에서 사람은 클래스 0)
            // Python 코드: if result.cls == 0:
            if (classId === 0 && confidence > this.confidenceThreshold) {
                // Python 코드: x1, y1, x2, y2 = map(int, result.xyxy[0])
                // YOLOv8 ONNX 출력: [x, y, w, h] 형식 (중심점, 너비, 높이)
                // 입력 크기(640) 기준 픽셀 값이므로 원본 이미지 크기로 스케일링
                
                // 중심점과 크기를 원본 이미지 크기로 스케일링
                const center_x = x * scaleX;
                const center_y = y * scaleY;
                const width = w * scaleX;
                const height = h * scaleY;
                
                // 중심점에서 xyxy 형식으로 변환 (Python의 result.xyxy[0]와 동일)
                // Python: x1, y1, x2, y2 = map(int, result.xyxy[0])
                const x1 = Math.round(center_x - width / 2);
                const y1 = Math.round(center_y - height / 2);
                const x2 = Math.round(center_x + width / 2);
                const y2 = Math.round(center_y + height / 2);
                
                // Python 코드는 별도의 유효성 검사 없이 바로 사용
                // 단순히 width > 0 && height > 0만 확인
                if (width > 0 && height > 0) {
                    // Python: center_x = (x1 + x2) // 2
                    const center_x_int = Math.round((x1 + x2) / 2);
                    const center_y_int = Math.round((y1 + y2) / 2);
                    
                    detections.push({
                        bbox: [x1, y1, x2, y2], // xyxy 형식 (Python과 동일)
                        confidence: confidence,
                        class: classId,
                        center: [center_x_int, center_y_int] // 중심점 (트래킹용, Python과 동일)
                    });
                    personDetections++;
                }
            }
        }
        
        // 디버깅: 탐지 통계
        if (!this._detectionLogged) {
            console.log(`=== 탐지 통계 ===`);
            console.log(`전체 탐지 후보: ${totalDetections}`);
            console.log(`사람 탐지 (클래스 0): ${personDetections}`);
            console.log(`Confidence threshold: ${this.confidenceThreshold}`);
            console.log(`최대 confidence: ${maxConfidence.toFixed(4)} (클래스 ${maxClassId})`);
            console.log(`원본 이미지 크기: ${imageWidth}x${imageHeight}`);
            console.log(`스케일 팩터: scaleX=${scaleX.toFixed(4)}, scaleY=${scaleY.toFixed(4)}`);
            if (sampleDetection) {
                console.log('샘플 탐지 (YOLO ONNX 출력):', sampleDetection);
            }
            if (personDetections > 0) {
                console.log('첫 번째 사람 탐지:', detections[0]);
            } else {
                console.warn('사람이 탐지되지 않았습니다.');
                if (maxClassId === 0 && maxConfidence > this.confidenceThreshold) {
                    console.warn(`→ 사람은 탐지되었지만 필터링 조건을 통과하지 못했습니다.`);
                    console.warn(`  - 최대 confidence: ${maxConfidence.toFixed(4)} (threshold: ${this.confidenceThreshold})`);
                    if (sampleDetection) {
                        const sampleX = sampleDetection.x;
                        const sampleY = sampleDetection.y;
                        const sampleW = sampleDetection.w;
                        const sampleH = sampleDetection.h;
                        const sampleCenterX = sampleX * scaleX;
                        const sampleCenterY = sampleY * scaleY;
                        const sampleWidth = sampleW * scaleX;
                        const sampleHeight = sampleH * scaleY;
                        const sampleX1 = Math.round(sampleCenterX - sampleWidth / 2);
                        const sampleY1 = Math.round(sampleCenterY - sampleHeight / 2);
                        const sampleX2 = Math.round(sampleCenterX + sampleWidth / 2);
                        const sampleY2 = Math.round(sampleCenterY + sampleHeight / 2);
                        console.warn(`  - 샘플 좌표 변환:`);
                        console.warn(`    ONNX 출력: x=${sampleX.toFixed(2)}, y=${sampleY.toFixed(2)}, w=${sampleW.toFixed(2)}, h=${sampleH.toFixed(2)}`);
                        console.warn(`    원본 이미지 크기: ${imageWidth}x${imageHeight}`);
                        console.warn(`    스케일 팩터: scaleX=${scaleX.toFixed(4)}, scaleY=${scaleY.toFixed(4)}`);
                        console.warn(`    스케일링: centerX=${sampleCenterX.toFixed(2)}, centerY=${sampleCenterY.toFixed(2)}, width=${sampleWidth.toFixed(2)}, height=${sampleHeight.toFixed(2)}`);
                        console.warn(`    xyxy: x1=${sampleX1}, y1=${sampleY1}, x2=${sampleX2}, y2=${sampleY2}`);
                        console.warn(`    width > 0 && height > 0: ${sampleWidth > 0 && sampleHeight > 0}`);
                    }
                } else if (maxClassId === 0) {
                    console.warn(`→ 사람은 탐지되었지만 confidence (${maxConfidence.toFixed(4)})가 threshold (${this.confidenceThreshold})보다 낮습니다.`);
                } else {
                    console.warn(`→ 최대 confidence 클래스는 ${maxClassId}입니다.`);
                }
            }
            this._detectionLogged = true;
        }
        
        // NMS 적용
        const filtered = this.nonMaxSuppression(detections, this.nmsThreshold);
        
        // 디버깅: NMS 결과
        if (!this._nmsLogged && personDetections > 0) {
            console.log(`NMS 적용: ${personDetections} → ${filtered.length} 탐지`);
            if (filtered.length > 0) {
                console.log('NMS 후 첫 번째 탐지:', filtered[0]);
            }
            this._nmsLogged = true;
        }
        
        return filtered;
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

