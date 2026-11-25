#!/usr/bin/env python3
"""Drafts a front kit for the RIG1 painted look: one full-body painting in an A-pose and a few paintings of its face become a
rig, without outlines cut by hand. Landmarks (MediaPipe) say where the joints, the jaw and the lips are; the gaps of the
painting say where an arm ends and a chest begins; skin colour says where a sleeve ends.

  python scripts/storybook-rig.py card.json [...] --src paintings --out assets --models dir [--look dir]

The models are face_landmarker.task, pose_landmarker_heavy.task and selfie_multiclass_256x256.tflite of MediaPipe.
--look writes a picture of the parts of each figure.

Card (points are pixels of the painting):
  id, height           name, and height in centimetres (top of the hair or hat to the sole)
  painting             RGBA, or on white paper; front, arms a little away from the body;  sharp: the same painting at a whole multiple of the size
  view?, like?         "rear" and the card of the front: the figure from behind. It has no face, and fix.head says what its head is and
                       fix.pose where its joints are: { mid: x of the middle, shoulder, elbow, wrist, hand, hip, knee, ankle, toe: [x, y] on the left; the other side is mirrored }
  head                 { box: [x, y, size], sharp? }  the square of the head that the paintings of the face show
  shows                what the face of the painting shows: "rest", "open" (mouth), "joy" (mouth open, eyes closed) or "narrow" (eyes)
  faces                { rest, a, blink, joy }: paintings of that square; what the painting shows itself is not needed
  kit?                 a JSON beside the card with hand drawings for a whole cast: { of: cm from wrist to fingertip of the hand that they were drawn
                       for, sources, both: { name: hand as in storybook-art.py }, sockets: { name: { hand, at } } }. They get the size and the skin colour of this figure
  feet?                { kit: a JSON beside the card with feet in socks, from the front and from behind: { sources, front, rear: { source, poly, steps?, ankle, ground, cloth: [x, y, half] } },
                       tone: colour of the socks, wide: 1, steps?: more on the drawing (the split of tabi), cut: { f, b: y in a painted sock that goes on, or the line of a hem [[x, y], ...] } }: the drawing "sock" of feet and legs
  sources?, hands?     more drawings of hands; `f` and `b` hold for that hand, `both` for both (the other one mirrored)
  loose?               [{ id, poly, at, to, parent, z, sway? }] a part that trails: a pony tail, a scarf end
  fix?                 { off: [polygons that are not the figure: its shadow], head: [polygons that are head], body: [polygons that are not], neck: [polygons], under: {f, b: [x, y] armpit},
                         cuff: {f, b: share of the forearm}, skirt: bool, open: [points in holes that are holes: an ear ring],
                         sleeve: {f, b: [[x, y], ...] inner edge of a sleeve that hangs, from the armpit down. Its corner past the cuff hangs on a bone of its own, and the cloth is drawn in when the elbow bends} }
  body?, sockets?, lookFor?, expression?, sounds?, provenance?
"""
import argparse, importlib.util, json, math
from pathlib import Path
import cv2
import numpy as np

_s = importlib.util.spec_from_file_location("storybook_art", Path(__file__).with_name("storybook-art.py")); art = importlib.util.module_from_spec(_s); _s.loader.exec_module(art)

OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
JAW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]
LIPS = [61, 291, 13, 14, 0, 17, 40, 37, 267, 270, 91, 84, 314, 321, 78, 308, 81, 311, 178, 402]  # LIP_MARKS of rig-face.ts
EYES = ([33, 133, 159, 145], [263, 362, 386, 374]); BROWS = ([70, 63, 105, 66, 107], [300, 293, 334, 296, 336])
K = 2  # pixels of a layer for each pixel of the painting


class Models:
    """MediaPipe, loaded once."""
    def __init__(self, folder):
        import mediapipe as mp
        from mediapipe.tasks.python import BaseOptions, vision
        self.mp, f = mp, Path(folder); at = lambda n: BaseOptions(model_asset_path=str(f / n))
        self.faces = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=at("face_landmarker.task"), min_face_detection_confidence=0.2))
        self.poses = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=at("pose_landmarker_heavy.task"), min_pose_detection_confidence=0.2))
        self.parts = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=at("selfie_multiclass_256x256.tflite"), output_category_mask=True))

    def image(self, rgb): return self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=np.ascontiguousarray(np.clip(rgb, 0, 255).astype(np.uint8)))

    def face(self, rgb, wide=0.0):
        """478 points [x, y, z] in pixels; `wide` adds paper round the picture, which small crops need."""
        h, w = rgb.shape[:2]; p = int(max(h, w) * wide); big = cv2.copyMakeBorder(rgb.astype(np.float32), p, p, p, p, cv2.BORDER_CONSTANT, value=(254, 254, 254)); s = 768 / max(big.shape[:2])
        r = self.faces.detect(self.image(cv2.resize(big, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)))
        if not r.face_landmarks: return None
        H, W = big.shape[:2]; return np.array([[q.x * W - p, q.y * H - p, q.z * W] for q in r.face_landmarks[0]])

    def pose(self, rgb):
        r = self.poses.detect(self.image(rgb)); h, w = rgb.shape[:2]
        if not r.pose_landmarks: raise SystemExit("There is no body in the painting.")
        return np.array([[q.x * w, q.y * h] for q in r.pose_landmarks[0]])

    def segment(self, rgb):
        """0 paper, 1 hair, 2 skin, 3 face, 4 clothes, 5 other things."""
        r = self.parts.segment(self.image(cv2.resize(rgb.astype(np.float32), (768, 768), interpolation=cv2.INTER_CUBIC))); return cv2.resize(r.category_mask.numpy_view().reshape(768, 768), rgb.shape[1::-1], interpolation=cv2.INTER_NEAREST)


def disc(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1,) * 2)
def grow(m, r): return (cv2.dilate(m.astype(np.uint8), disc(r)) if r > 0 else cv2.erode(m.astype(np.uint8), disc(-r))) > 0
def filled(shape, pts): m = np.zeros(shape, np.uint8); cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1); return m > 0


def biggest(m):
    c, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    return lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])) if c > 1 else m


def square(rgb, x, y, s):
    """A square of a picture, on paper where it leaves the picture."""
    p = int(s); big = cv2.copyMakeBorder(rgb.astype(np.float32), p, p, p, p, cv2.BORDER_CONSTANT, value=(254, 254, 254)); return big[int(y) + p:int(y) + p + p, int(x) + p:int(x) + p + p]


