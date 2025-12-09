"""정적 파일들을 docs/static으로 복사하는 스크립트"""
import os
import shutil
from pathlib import Path

def copy_static_files():
    """static 폴더의 모든 파일을 docs/static으로 복사"""
    source = Path('static')
    target = Path('docs/static')
    
    if not source.exists():
        print(f"✗ 소스 디렉토리가 없습니다: {source}")
        return False
    
    # 대상 디렉토리 생성
    target.mkdir(parents=True, exist_ok=True)
    
    # 파일 복사
    copied_files = 0
    for root, dirs, files in os.walk(source):
        # .gitignore 등 숨김 파일 제외
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        # 상대 경로 계산
        rel_path = os.path.relpath(root, source)
        target_dir = target / rel_path if rel_path != '.' else target
        
        # 디렉토리 생성
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # 파일 복사
        for file in files:
            if file.startswith('.'):
                continue
            source_file = Path(root) / file
            target_file = target_dir / file
            shutil.copy2(source_file, target_file)
            copied_files += 1
    
    print(f"✓ {copied_files}개 파일 복사 완료")
    print(f"  소스: {source}")
    print(f"  대상: {target}")
    
    # JavaScript 파일도 복사
    js_source = Path('static/js')
    js_target = Path('docs/static/js')
    if js_source.exists():
        js_target.mkdir(parents=True, exist_ok=True)
        for js_file in js_source.glob('*.js'):
            shutil.copy2(js_file, js_target / js_file.name)
            print(f"  JavaScript 파일 복사: {js_file.name}")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("정적 파일 복사")
    print("=" * 60)
    success = copy_static_files()
    if success:
        print("\n✓ 복사 완료!")
    else:
        print("\n✗ 복사 실패!")
        exit(1)

