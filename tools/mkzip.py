#!/usr/bin/env python3
"""폴더를 zip으로 묶는다. 유닉스 실행 권한을 보존하는 것이 핵심.

zip(1) 과 달리 파이썬 zipfile 은 기본적으로 권한 비트를 잃어버린다.
그대로 두면 macOS 에서 AshfallChronicles.command 더블클릭이 동작하지 않는다.

사용법: python tools/mkzip.py <묶을_폴더> <출력.zip>
"""
import os
import sys
import zipfile

# Windows 콘솔은 기본이 cp949 라 한글·기호 출력에서 죽는다.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

EXECUTABLE_SUFFIXES = (".sh", ".command")


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip())
        return 2

    src, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    if not os.path.isdir(src):
        print(f"폴더를 찾을 수 없습니다: {src}")
        return 1

    base = os.path.dirname(src)
    count = 0

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, dirs, files in os.walk(src):
            dirs.sort()
            for name in sorted(files):
                path = os.path.join(root, name)
                arc = os.path.relpath(path, base).replace(os.sep, "/")

                info = zipfile.ZipInfo(arc)
                info.date_time = (2026, 1, 1, 0, 0, 0)  # 재현 가능한 빌드
                info.compress_type = zipfile.ZIP_DEFLATED
                mode = 0o755 if name.endswith(EXECUTABLE_SUFFIXES) else 0o644
                info.external_attr = (mode << 16) | 0o600

                with open(path, "rb") as fh:
                    zf.writestr(info, fh.read())
                count += 1

    size = os.path.getsize(out)
    print(f"{os.path.basename(out)}  —  파일 {count}개, {size / 1048576:.1f} MiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