class Body:
    """The parts of one painting as masks, all in pixels of the painting."""
    def __init__(self, card, root, models):
        raw = cv2.imread(str(root / card["painting"]), cv2.IMREAD_UNCHANGED)
        if raw is None: raise SystemExit(f"There is no painting {card['painting']}.")
        raw = raw.astype(np.float32); self.card, self.fix, self.rear = card, card.get("fix", {}), card.get("view") == "rear"
        # what is not the figure becomes ground first, so that the ground is found between the feet too
        for p in self.fix.get("off", []): raw[filled(raw.shape[:2], p), :3] = np.median(raw[:12, :, :3].reshape(-1, 3), 0)
        self.rgb, self.a = (raw[..., 2::-1], raw[..., 3] / 255) if raw.shape[2] == 4 else art.matte(raw[..., ::-1])
        for p in self.fix.get("off", []): self.a = self.a * ~filled(self.a.shape, p)
        self.a = self.a * grow(biggest(self.a > 0.35), 2) if self.rear else self.a; self.h, self.w = self.a.shape; self.solid = self.a > 0.35
        self.over = over = self.rgb * self.a[..., None] + 255 * (1 - self.a[..., None]); self.pose = models.pose(over); self.yy, self.xx = np.mgrid[0:self.h, 0:self.w]
        x, y, s = self.box = card["head"]["box"]; rows = np.nonzero(self.solid.any(1))[0]; self.ground, self.crown = float(rows.max()) + 1, float(rows.min())
        if self.rear:
            # seen from behind there is no face: the sizes of the head are those of the front
            q = self.fix["pose"]
            for n, i in (("shoulder", 11), ("elbow", 13), ("wrist", 15), ("hand", 17), ("hand", 19), ("hip", 23), ("knee", 25), ("ankle", 27), ("toe", 31)): self.pose[i][:2], self.pose[i + 1][:2] = (2 * q["mid"] - q[n][0], q[n][1]), q[n]
            front = Body(card["like"], root, models); k = (self.ground - self.crown) / (front.ground - front.crown); mid = (self.pose[11] + self.pose[12]) / 2; self.face = (front.face - [front.shoulders[0], front.crown, 0]) * k + [mid[0], self.crown, 0]
        else:
            self.face = models.face(square(over, x, y, s), 0.2)
            if self.face is None: raise SystemExit(f"{card['id']}: there is no face in the head box.")
            self.face = self.face + [x, y, 0]
        # pinholes of the cut-out between an ear and the cheek are no pockets in the hair
        f, W = self.face, float(self.face[454][0] - self.face[234][0]); n, lab, st, mid = cv2.connectedComponentsWithStats((~self.solid).astype(np.uint8), connectivity=8); self.holes = np.zeros_like(self.solid)
        for i in range(1, n):
            if any(lab[int(q[1]), int(q[0])] == i for q in self.fix.get("open", [])): continue
            if not self.rear and st[i, 4] < 0.02 * W * W and f[234][0] - 0.2 * W < mid[i][0] < f[454][0] + 0.2 * W and f[33][1] < mid[i][1] < f[152][1] + 0.1 * W: self.holes |= lab == i
        self.holes = grow(self.holes, 2) & (self.holes | (self.a < 0.98)); self.a[self.holes] = 1; self.solid |= self.holes
        if self.holes.any(): self.over = over = cv2.inpaint(np.clip(over, 0, 255).astype(np.uint8), self.holes.astype(np.uint8), 3, cv2.INPAINT_TELEA).astype(np.float32)
        S = int(s * 1.7); ox, oy = int(x + s / 2 - S / 2), int(y - 10); seg = models.segment(square(over, ox, oy, S)); self.seg = np.zeros((self.h, self.w), np.uint8)
        X0, Y0, X1, Y1 = max(0, ox), max(0, oy), min(self.w, ox + S), min(self.h, oy + S); self.seg[Y0:Y1, X0:X1] = seg[Y0 - oy:Y1 - oy, X0 - ox:X1 - ox]; self.seg[~self.solid] = 0
        self.chin = self.face[152]; self.wide = float(self.face[454][0] - self.face[234][0])
        self.skin = np.median(np.concatenate([over[int(self.face[i][1]) - 3:int(self.face[i][1]) + 4, int(self.face[i][0]) - 3:int(self.face[i][0]) + 4].reshape(-1, 3) for i in (50, 280, 4, 9)]), 0)
        if self.rear: self.skin = front.skin; self.seg[:] = 0
        lab = cv2.cvtColor((over / 255).astype(np.float32), cv2.COLOR_RGB2LAB); d = lab - cv2.cvtColor((self.skin[None, None] / 255).astype(np.float32), cv2.COLOR_RGB2LAB)[0, 0]; self.skinny = (np.abs(d[..., 1]) < 11) & (np.abs(d[..., 2]) < 15) & (d[..., 0] > -32) & (d[..., 0] < 14) & self.solid
        self.hips = (self.pose[23] + self.pose[24]) / 2; self.shoulders = (self.pose[11] + self.pose[12]) / 2; self.cx = float((self.hips[0] + self.shoulders[0] + self.chin[0]) / 3)
        self.head_mask(); self.neck_mask(); self.legs_mask(); self.arm = {side: self.arm_mask(side) for side in "fb"}
        # a fingertip that stands by itself goes to its hand, other crumbs beside the legs go
        self.below &= ~self.arm["f"]["all"] & ~self.arm["b"]["all"]; n, lab, stats, _ = cv2.connectedComponentsWithStats(self.below.astype(np.uint8), connectivity=8)
        for i in range(1, n):
            if stats[i, 4] < 0.04 * stats[1:, 4].max():
                crumb = lab == i; self.below &= ~crumb
                for arm in self.arm.values():
                    if (grow(arm["hand"], 6) & crumb).any(): arm["all"] |= crumb; arm["hand"] |= crumb
        rest = self.solid & ~self.head & ~self.neck & ~self.arm["f"]["all"] & ~self.arm["b"]["all"] & ~self.below
        main = biggest(rest); self.trunk = main | (rest & grow(main, 4))  # crumbs that no part claims go to the trunk if they touch it
        # hair, an ear or a knot that only a thin line joins to the collar moves with the head
        r = max(2, round(0.028 * self.wide)); body = biggest(cv2.morphologyEx(self.trunk.astype(np.uint8), cv2.MORPH_OPEN, disc(r)) > 0); ends = self.trunk & ~grow(body, r + 2) & (self.yy < self.chin[1] + 0.4 * self.wide)
        if not self.rear: self.head |= ends; self.trunk &= ~ends

    def head_mask(self):
        if self.rear: self.head = np.any([filled(self.solid.shape, p) for p in self.fix["head"]], 0) & self.solid; return
        f, yy, xx, W = self.face, self.yy, self.xx, self.wide; jaw = np.array([f[i][:2] for i in JAW]); order = np.argsort(jaw[:, 0]); line = np.interp(xx[0], jaw[order, 0], jaw[order, 1], left=-1, right=-1)
        inside = (xx >= f[234][0]) & (xx <= f[454][0]); above = inside & (yy <= line[None, :] + 0.012 * W); ear = max(f[234][1], f[454][1]); beside = np.abs(xx - self.chin[0])
        hair, skin = np.isin(self.seg, (1, 5)), np.isin(self.seg, (2, 3)); side = ~inside & (yy > ear) & (hair | (skin & (yy < f[132][1] + 0.12 * W) & (beside < 0.75 * W))); under = inside & ~above & hair & (beside > 0.3 * W)
        m = self.solid & (above | (~inside & (yy <= ear)) | side | under)
        # the border between hair and clothes follows the colours
        band = np.full(m.shape, cv2.GC_PR_BGD, np.uint8); band[m] = cv2.GC_PR_FGD; band[grow(m, -5)] = cv2.GC_FGD; band[self.solid & ~grow(m, 5)] = cv2.GC_BGD; band[~self.solid] = cv2.GC_BGD
        q = slice(int(ear), min(self.h, int(self.chin[1] + 1.1 * W))), slice(max(0, int(f[234][0] - 1.4 * W)), min(self.w, int(f[454][0] + 1.4 * W))); g = band[q].copy()
        if (g == cv2.GC_FGD).any() and (g == cv2.GC_BGD).any():
            cv2.grabCut(self.over[q][..., ::-1].astype(np.uint8).copy(), g, None, np.zeros((1, 65)), np.zeros((1, 65)), 3, cv2.GC_INIT_WITH_MASK)
            m[q] = np.where(above[q], m[q], np.isin(g, (1, 3)) & self.solid[q] & (grow(hair, 5) | side)[q])
        for p in self.fix.get("head", []): m |= filled(m.shape, p) & self.solid
        for p in self.fix.get("body", []): m &= ~filled(m.shape, p)
        clean = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, disc(1)) > 0; m = (clean | (m & (above | (yy <= ear)))); main = biggest(m); self.head = (main | (m & grow(main, 3))) & self.solid
        # what it goes all round, by an ear or a cheek, is head too
        n, lab, st, mid = cv2.connectedComponentsWithStats((~self.head).astype(np.uint8), connectivity=4)
        for i in range(1, n):
            if st[i, 4] < 0.02 * W * W and mid[i][1] < f[152][1] + 0.1 * W: self.head |= (lab == i) & self.solid

    def neck_mask(self):
        W, (cx, cy), yy, xx = self.wide, self.chin[:2], self.yy, self.xx; skin = np.isin(self.seg, (2, 3))
        m = self.solid & ~self.head & (skin | self.skinny) & (np.abs(xx - cx) < 0.46 * W) & (yy > cy - 0.5 * W) & (yy < cy + 0.9 * W) & (skin | (yy < cy + 0.6 * W)); m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, disc(2)) > 0
        c, lab, _, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8); at = lab[int(cy + 0.05 * W):int(cy + 0.2 * W), int(cx - 0.1 * W):int(cx + 0.1 * W)]; at = at[at > 0]; self.neck = lab == np.bincount(at).argmax() if len(at) else np.zeros_like(m)
        for p in self.fix.get("neck", []): self.neck |= filled(m.shape, p) & self.solid & ~self.head
        self.neck = grow(self.neck, 1) & self.solid & ~self.head  # with the ink of its sides

    def legs_mask(self):
        y0 = int(self.hips[1]); between = ~self.solid & (self.xx > self.pose[28][0]) & (self.xx < self.pose[27][0]) & (self.yy > y0); rows = [y for y in range(y0, int(self.ground) - 8) if between[y:y + 6].any(1).all()]
        self.crotch = float(rows[0] if rows else self.ground); row = np.nonzero(between[min(int(self.crotch) + 3, self.h - 1)])[0]; self.cleft = float(row.mean()) if len(row) else self.cx
        # wide trousers pull the found hips down to the thighs: the joints are well over where the legs part
        if self.crotch < self.ground and self.crotch - y0 < 0.025 * (self.ground - self.crown) and self.crotch < (self.pose[25][1] + self.pose[26][1]) / 2:
            up = self.crotch - 0.055 * (self.ground - self.crown)
            for j in (23, 24): self.pose[j] = [self.pose[j][0], up, *self.pose[j][2:]]
            self.hips = [self.hips[0], up, *self.hips[2:]]
        knee = (self.pose[25][1] + self.pose[26][1]) / 2; self.skirt = self.fix.get("skirt", bool(self.crotch > knee - 0.12 * (knee - y0))); self.below = self.solid & (self.yy >= self.crotch)

    def arm_mask(self, side):
        """All in a picture where the arm is on the left; given back as it is."""
        flip = side == "b"; m = lambda a: a[:, ::-1] if flip else a; X = lambda p: np.array([self.w - 1 - p[0] if flip else p[0], p[1]], float); back = lambda p: [float(self.w - 1 - p[0] if flip else p[0]), float(p[1])]
        S, E, Wr = (X(self.pose[j]) for j in ((12, 14, 16) if side == "f" else (11, 13, 15))); tip = np.mean([X(self.pose[j]) for j in ((18, 20) if side == "f" else (17, 19))], 0); tip = tip + (tip - Wr) * 0.35
        solid, A, skin = m(self.solid), m(self.solid & ~self.head & ~self.neck), m(self.skinny); cx = self.w - 1 - self.cx if flip else self.cx; yy, xx = self.yy, self.xx; rows = np.arange(self.h); ax = np.interp(rows, [S[1], E[1], Wr[1], tip[1]], [S[0], E[0], Wr[0], tip[0]]); L1, L2 = np.hypot(*(E - S)), np.hypot(*(Wr - E)); inner = np.full(self.h, np.nan)
        for y in range(int(S[1] + 0.12 * L1), min(self.h, int(tip[1] + 0.3 * L1))):
            gap = np.nonzero(~solid[y])[0]; gap = gap[(gap > ax[y] + 2) & (gap < cx)]
            if len(gap): inner[y] = gap[0]
        ok = np.isfinite(inner); run = [y for y in range(self.h - 10) if ok[y:y + 10].all()]
        drawn = sorted((X(q) for q in self.fix.get("sleeve", {}).get(side, [])), key=lambda q: q[1])
        if len(drawn):
            P = drawn[0]; below = run and max(run[0], int(drawn[-1][1])) or self.h; ok &= rows >= below; y = np.arange(int(P[1]), min(below, int(drawn[-1][1]) + 1)); inner[y] = np.interp(y, [q[1] for q in drawn], [q[0] for q in drawn]); ok[y] = True
        elif side in self.fix.get("under", {}): P = X(self.fix["under"][side])
        elif run: P = np.array([inner[run[0]], run[0]], float)
        else: raise SystemExit(f"{self.card['id']}: there is no gap beside arm {side}; give fix.under.")
        ys = np.nonzero(ok & (rows >= P[1]))[0]; edge = np.interp(rows, ys, inner[ys]) if len(ys) else np.full(self.h, P[0])
        col = int(np.clip(S[0] + 0.16 * (cx - S[0]), 0, self.w - 1)); top = np.nonzero(A[:, col])[0]; T = np.array([col, top.min() if len(top) else S[1] - 0.2 * L1], float)
        # the armhole: the gap beside an arm often begins well under the armpit, and what is over it is the side of the body
        cut = self.fix.get("hole", {}).get(side); seam = [X(q) for q in cut["seam"]] if cut else [np.array([T[0], max(T[1], S[1] - 0.25 * L1)]), P]
        if not cut and P[1] > S[1] + 0.42 * L1: k = (S[1] + 0.42 * L1 - seam[0][1]) / (P[1] - seam[0][1]); seam[1] = seam[0] + k * (P - seam[0])
        T, pit = seam[0], seam[-1]; path = np.array([*seam, *(X(q) for q in (cut or {}).get("side", []))] + ([P] if P[1] > pit[1] else []))
        lim = np.where(yy >= P[1], edge[:, None] + 1, np.interp(rows, path[:, 1], path[:, 0])[:, None]); arm = A & (xx <= lim) & (yy > T[1] - 0.1 * L1) & (yy < tip[1] + 0.5 * L1)
        n, lab, _, _ = cv2.connectedComponentsWithStats(arm.astype(np.uint8), connectivity=8); l = lab[int(E[1]), int(E[0])]; arm = lab == l if l else biggest(arm)
        d = (Wr - E) / L2; s2 = (xx - E[0]) * d[0] + (yy - E[1]) * d[1]; n2 = -(xx - E[0]) * d[1] + (yy - E[1]) * d[0]; share = []
        # a thumb stands off from the hand, over a gap of its own
        n, lab, _, _ = cv2.connectedComponentsWithStats((A & (s2 > 0.9 * L2) & (np.hypot(xx - Wr[0], yy - Wr[1]) < 1.15 * np.hypot(*(tip - Wr)))).astype(np.uint8), connectivity=8); own = np.unique(lab[arm]); thumb = np.isin(lab, own[own > 0]); arm = arm | thumb
        for q in range(int(0.2 * L2), int(1.35 * L2)): row = (s2 >= q) & (s2 < q + 3) & arm & (np.abs(n2) < 0.45 * L2); share.append(skin[row].mean() if row.any() else 0)
        hit = np.nonzero(np.convolve(share, np.ones(9) / 9, "same") > 0.5)[0]; cuff = float(0.2 * L2 + hit[0]) if len(hit) else float(L2)
        if side in self.fix.get("cuff", {}): cuff = self.fix["cuff"][side] * L2
        bare = bool(cuff < 0.72 * L2); hand = arm & (s2 > (L2 - 8 if bare else cuff - 1)) & (np.abs(n2) < 0.8 * L2)
        wide = side in self.fix.get("sleeve", {})
        if wide:  # a sleeve that hangs past the wrist: the hand is the skin alone, also inside the mouth of the sleeve
            past = arm & (s2 > cuff - 0.35 * L2); hand = biggest(cv2.morphologyEx((past & skin).astype(np.uint8), cv2.MORPH_CLOSE, disc(4)) > 0); hand = (grow(hand, 1) | (grow(hand, 3) & (s2 > cuff + 6))) & past
        # the cap of the shoulder stays with the chest, under the sleeve, and a strip of cloth down the side
        k = np.clip((yy - T[1]) / max(1, pit[1] - T[1]), 0, 1); cap = arm & (yy < P[1]) & (xx > lim - np.maximum(0.018 * L1, 0.1 * L1 * np.sqrt(np.clip(np.sin(np.pi * (0.12 + 0.88 * k)), 0, 1)))); rim = [(float(np.argmax(cap[y])), float(y)) for y in range(int(T[1] + 0.35 * (P[1] - T[1])), int(P[1])) if cap[y].any()]
        at = np.argwhere(hand)[:, ::-1]; far = at[np.argmax((at - Wr) @ d)] if len(at) else tip
        return {"all": m(arm), "hand": m(hand), "cap": m(cap), "rim": [back(p) for p in rim], "s": back(S), "e": back(E), "w": back(Wr), "tip": back(far), "p": back(P), "seam": [back(p) for p in seam], "cuff": cuff, "bare": bare, "wide": wide, "lip": float(np.percentile(n2[hand & (s2 < cuff + 8)], 95)) if wide else 0.0, "past": float(np.percentile(n2[arm & (np.abs(s2) < 0.2 * L2)], 98)), "L1": float(L1), "L2": float(L2), "s2": m(s2), "n2": m(n2), "d": np.array([-d[0] if flip else d[0], d[1]])}


