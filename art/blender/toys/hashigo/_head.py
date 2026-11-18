# (the shared preamble of the hashigo figure scripts; helper modules start with _ so make.sh skips them)
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402,F401

import tk  # noqa: E402
import face  # noqa: E402
import _frog as fr  # noqa: E402
from fig import Fig  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
