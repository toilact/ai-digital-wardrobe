import numpy as np
from PIL import Image
from app import _clip_embedding


def test_embedding_has_512_dims_and_normalized():
    arr = (np.random.rand(64, 64, 4) * 255).astype("uint8")
    emb = _clip_embedding(Image.fromarray(arr, mode="RGBA"))
    assert len(emb) == 512
    norm = float(np.linalg.norm(np.array(emb)))
    assert abs(norm - 1.0) < 1e-3