def up(m): return cv2.resize(np.ascontiguousarray(m).astype(np.float32), None, fx=K, fy=K, interpolation=cv2.INTER_LINEAR)
def grain(shape, amount, seed=7): g = cv2.GaussianBlur(np.random.default_rng(seed).normal(0, 1, shape).astype(np.float32), (0, 0), 0.9 * K); return (g / g.std() * amount)[..., None]
def fade(v, lo, hi): t = np.clip((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t)


def fair(rgb, m):
    """The colour of lit skin: what is painted and is neither ink nor paper."""
    v = rgb[m]; lum = v.mean(1); v = v[(lum > 96) & (lum < 250)]; lum = v.mean(1); return np.median(v[lum > np.percentile(lum, 40)], 0)


def hand_kit(kit, root, own, size):
    """Hand drawings of a cast, in the size and with the skin of one figure."""
    sources = {}
    for n, q in kit["sources"].items():
        rgb = art.load(root / q["file"]); ink = np.abs(rgb - 255).max(2) > 26; sources[n] = {**q, "skin": [*([round(float(t), 1) for t in c] for c in (fair(rgb, ink), own)), kit.get("calm", 0.55)]}
    k = size / kit["of"]; hands = {n: {**h, "length": h["length"] * k} for n, h in kit["both"].items()}
    return sources, hands, {f"{n}-{s}": {"bone": f"hand-{s}", "layer": f"hand-{s}", **q} for n, q in kit.get("sockets", {}).items() for s in "fb"}


def foot_kit(feet, root, joints, ground, cm, rear):
    """Feet in socks for one figure: they stand where its shoes stood, the drawing as upright as it is painted."""
    kit = feet["kit"]; q = kit["rear" if rear else "front"]; x, y, r = q["cloth"]; cloth = art.load(root / kit["sources"][q["source"]]["file"])[y - r:y + r, x - r:x + r].reshape(-1, 3)
    sources = {q["source"]: {**kit["sources"][q["source"]], "skin": [[round(float(t), 1) for t in np.median(cloth, 0)], feet["tone"]]}}; hands = {}
    for side, fl in (("f", 1), ("b", -1)):
        J = joints["leg" + side.upper()]; d = np.array(J["tip"], float) - J["end"]; L = math.hypot(*d); k = (ground - J["end"][1]) / (q["ground"] - q["ankle"][1])
        hands[f"foot-{side}"] = {"sock": {**{n: q[n] for n in ("source", "poly", "soft") if n in q}, "steps": [{"rgb": feet["tone"], **st} if "paint" in st else st for st in [*q.get("steps", []), *feet.get("steps", [])]], "wrist": q["ankle"], "knuckle": [q["ankle"][0] + fl * d[0] / k, q["ankle"][1] + d[1] / k], "length": L * cm, "cuff": round(math.degrees(math.atan2(d[0], d[1])), 2), "mirror": fl < 0, "wide": feet.get("wide", 1)}}
    return sources, hands


def line(shape, pts, width):
    c = np.zeros(shape, np.uint8); cv2.polylines(c, [np.round(np.array(pts) * K * 16).astype(np.int32)], False, 255, max(1, round(width * K)), cv2.LINE_AA, 4); return cv2.GaussianBlur(c.astype(np.float32) / 255, (0, 0), 0.5 * K)


def plain(rgb, k, at, badges):
    """A badge with the letters of a real company gets a plain spoked wheel: `field` covers what is inside `r`."""
    rgb = rgb.copy()
    for q in badges:
        c, r = (np.array(q["at"], float) - at) * k, q["r"] * k; yy, xx = np.mgrid[0:rgb.shape[0], 0:rgb.shape[1]].astype(np.float32); t = (1 - fade(np.hypot(xx - c[0], yy - c[1]), r - 0.6 * k, r + 0.6 * k))[..., None]; rgb = rgb * (1 - t) + (np.array(q["field"], np.float32) + grain(rgb.shape[:2], 3)) * t
        m = np.zeros(rgb.shape[:2], np.uint8); i = lambda v: int(round(v * 16)); w = max(1, round(0.12 * r)); o = (i(c[0]), i(c[1]))
        cv2.circle(m, o, i(0.66 * r), 255, w, cv2.LINE_AA, 4); cv2.circle(m, o, i(0.2 * r), 255, -1, cv2.LINE_AA, 4)
        for j in range(8): a = math.pi * j / 4; cv2.line(m, o, (i(c[0] + 0.66 * r * math.cos(a)), i(c[1] + 0.66 * r * math.sin(a))), 255, max(1, round(0.09 * r)), cv2.LINE_AA, 4)
        t = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.25 * k)[..., None]; rgb = rgb * (1 - t) + (np.array(q["mark"], np.float32) + grain(rgb.shape[:2], 5)) * t
    return np.clip(rgb, 0, 255)


