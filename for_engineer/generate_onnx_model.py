"""YOLOv8 모델을 ONNX 형식으로 변환하는 스크립트"""
import os
import json
from ultralytics import YOLO

def load_config():
    """config.json 파일에서 설정을 로드합니다."""
    config_path = "config.json"
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        return {
            "model": {"path": "yolo11x.pt"}
        }

def main():
    print("=" * 60)
    print("YOLOv8 → ONNX 모델 변환")
    print("=" * 60)
    
    config = load_config()
    model_path = config.get("model", {}).get("path", "yolo11x.pt")
    
    # YOLOv8 모델 사용 (YOLO11 대신)
    # YOLOv8이 ONNX 변환이 더 안정적
    print(f"\n[1단계] 모델 로드...")
    print(f"  원본 모델: {model_path}")
    
    # YOLOv8n 사용 (가장 작고 빠름)
    # 필요시 yolov8s.pt, yolov8m.pt 등으로 변경 가능
    try:
        model = YOLO('yolov8n.pt')
        print("✓ YOLOv8n 모델 로드 성공")
    except Exception as e:
        print(f"✗ 모델 로드 실패: {e}")
        print("  모델이 자동으로 다운로드됩니다...")
        model = YOLO('yolov8n.pt')
        print("✓ YOLOv8n 모델 다운로드 및 로드 성공")
    
    # 출력 디렉토리 생성
    output_dir = "static/models"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\n[2단계] ONNX 변환...")
    print(f"  출력 디렉토리: {output_dir}")
    
    try:
        # ONNX로 변환
        onnx_path = model.export(
            format='onnx',
            imgsz=640,
            simplify=True,  # 모델 단순화
            opset=12  # ONNX opset 버전
        )
        
        # 파일을 static/models로 이동
        if os.path.exists(onnx_path):
            import shutil
            target_path = os.path.join(output_dir, 'yolov8n.onnx')
            shutil.move(onnx_path, target_path)
            onnx_path = target_path
            
            size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
            print(f"✓ ONNX 변환 성공!")
            print(f"  출력 파일: {onnx_path}")
            print(f"  파일 크기: {size_mb:.2f} MB")
            
            print(f"\n[3단계] 모델 정보 확인...")
            try:
                import onnx
                onnx_model = onnx.load(onnx_path)
                print("✓ ONNX 모델 검증 성공")
                
                # 입력/출력 정보
                print("\n  모델 입력:")
                for inp in onnx_model.graph.input:
                    shape = [dim.dim_value if dim.dim_value > 0 else '?' 
                            for dim in inp.type.tensor_type.shape.dim]
                    print(f"    - {inp.name}: shape={shape}")
                
                print("\n  모델 출력:")
                for out in onnx_model.graph.output:
                    shape = [dim.dim_value if dim.dim_value > 0 else '?' 
                            for dim in out.type.tensor_type.shape.dim]
                    print(f"    - {out.name}: shape={shape}")
                    
            except ImportError:
                print("⚠ onnx 패키지가 없어 상세 정보를 확인할 수 없습니다.")
                print("  (선택사항) 설치: pip install onnx")
            except Exception as e:
                print(f"⚠ 모델 정보 확인 중 오류: {e}")
            
            print(f"\n" + "=" * 60)
            print("변환 완료!")
            print("=" * 60)
            print(f"\nONNX 모델이 생성되었습니다: {onnx_path}")
            print("\n다음 단계:")
            print("1. 이 모델을 GitHub Pages에 배포")
            print("2. ONNX Runtime Web으로 브라우저에서 로드")
            
        else:
            print(f"✗ 변환된 파일을 찾을 수 없습니다: {onnx_path}")
            
    except Exception as e:
        print(f"✗ ONNX 변환 실패: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)

