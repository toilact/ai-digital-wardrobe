import numpy as np
import cv2
from garment_parse import parse_garments, SEGFORMER_LABEL_TO_SLOT


def test_label_map_covers_garment_classes():
    # upper-clothes(4), skirt(5), pants(6), dress(7), shoes(9,10), bag(16)
    assert SEGFORMER_LABEL_TO_SLOT[4] == ("top", "Áo")
    assert SEGFORMER_LABEL_TO_SLOT[6] == ("bottom", "Quần")
    assert SEGFORMER_LABEL_TO_SLOT[7] == ("dress", "Đầm")
    assert SEGFORMER_LABEL_TO_SLOT[9] == ("shoes", "Giày")
    assert SEGFORMER_LABEL_TO_SLOT[16] == ("bag", "Khác")
    # body parts không có trong map
    assert 11 not in SEGFORMER_LABEL_TO_SLOT  # face


def test_parse_person_returns_multiple_garments():
    img = cv2.cvtColor(cv2.imread("tests/fixtures/person_two_items.jpg"), cv2.COLOR_BGR2RGB)
    items = parse_garments(img)
    slots = {it["slot"] for it in items}
    assert len(items) >= 2
    assert "top" in slots and "bottom" in slots
    for it in items:
        assert it["mask01"].shape == img.shape[:2]
        assert it["mask01"].max() == 1