def draft(card, root, models):
    b = Body(card, root, models); size = (b.w * K, b.h * K); sharp = cv2.imread(str(root / card["sharp"]), cv2.IMREAD_COLOR)[:, :, ::-1].astype(np.float32) if card.get("sharp") else cv2.resize(b.over, size, interpolation=cv2.INTER_CUBIC)
    if sharp.shape[1::-1] != size: sharp = cv2.resize(sharp, size, interpolation=cv2.INTER_AREA)
    sharp = plain(sharp, K, (0, 0), card.get("badges", []))
    alpha = np.clip(cv2.resize(b.a, size, interpolation=cv2.INTER_CUBIC), 0, 1); dark = np.percentile(sharp[alpha > 0.9].mean(1), 2); ink = np.array([dark * 0.95, dark * 0.8, dark * 0.75]); paint = art.bleed(sharp, alpha); shape = alpha.shape
    def mask(m, soft=0.8):
        """A soft edge inside the painting, its own edge at the outline."""
        q = cv2.GaussianBlur(up(m | (grow(m, 4) & ~b.solid)), (0, 0), soft * K / 2); return np.clip(q * 2 - 0.5 if soft < 2 else q, 0, 1)
    plate = lambda rgb, a: {"rgb": np.clip(rgb, 0, 255), "a": np.clip(a, 0, 1).astype(np.float32), "k": K}
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.float32) / K; P = lambda i: [float(v) for v in b.pose[i][:2]]; mix = lambda rgb, other, m: rgb * (1 - m[..., None]) + other * m[..., None]
    W, chin, hips = b.wide, b.chin, b.hips; H = b.ground - b.crown; layers, joints, extra = [], {}, []; neckY = float(chin[1] + 0.4 * (b.shoulders[1] - chin[1])); headY = float(chin[1] - 0.117 * (chin[1] - b.crown))

    # ---- legs
    for side, z, (ih, ik, ia, it) in (("b", 6, (23, 25, 27, 31)), ("f", 8, (24, 26, 28, 32))):
        hip, knee, ankle, toe = P(ih), P(ik), P(ia), P(it); foot = b.ground - ankle[1]; lo = ankle[1] + 0.15 * foot; half = (xx < b.cleft + 4) if side == "f" else (xx > b.cleft - 4); rgb = paint.copy(); hem = 1 - fade(yy, lo - 2, lo + 5)
        if b.skirt:
            hip, knee = [ankle[0], hip[1]], [ankle[0], knee[1]]  # under a skirt the legs stand straight: then it hangs as it was painted
            # the leg goes on under the hem: the row below the hem, pulled up
            a = alpha * (half & (yy >= b.crotch - 2)); row = int((b.crotch + 6) * K); zone = (yy < b.crotch + 5) & (yy > b.crotch - 0.07 * H) & half; rgb = np.where(zone[..., None], paint[row:row + 1] + grain(shape, 2.5), rgb); a = np.where(zone, np.broadcast_to(a[row:row + 1], shape), a) * hem
        else: a = alpha * half * (yy > hip[1] + 0.2 * (b.crotch - hip[1])) * np.clip(up(b.trunk | b.below) * 2 - 0.5, 0, 1) * hem
        # one foot: nothing of the other shoe, and nothing of a hem
        own = b.solid & ((b.xx < b.cleft + 4) if side == "f" else (b.xx > b.cleft - 4)) & (b.yy > ankle[1] - 0.16 * foot) & ((b.yy > b.crotch + 4) | (not b.skirt)); own = np.clip(up(grow(biggest(own), 7)), 0, 1) * (fade(yy, b.crotch + 2, b.crotch + 6) if b.skirt else 1)
        layers.append({"id": f"foot-{side}", "z": z - 1, "grid": [4, 4], "bind": {"kind": "rigid", "bone": f"foot-{side}"}, "plate": plate(paint, alpha * half * own * fade(yy, ankle[1] - 0.16 * foot, ankle[1] - 0.08 * foot))})
        layers.append({"id": f"leg-{side}", "z": z, "grid": [6, 26], "bind": {"kind": "limb", "upper": f"thigh-{side}", "lower": f"shin-{side}", "soft": 0.14 * math.dist(hip, knee), "root": {"bone": "pelvis", "soft": 0.05 * H}}, "plate": plate(rgb, a)})
        joints["leg" + side.upper()] = {"top": hip, "mid": knee, "end": ankle, "tip": [toe[0], float(b.ground - 6)]}
        if card.get("feet"): c = card["feet"]["cut"][side]; flat = isinstance(c, (int, float)); at = np.full(size[0], c, np.float32) if flat else np.interp(xx[0], *np.array(c, float).T).astype(np.float32); layers[-1]["alt"] = {"sock": plate(rgb, a * (1 - fade(yy - at, *((-7, 7) if flat else (-1.5, 1.5)))))}

    # ---- trunk, with the caps of the shoulders and a margin under the head
    m = b.trunk | b.arm["f"]["cap"] | b.arm["b"]["cap"]; rgb, a = paint.copy(), alpha * mask(m); bay = lambda a, r: (cv2.morphologyEx(a.astype(np.uint8), cv2.MORPH_CLOSE, disc(r)) > 0) & ~m
    hidden = (bay(m, 30) | bay(m | b.neck, 5)) & b.head & ~grow(filled((b.h, b.w), b.face[OVAL][:, :2]), 2)  # what hair covers of the cloth: bays of it, and nothing above its edge
    hidden &= biggest(m | hidden)
    fill = cv2.GaussianBlur(art.bleed(b.over, grow(m, -3).astype(np.float32)), (0, 0), 1.5); rgb = mix(rgb, cv2.resize(fill, size, interpolation=cv2.INTER_CUBIC) + grain(shape, 3), np.clip(up(hidden), 0, 1)); a = np.maximum(a, cv2.GaussianBlur(up(hidden), (0, 0), 1.0))
    for side in "fb":
        if len(b.arm[side]["rim"]) > 4: c = line(shape, b.arm[side]["rim"], 1.6) * 0.75; rgb = mix(rgb, ink, c); a = np.maximum(a, c * up(b.arm[side]["cap"]))
    if b.skirt:
        a = a * (yy <= b.crotch + 4); pulls = [{"bone": "pelvis", "from": [b.cx, hips[1] - 0.1 * H], "to": [b.cx, hips[1] - 0.01 * H]}] + [{"bone": f"thigh-{s}", "from": [b.cx, hips[1] + 0.02 * H], "to": [b.cx + w * 0.09 * H, b.crotch + 0.1 * H]} for s, w in (("f", -1), ("b", 1))]
    else: a = a * (1 - fade(yy, b.crotch - 0.028 * H, b.crotch + 2)); pulls = [{"bone": "pelvis", "from": [b.cx, hips[1] - 0.13 * H], "to": [b.cx, hips[1] - 0.02 * H]}]
    layers.append({"id": "torso", "z": 12, "grid": [18, 24 if b.skirt else 20], "turns": "trunk", "bind": {"kind": "skin", "bone": "torso", "pulls": pulls}, "plate": plate(rgb, a)})

    # ---- neck: under the collar, and up behind the jaw
    rows = np.nonzero(b.neck.any(1))[0]
    if len(rows):
        ny = int(np.clip(chin[1] + 0.03 * W, rows.min(), rows.max())); spans = [np.nonzero(b.neck[y])[0] for y in range(ny, min(ny + 8, b.h)) if b.neck[y].any()]; x0, x1, top = float(np.median([r.min() for r in spans])), float(np.median([r.max() for r in spans])), float(chin[1] - 0.42 * W)
        rgb, a = paint.copy(), alpha * mask(b.neck); dim = b.neck & (b.yy < ny + 10); tone = np.median(b.over[dim], 0) if dim.any() else b.skin * 0.9
        column = cv2.GaussianBlur(filled(shape, np.array([[x0 + 2, top], [x1 - 2, top], [x1 - 1, ny + 6], [x0 + 1, ny + 6]]) * K).astype(np.float32), (0, 0), 0.8 * K); free = column * (1 - np.clip(up(b.neck) * 1.5, 0, 1)); rgb = mix(rgb, tone + grain(shape, 3), free); a = np.maximum(a, column)
        # no ink of the jaw is left on it, and its sides go on up
        seam = np.clip(up(grow(b.head, 5) & b.neck), 0, 1); rgb = mix(rgb, tone + grain(shape, 3), seam)
        for x in (x0 + 1, x1 - 1): c = line(shape, [[x, top], [x, ny + 1]], 1.3) * 0.7; rgb = mix(rgb, ink, c); a = np.maximum(a, c)
        # its skin goes on under the collar, and under that is the shade inside the collar: a turn uncovers both
        tuck = grow(b.neck, 15) & b.trunk & (b.yy > ny); own = cv2.GaussianBlur(art.bleed(b.over, grow(b.neck, -2).astype(np.float32)), (0, 0), 2) * 0.93; t = np.clip(up(tuck), 0, 1); rgb = mix(rgb, cv2.resize(own, size, interpolation=cv2.INTER_LINEAR) + grain(shape, 3), t); a = np.maximum(a, t)
        inside = grow(b.neck, 26) & (b.neck | b.trunk) & (b.yy > ny + 3); collar = grow(b.neck, 9) & ~grow(b.neck, 2) & b.trunk; shade = np.median(b.over[collar], 0) * 0.5 if collar.any() else tone * 0.5
        layers.append({"id": "nape", "z": 10.5, "grid": [6, 8], "turns": "trunk", "bind": {"kind": "skin", "bone": "torso", "pulls": []}, "plate": plate(np.broadcast_to(shade, (*shape, 3)) + grain(shape, 4, 9), np.minimum(alpha, cv2.GaussianBlur(up(inside), (0, 0), 1.5)))})
        layers.append({"id": "neck", "z": 11, "grid": [6, 10], "turns": "trunk", "density": card.get("density", 14) * 1.3, "bind": {"kind": "skin", "bone": "torso", "pulls": [{"bone": "head", "from": [float(chin[0]), float(chin[1] + 0.5 * (neckY - chin[1]) + 0.1 * W)], "to": [float(chin[0]), float(chin[1] - 0.1 * W)]}]}, "plate": plate(rgb, a)})

    # ---- arms and hands
    hands, kit, sources, sockets = {}, card.get("hands", {}), {}, {}
    if card.get("kit"):
        sources, shared, sockets = hand_kit(card["kit"], root, np.mean([fair(b.over, b.arm[s]["hand"]) for s in "fb"], 0), float(np.mean([math.dist(b.arm[s]["w"], b.arm[s]["tip"]) for s in "fb"])) * card["height"] / H); kit = {**kit, "both": {**shared, **kit.get("both", {})}}
    for side, z in (("b", 16), ("f", 17)):
        A = b.arm[side]; s2, n2 = up(A["s2"]), up(A["n2"]); cut = A["L2"] if A["bare"] else A["cuff"]; sleeve = mask(A["all"] if A["bare"] else A["all"] & ~A["hand"])
        slack = {"slack": {"upper": f"arm-{side}", "lower": f"fore-{side}", "side": int(np.sign((A["e"][0] - b.cx) * A["d"][1])), "past": A["past"], "cuff": A["cuff"]}} if A["wide"] else {}
        layers.append({"id": f"arm-{side}", "z": z, "grid": [16 if A["wide"] else 8, 26], "bind": {"kind": "limb", "upper": f"arm-{side}", "lower": f"fore-{side}", "soft": 0.17 * A["L1"], "root": {"bone": "torso", "soft": 0.28 * A["L1"], "hole": A["seam"]}, **slack}, "plate": plate(paint, alpha * sleeve * ((s2 < cut + (12 if A["bare"] else 3)) | (A["wide"] and n2 > A["lip"])))})
        if A["wide"]:  # what hangs past the wrist is a corner of its own, under the hand, with the lining that the hand covers
            m = A["all"] & ~A["hand"] & (A["s2"] > cut - 0.35 * A["L2"]) & (A["n2"] < A["lip"] + 3); low = np.argwhere(m)[:, ::-1]; to = [float(v) for v in low[np.argmax(low[:, 1])]]; row = low[np.abs(A["s2"][m] - cut) < 4]; at = [float(v) for v in row[np.argmin(np.abs(row[:, 0] - b.cx))] * 0.5 + row.mean(0) * 0.5]
            lining = (cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, disc(26)) > 0) & A["hand"]; fill = cv2.GaussianBlur(art.bleed(b.over, grow(m, -4).astype(np.float32)), (0, 0), 1.5) * 0.9; t = np.clip(up(grow(A["hand"], 3)), 0, 1)
            extra.append({"id": f"sleeve-{side}", "parent": f"fore-{side}", "at": at, "to": [at[0], to[1]], "hang": 1})
            layers.append({"id": f"sleeve-{side}", "z": z - 0.2, "grid": [10, 14], "bind": {"kind": "skin", "bone": f"fore-{side}", "pulls": [{"bone": f"sleeve-{side}", "from": at, "to": [at[0], to[1]]}], **slack}, "plate": plate(mix(paint, cv2.resize(fill, size, interpolation=cv2.INTER_LINEAR) + grain(shape, 3), t), alpha * mask(m | lining))})
        rgb, a = paint.copy(), alpha * mask(A["hand"], 1.6 if A["bare"] else 0.8)
        if A["bare"]: a = a * fade(s2, A["L2"] - 8, A["L2"] + 4)
        else:
            # the wrist goes on under the sleeve: its first rows, pulled up along the arm
            zone = (s2 < cut + 5) & (s2 > cut - 0.2 * A["L2"]) & (np.abs(n2) < 0.5 * A["L2"]); want = (cut + 5 - s2) * K * zone; gy, gx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.float32); mx, my = (gx + A["d"][0] * want).astype(np.float32), (gy + A["d"][1] * want).astype(np.float32)
            rgb, a = np.where(zone[..., None], cv2.remap(paint, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE), rgb), np.where(zone, cv2.remap(a.astype(np.float32), mx, my, cv2.INTER_LINEAR), a)
        own = {"easy": {"plate": plate(rgb, a), "wrist": A["w"], "knuckle": [(p + q) / 2 for p, q in zip(A["w"], A["tip"])]}}
        hands[f"hand-{side}"] = {**own, **{n: {**h, "mirror": bool(h.get("mirror")) != (side == "b")} for n, h in kit.get("both", {}).items()}, **kit.get(side, {})}
        layers.append({"id": f"hand-{side}", "z": z + (0.1 if A["bare"] else -0.1), "grid": [6, 6], "bind": {"kind": "rigid", "bone": f"hand-{side}"}, "rest": "easy"}); joints["arm" + side.upper()] = {"top": A["s"], "mid": A["e"], "end": A["w"], "tip": A["tip"]}

    if card.get("feet"): more, socks = foot_kit(card["feet"], root, joints, b.ground - 3, card["height"] / H, b.rear); sources, hands = {**sources, **more}, {**hands, **socks}

    # ---- head, at the size of the paintings of its face, and what trails
    x, y, s = b.box; pad = int(s); cut = lambda m: cv2.copyMakeBorder(m.astype(np.float32), pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)[int(y) + pad:int(y) + 2 * pad, int(x) + pad:int(x) + 2 * pad]
    hs = cv2.imread(str(root / card["head"]["sharp"]), cv2.IMREAD_COLOR)[:, :, ::-1].astype(np.float32) if card["head"].get("sharp") else cv2.resize(square(b.over, x, y, s), (1024, 1024), interpolation=cv2.INTER_CUBIC); hk = hs.shape[1] / s; to = lambda m, f=cv2.INTER_LINEAR: cv2.resize(cut(m), hs.shape[1::-1], interpolation=f)
    gap = (to(b.holes) > 0.05).astype(np.uint8); hs = cv2.inpaint(np.clip(hs, 0, 255).astype(np.uint8), cv2.dilate(gap, np.ones((int(3 * hk) | 1,) * 2, np.uint8)), 4 * hk, cv2.INPAINT_TELEA).astype(np.float32) if gap.any() else hs
    head = {"rgb": plain(hs, hk, (x, y), card.get("badges", [])), "a": np.clip(to(b.a, cv2.INTER_CUBIC), 0, 1), "cut": np.clip(cv2.GaussianBlur(to(b.head | (grow(b.head, 4) & ~b.solid)), (0, 0), 0.5 * hk) * 2 - 0.5, 0, 1), "k": hk, "at": (float(x), float(y))}
    for q in card.get("loose", []):
        extra.append({"id": q["id"], "parent": q["parent"], "at": q["at"], "to": q["to"], **({"sway": q["sway"]} if "sway" in q else {})}); m = filled((b.h, b.w), q["poly"]); d = np.array(q["to"], float) - q["at"]
        layers.append({"id": q["id"], "z": q["z"], "grid": [8, 12], **({"turns": True} if q["parent"] == "head" else {}), "bind": {"kind": "skin", "bone": q["parent"], "pulls": [{"bone": q["id"], "from": q["at"], "to": [float(q["at"][0] + 0.4 * d[0]), float(q["at"][1] + 0.4 * d[1])]}]}, "plate": plate(paint, alpha * mask(m, 3))})
        if q["parent"] == "head": head["cut"] = head["cut"] * (1 - np.clip(cv2.GaussianBlur(to(m), (0, 0), 1.5 * hk) * 1.4 - 0.2, 0, 1))
    layers.append({"id": "head", "z": 20, "density": card.get("headDensity", 25), "grid": [40, 40], "turns": True, "bind": {"kind": "rigid", "bone": "head"}, "head": True})

    joints.update({"pelvis": [float(hips[0]), float(hips[1] - 0.02 * H)], "neck": [float(chin[0]), neckY], "head": [float(chin[0]), headY], "crown": [float(chin[0]), b.crown], "ground": b.ground - 3, "over": float((P(27)[0] + P(28)[0]) / 2)}); half = (b.arm["b"]["p"][0] - b.arm["f"]["p"][0]) / 2; cm = card["height"] / H
    return {"id": card["id"], "height": card["height"], "density": card.get("density", 14), "joints": joints, "extra": extra, "layers": layers, "hands": hands, "sources": {**sources, **card.get("sources", {})}, "painting": {"rgb": b.over, "a": b.a}, "sockets": {**sockets, **card.get("sockets", {})}, "provenance": card.get("provenance", ""), "trunk": {"at": [b.cx, float((neckY + hips[1]) / 2)], "radius": [float(half * 1.02), float(0.85 * (hips[1] - neckY))]},
            "head": head, "body": {"facing": 270 if b.rear else 90, "palm": [0, round(0.044 * card["height"], 1)], "stance": {"arm-f": 11, "fore-f": -5, "hand-f": -2, "arm-b": -11, "fore-b": 5, "hand-b": 2, "head": 0, "neck": 0}, **card.get("body", {})}, **({} if b.rear else {"face": face_of(card, root, models, b, head)})}, b


