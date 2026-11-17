"""MediaPipe Tasks: 478 face landmarks with the head pose, and a skin/hair segmentation, for one RGB image."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .models import ensure_models

SEG_LABELS = ["background", "hair", "body-skin", "face-skin", "clothes", "others"]


@dataclass
class Detection:
    width: int
    height: int
    faces: int
    landmarks: np.ndarray | None = None  # 478 x 3, MediaPipe normalised (x, y in 0-1, z scaled like x)
    matrix: np.ndarray | None = None  # 4 x 4 facial transformation (canonical cm -> camera)
    blendshapes: dict = field(default_factory=dict)
    segmentation: np.ndarray | None = None  # H x W uint8, SEG_LABELS
    face_skin: np.ndarray | None = None  # H x W float confidence of face-skin


class FaceAnalyzer:
    """Wraps FaceLandmarker and the multiclass selfie segmenter. Create once; call per image."""

    def __init__(self, models: str | None = None, max_faces: int = 2):
        import mediapipe as mp
        from mediapipe.tasks.python import BaseOptions, vision

        d = ensure_models(models)
        self._mp = mp
        self._lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(d / "face_landmarker.task")), num_faces=max_faces,
            output_facial_transformation_matrixes=True, output_face_blendshapes=True))
        self._seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
            base_options=BaseOptions(model_asset_path=str(d / "selfie_multiclass_256x256.tflite")), output_category_mask=True, output_confidence_masks=True))

    def detect(self, rgb: np.ndarray, segment: bool = True) -> Detection:
        h, w = rgb.shape[:2]
        img = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
        r = self._lm.detect(img)
        det = Detection(width=w, height=h, faces=len(r.face_landmarks))
        if not r.face_landmarks:
            return det
        # the largest face, if several
        sizes = [max(p.x for p in f) - min(p.x for p in f) for f in r.face_landmarks]
        k = int(np.argmax(sizes))
        det.landmarks = np.array([[p.x, p.y, p.z] for p in r.face_landmarks[k]], dtype=np.float64)
        if r.facial_transformation_matrixes:
            det.matrix = np.array(r.facial_transformation_matrixes[k], dtype=np.float64)
        if r.face_blendshapes:
            det.blendshapes = {b.category_name: float(b.score) for b in r.face_blendshapes[k]}
        if segment:
            s = self._seg.segment(img)
            det.segmentation = np.array(s.category_mask.numpy_view()).reshape(h, w).astype(np.uint8)
            det.face_skin = np.array(s.confidence_masks[SEG_LABELS.index("face-skin")].numpy_view()).reshape(h, w).astype(np.float32)
        return det

    def close(self):
        self._lm.close()
        self._seg.close()
