/**
 * 객체 추적 클래스 (Norfair 대체)
 * 간단한 거리 기반 추적 알고리즘
 */
class SimpleTracker {
    constructor(distanceThreshold = 120) {
        this.tracks = new Map(); // trackId -> {position, history, lastSeen, bbox}
        this.nextId = 1;
        this.distanceThreshold = distanceThreshold;
    }

    update(detections) {
        // detections: [{center: [x, y], bbox: [x1, y1, x2, y2]}]
        // bbox는 이제 xyxy 형식
        
        // 기존 트랙과 새 탐지 매칭
        const matched = this.matchTracks(detections);
        
        // 매칭된 트랙 업데이트
        matched.forEach(({trackId, detection}) => {
            const track = this.tracks.get(trackId);
            track.position = detection.center;
            track.history.push(detection.center);
            track.lastSeen = Date.now();
            track.bbox = detection.bbox; // xyxy 형식 [x1, y1, x2, y2]
        });
        
        // 새 트랙 생성 (매칭되지 않은 탐지)
        detections.forEach(detection => {
            if (!matched.find(m => m.detection === detection)) {
                this.tracks.set(this.nextId++, {
                    position: detection.center,
                    history: [detection.center],
                    lastSeen: Date.now(),
                    bbox: detection.bbox // xyxy 형식 [x1, y1, x2, y2]
                });
            }
        });
        
        // 오래된 트랙 제거
        this.removeOldTracks();
        
        // 방향 계산 포함하여 반환
        return Array.from(this.tracks.entries()).map(([id, track]) => ({
            id,
            position: track.position,
            bbox: track.bbox, // xyxy 형식 [x1, y1, x2, y2]
            direction: this.calculateDirection(track.history)
        }));
    }

    matchTracks(detections) {
        // 간단한 거리 기반 매칭 (Hungarian 알고리즘 대신 greedy 매칭)
        // 더 안정적인 매칭을 위해 탐지를 confidence 순으로 정렬
        const sortedDetections = detections.map((d, idx) => ({detection: d, idx}));
        // confidence가 높은 순으로 정렬 (detection 객체에 confidence가 있다면)
        sortedDetections.sort((a, b) => {
            const confA = a.detection.confidence || 0;
            const confB = b.detection.confidence || 0;
            return confB - confA;
        });
        
        const matched = [];
        const usedDetections = new Set();
        const usedTracks = new Set();
        
        // 먼저 기존 트랙과 매칭 시도
        sortedDetections.forEach(({detection, idx}) => {
            if (usedDetections.has(idx)) return;
            
            let bestMatch = null;
            let minDistance = Infinity;
            
            this.tracks.forEach((track, trackId) => {
                if (usedTracks.has(trackId)) return;
                
                const distance = this.euclideanDistance(
                    track.position, 
                    detection.center
                );
                
                if (distance < this.distanceThreshold && distance < minDistance) {
                    minDistance = distance;
                    bestMatch = {trackId, detection, idx};
                }
            });
            
            if (bestMatch) {
                matched.push(bestMatch);
                usedDetections.add(bestMatch.idx);
                usedTracks.add(bestMatch.trackId);
            }
        });
        
        return matched;
    }

    euclideanDistance(pos1, pos2) {
        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateDirection(history) {
        if (history.length < 2) return null;
        
        const prev = history[history.length - 2];
        const curr = history[history.length - 1];
        
        const dx = curr[0] - prev[0];
        const dy = curr[1] - prev[1];
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    removeOldTracks() {
        const now = Date.now();
        const maxAge = 2000; // 2초 동안 보이지 않으면 제거 (깜빡임 방지)
        
        this.tracks.forEach((track, id) => {
            if (now - track.lastSeen > maxAge) {
                this.tracks.delete(id);
            }
        });
    }

    reset() {
        this.tracks.clear();
        this.nextId = 1;
    }
}