def face_of(card, root, models, b, head):
    """The face of the head: 468 points, round regions for eyes and lips, paintings of it with marks on the lips."""
    x, y, s = b.box; shows, files, points = card.get("shows", "rest"), card["faces"], {}
    for n, f in files.items():
        rgb = art.load(root / f); p = models.face(rgb, 0.2)
        if p is None: raise SystemExit(f"{card['id']}: there is no face in {f}.")
        points[n] = p * (s / rgb.shape[1]) + [x, y, 0]
    own = {"rest": {"rest": b.face}, "open": {"a": b.face}, "joy": {"a": b.face, "joy": b.face}, "narrow": {"rest": b.face}}[shows]; points = {**own, **points}; neutral = points["rest"]; mesh = neutral[:468]; W = float(mesh[454][0] - mesh[234][0]); zero = np.mean([mesh[i][2] for i in OVAL]); E = lambda p, a: [float(p[a][0]), float(p[a][1])]
    eyes, lids = [], []
    for (o, i, u, l), brow in zip(EYES, BROWS):
        c = (neutral[o] + neutral[i]) / 2; wide = abs(neutral[o][0] - neutral[i][0]); high = max(abs(neutral[u][1] - neutral[l][1]), 0.28 * wide); e = {"at": [float(c[0]), float((neutral[u][1] + neutral[l][1]) / 2)], "radius": [float(0.5 * wide), float(0.62 * high)]}; eyes.append(e)
        above = min(1.25 * e["radius"][0], max(0.06 * W, e["at"][1] - max(neutral[k][1] for k in brow) - 0.02 * W)); lids.append([[e["at"][0] + 1.3 * e["radius"][0] * math.cos(t), e["at"][1] + (above if math.sin(t) < 0 else max(1.5 * e["radius"][1], 0.09 * W)) * math.sin(t)] for t in np.linspace(0, 2 * math.pi, 40, endpoint=False)])
    cheeks = [[[px, py + (0.07 * W if py > e["at"][1] else 0)] for px, py in q] for q, e in zip(lids, eyes)]
    lips = np.concatenate([p[LIPS] for n, p in points.items() if n != "blink"]); lx0, lx1, ly0 = float(lips[:, 0].min()), float(lips[:, 0].max()), float(lips[:, 1].min()); nose, chin = float(neutral[2][1]), float(neutral[152][1]); top, bottom = max(nose + 0.3 * (neutral[0][1] - nose), min(ly0 - 0.03 * W, neutral[0][1] - 0.02 * W)), chin - 0.035 * W; rx = min((lx1 - lx0) / 2 + 0.1 * W, 0.36 * W); bow = lambda v: math.copysign(abs(v) ** 0.7, v)
    mouth = [[(lx0 + lx1) / 2 + rx * bow(math.cos(t)), (top + bottom) / 2 + (bottom - top) / 2 * bow(math.sin(t))] for t in np.linspace(0, 2 * math.pi, 48, endpoint=False)]
    # it stays off the line of the jaw, which is never quite the same in two paintings
    oval, at = neutral[OVAL][:, :2].astype(np.float32).reshape(-1, 1, 2), ((lx0 + lx1) / 2, (top + bottom) / 2); off = lambda k, q: cv2.pointPolygonTest(oval, (at[0] + k * (q[0] - at[0]), at[1] + k * (q[1] - at[1])), True)
    mouth = [[at[0] + k * (q[0] - at[0]), at[1] + k * (q[1] - at[1])] for q in mouth for k in [next((k for k in np.linspace(1, 0.5, 26) if off(k, q) > 0.05 * W), 0.5)]]
    patch, marks = {}, lambda p: [E(p, i) for i in LIPS]
    def add(name, src, region, p=None): patch[name] = {"file": files.get(src), "region": region, **({"marks": marks(p)} if p is not None else {})}
    add("rest", "rest", "mouth", points["rest"]); add("a", "a", "mouth", points["a"]); add("closed", "blink", "eyes"); first = ["rest"]
    if shows in ("joy", "narrow") and "rest" in files: add("open", "rest", "eyes"); first = ["open", "rest"]
    if "joy" in points: add("joy", "joy", "cheeks"); add("laugh", "joy", "mouth", points["joy"])
    # the other sounds are the open mouth with its lips moved: its width in mouths at rest, the height of its opening in its own
    r0, a0 = np.array(patch["rest"]["marks"]), np.array(patch["a"]["marks"]); wide, aw, gap, mid, high = r0[1][0] - r0[0][0], a0[1][0] - a0[0][0], a0[3][1] - a0[2][1], (a0[0][0] + a0[1][0]) / 2, 0.35 * r0[2][1] + 0.65 * a0[2][1]
    def sound(w, h):
        out = []
        for px, py in a0: rel = py - a0[2][1]; out.append([float(mid + (px - mid) * w * wide / aw), float(high + (rel if rel < 0 else rel * h if rel <= gap else gap * h + rel - gap))])
        return out
    shapes = {"e": (1.02, 0.55), "i": (1.1, 0.26), "o": (0.66, 0.82), "u": (0.5, 0.36), "n": (0.92, 0.2), **{k: tuple(v) for k, v in card.get("sounds", {}).items()}}
    for n, q in shapes.items(): patch[n] = {"use": "a", "marks": patch["a"]["marks"], "shape": sound(*q)}
    c = r0.mean(0)[0]; patch["m"] = {"use": "rest", "marks": patch["rest"]["marks"], "shape": [[float(c + (px - c) * 0.86), float(py)] for px, py in r0]}
    looks = {"neutral": {"patches": first, "mouth": "rest"}, **({"laughing": {"patches": ["joy"], "mouth": "laugh", "shut": True}} if "joy" in patch else {})}
    cx = float((mesh[234][0] + mesh[454][0]) / 2); hrow = np.nonzero(b.head[int(mesh[234][1] - 0.15 * W)])[0]; rx = float(np.clip(min(cx - hrow.min(), hrow.max() - cx), 0.56 * W, 0.75 * W))
    return {"layer": "head", "eyes": eyes, "brows": [{"at": [float(np.mean([neutral[i][0] for i in q])), float(np.mean([neutral[i][1] for i in q]))], "radius": [0.16 * W, 0.08 * W]} for q in BROWS], "round": {"at": [cx, float(mesh[4][1] - 0.02 * W)], "radius": [rx, float(0.62 * (b.chin[1] - b.crown))]}, "regions": {"mouth": [mouth], "eyes": lids, "cheeks": cheeks}, "soft": 0.035 * W,
            "jaw": {"at": E(neutral, 152), "radius": [0.42 * W, 0.26 * W], "drop": 0.035 * W}, "patches": patch, "looks": looks, "lookFor": card.get("lookFor", {}), "lids": ["closed"], "shows": card.get("expression", 1), "mouths": {"rest": "rest", **{n: n for n in "aeiou"}, "n": "n", "closed": "m"}, "mouthFor": {"teeth": "i"}, "mesh": [[float(p[0]), float(p[1]), float(zero - p[2])] for p in mesh]}


