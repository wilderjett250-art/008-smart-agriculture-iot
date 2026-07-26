import json
import math
import os
import sys

import cv2
import numpy as np


def build_green_mask(image_bgr):
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    lower = np.array([25, 20, 20], dtype=np.uint8)
    upper = np.array([95, 255, 255], dtype=np.uint8)
    hsv_mask = cv2.inRange(hsv, lower, upper)

    b, g, r = cv2.split(image_bgr.astype(np.int16))
    exg = 2 * g - r - b
    exg = np.clip(exg, 0, 255).astype(np.uint8)
    _, exg_mask = cv2.threshold(exg, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    mask = cv2.bitwise_or(hsv_mask, exg_mask)
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    return mask


def select_leaf_contour(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
      return None

    height, width = mask.shape[:2]
    min_area = max(800, int(width * height * 0.002))
    best = None
    best_area = 0

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        touches_edge = x <= 1 or y <= 1 or (x + w) >= (width - 1) or (y + h) >= (height - 1)
        if touches_edge:
            continue

        if area > best_area:
            best = contour
            best_area = area

    return best


def main():
    if len(sys.argv) != 9:
        raise SystemExit("expected 8 arguments")

    image_path = sys.argv[1]
    overlay_path = sys.argv[2]
    calibration_length_mm = float(sys.argv[3])
    x1 = float(sys.argv[4])
    y1 = float(sys.argv[5])
    x2 = float(sys.argv[6])
    y2 = float(sys.argv[7])
    leaf_index = int(sys.argv[8])

    if calibration_length_mm <= 0:
        raise ValueError("calibration length must be greater than 0")

    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("failed to read image")

    calibration_pixels = math.hypot(x2 - x1, y2 - y1)
    if calibration_pixels <= 1:
        raise ValueError("calibration points too close")

    pixels_per_mm = calibration_pixels / calibration_length_mm
    mask = build_green_mask(image)
    contour = select_leaf_contour(mask)
    if contour is None:
        raise ValueError("leaf contour not detected")

    area_pixels = cv2.contourArea(contour)
    rect = cv2.minAreaRect(contour)
    (width_px, height_px) = rect[1]
    length_px = max(width_px, height_px)
    leaf_width_px = min(width_px, height_px)

    area_mm2 = area_pixels / (pixels_per_mm ** 2)
    length_mm = length_px / pixels_per_mm
    width_mm = leaf_width_px / pixels_per_mm

    overlay = image.copy()
    box = cv2.boxPoints(rect)
    box = np.int32(box)
    cv2.drawContours(overlay, [box], 0, (0, 255, 255), 3)
    cv2.drawContours(overlay, [contour], -1, (0, 255, 0), 2)
    cv2.line(overlay, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
    cv2.circle(overlay, (int(x1), int(y1)), 5, (255, 0, 0), -1)
    cv2.circle(overlay, (int(x2), int(y2)), 5, (255, 0, 0), -1)
    cv2.putText(
        overlay,
        f"L{leaf_index} {length_mm:.1f}mm / {width_mm:.1f}mm / {area_mm2:.1f}mm2",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )

    os.makedirs(os.path.dirname(overlay_path), exist_ok=True)
    cv2.imwrite(overlay_path, overlay)

    payload = {
        "calibration_length_mm": calibration_length_mm,
        "calibration_pixels": calibration_pixels,
        "pixels_per_mm": pixels_per_mm,
        "leaf_area_mm2": area_mm2,
        "leaf_length_mm": length_mm,
        "leaf_width_mm": width_mm,
    }
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
