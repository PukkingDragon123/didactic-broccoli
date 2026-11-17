"""Run the lowpix CLI with the toy line's extensions loaded (smooth painted light, see smoothlight.py).

    python3 art/lowpix/figures/_lib/lowpix_run.py build|batch|render ... (the same arguments as python -m lowpix)
"""
import os
import sys

sys.path.insert(0, os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import smoothlight  # noqa: E402,F401  (patches lowpix's painter)
from lowpix.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