def picture(recipe, b, path):
    """The parts in colours over the painting, with the joints."""
    v = b.over * 0.4 + 150
    def tint(m, c, k=0.4): v[m] = v[m] * (1 - k) + np.array(c) * k
    for n, c in (("head", (200, 90, 60)), ("neck", (240, 180, 90)), ("trunk", (70, 130, 190)), ("below", (110, 160, 90))): tint(getattr(b, n), c)
    for s, c in (("f", (170, 80, 170)), ("b", (90, 80, 190))): tint(b.arm[s]["all"], c); tint(b.arm[s]["hand"], (220, 60, 120)); tint(b.arm[s]["cap"], (20, 20, 20), 0.3)
    v = np.clip(v, 0, 255).astype(np.uint8).copy()
    for q in recipe["joints"].values():
        for p in q.values() if isinstance(q, dict) else [q] if isinstance(q, list) else []: cv2.circle(v, tuple(int(round(t)) for t in p), 5, (255, 255, 0), -1)
    cv2.imwrite(str(path), v[:, :, ::-1])


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("cards", nargs="+"); ap.add_argument("--src", required=True); ap.add_argument("--out", required=True); ap.add_argument("--models", required=True); ap.add_argument("--look"); ap.add_argument("--only-look", action="store_true"); o = ap.parse_args(); models = Models(o.models)
    for c in o.cards:
        card = json.loads(Path(c).read_text()); print(card["id"], flush=True)
        if card.get("like"): card["like"] = json.loads((Path(c).parent / card["like"]).read_text())
        for own in (card, card.get("feet", {})):
            if own.get("kit"): own["kit"] = json.loads((Path(c).parent / own["kit"]).read_text())
        recipe, body = draft(card, Path(o.src), models)
        if o.look: Path(o.look).mkdir(parents=True, exist_ok=True); picture(recipe, body, Path(o.look) / f"{card['id']}_parts.png")
        if not o.only_look: art.build(recipe, Path(o.src), Path(o.out))
