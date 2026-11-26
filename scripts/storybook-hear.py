"""What a recording of Japanese speech holds: its phones, heard without knowing the text, and how its pitch goes.

Forced alignment always finds the phones that it is told. This hears them free: a word that the voice read another way, or a mora that
it left out, shows as a difference. The pitch is compared with the accents that OpenJTalk gives to the text.

  <json> | python scripts/storybook-hear.py --model dir      [{"id", "audio", "text", "phones": [...], "track": {...}?}]
  → [{"id", "heard": [...], "edits": [...], "accent": -1..1 | null, "pitch": [[phone, wanted high, semitones]...], "hz": median pitch}]
  <json> | python scripts/storybook-hear.py --pitch          [{"id", "audio"}] → [{"id", "hz"}], with no model

The model is prj-beatrice/japanese-hubert-base-phoneme-ctc-v4 (Apache-2.0), read from a folder. It needs torch and transformers; the
accents need pyopenjtalk (MIT) and are left out without it. Both stay on this computer.
"""
import argparse, json, re, subprocess, sys
import numpy as np

a = argparse.ArgumentParser(); a.add_argument("--model"); a.add_argument("--pitch", action="store_true"); o = a.parse_args()
if not o.pitch and not o.model: a.error("--model is needed to hear phones")
SAME = {"a:": "a a", "i:": "i i", "u:": "u u", "e:": "e e", "o:": "o o", "q": "cl", "I": "i", "U": "u", "dy": "j", "zy": "j", "sil": "", "pau": "", "sp": "", "PAD": ""}
plain = lambda ps: [q for p in ps for q in SAME.get(p, p).split()]


def sound(f):
    b = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.int16).astype(np.float64) / 32768


def ear(folder):
    import torch
    from transformers import HubertForCTC
    names = {v: k for k, v in json.load(open(f"{folder}/vocab.json")).items()}; model = HubertForCTC.from_pretrained(folder).eval()

    def part(x):
        # a little room: the model has never heard exact zeros
        x = np.concatenate([np.zeros(4800), x, np.zeros(4800)]) + np.random.default_rng(1).normal(0, 0.0012, len(x) + 9600)
        with torch.no_grad(): best = model(torch.from_numpy(x.astype(np.float32))[None]).logits[0].argmax(-1).tolist()
        return [names[k] for i, k in enumerate(best) if k != model.config.pad_token_id and (i == 0 or k != best[i - 1])]

    def whole(x, hop=160):
        # what is between two pauses is heard by itself
        level = np.array([np.sqrt((x[i:i + hop] ** 2).mean()) for i in range(0, len(x) - hop, hop)]); parts, start, quiet, end = [], None, 0, 0
        for i, on in enumerate(level > level.max() * 0.02):
            if on: start = i if start is None else start; quiet, end = 0, i
            elif start is not None:
                quiet += 1
                if quiet >= 22: parts.append((start, end)); start = None
        if start is not None: parts.append((start, end))
        return plain([p for s, e in parts for p in part(x[max(0, s - 3) * hop:(e + 5) * hop])])
    return whole


def edits(want, got):
    n, m = len(want), len(got); d = np.zeros((n + 1, m + 1), int); d[:, 0] = np.arange(n + 1); d[0] = np.arange(m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1): d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (want[i - 1] != got[j - 1]))
    out, i, j = [], n, m
    while i or j:
        if i and j and d[i, j] == d[i - 1, j - 1] + (want[i - 1] != got[j - 1]):
            if want[i - 1] != got[j - 1]: out.append(f"{want[i - 1]}>{got[j - 1]}@{i}")
            i, j = i - 1, j - 1
        elif i and d[i, j] == d[i - 1, j] + 1: out.append(f"-{want[i - 1]}@{i}"); i -= 1
        else: out.append(f"+{got[j - 1]}@{i}"); j -= 1
    return out[::-1]


def pitch(x, sr=16000, hop=160, W=800):
    """Hz every 10 ms, 0 where nothing is voiced: the best path through the correlations of neighbouring frames."""
    n = (len(x) - 2 * W) // hop
    if n < 3: return np.zeros(1)
    lags = np.unique(np.round(sr / np.geomspace(70, 420, 110)).astype(int)); R = np.zeros((n, len(lags))); E = np.zeros(n)
    for t in range(n):
        s, y = x[t * hop:t * hop + W], x[t * hop:t * hop + 2 * W]; r = np.fft.irfft(np.fft.rfft(y, 4 * W) * np.conj(np.fft.rfft(s, 4 * W)))[:W]; c = np.concatenate([[0], np.cumsum(y ** 2)])
        R[t] = (r / np.sqrt(np.maximum((c[W:2 * W] - c[:W]) * (s ** 2).sum(), 1e-9)))[lags]; E[t] = np.sqrt((s ** 2).mean())
    hz = sr / lags; cost = -(R + 0.05 * np.log2(hz / 100)); jump = 2.2 * np.abs(np.log2(hz)[:, None] - np.log2(hz)[None]); D, P = cost.copy(), np.zeros(cost.shape, int)
    for t in range(1, n): M = D[t - 1][None] + jump; P[t] = M.argmin(1); D[t] = cost[t] + M.min(1)
    k = int(D[-1].argmin()); path = [k]
    for t in range(n - 1, 0, -1): k = P[t, k]; path.append(k)
    path = np.array(path[::-1]); return np.where((R[np.arange(n), path] > 0.5) & (E > E.max() * 0.06), hz[path], 0)


def accents(text):
    import pyopenjtalk
    out = []
    for l in pyopenjtalk.extract_fullcontext(text):
        p = re.search(r"\-(.+?)\+", l).group(1)
        if p not in "aiueoNAIUEO": continue
        at = int(re.search(r"/A:[-\dx]+\+(\d+)\+", l).group(1)); n, acc = map(int, re.search(r"/F:(\d+)_(\d+)", l).groups()); acc = acc if 0 < acc <= n else 99
        out.append((p.lower(), at == 1 if acc == 1 else 1 < at <= acc, at))
    return out


def tune(x, text, track):
    """How the pitch goes with the accents: the correlation, inside each accent phrase, of what should be high and what is."""
    try: want = accents(text)
    except ImportError: return None, []
    F = pitch(x); voiced = F[F > 0]
    if not len(voiced): return None, []
    got = []
    for p in track["phones"]:
        if p["p"][0] not in "aiueoN": continue
        k = 2 if p["p"].endswith(":") else 1
        for j in range(k):
            s = F[max(0, int((p["start"] + (p["end"] - p["start"]) * j / k) * 100) - 2):int((p["start"] + (p["end"] - p["start"]) * (j + 1) / k) * 100) - 1]; s = s[s > 0]
            got.append((p["p"][0].lower(), float(12 * np.log2(np.median(s) / np.median(voiced))) if len(s) > 1 else None))
    if len(got) != len(want) or any(g[0] != w[0] and w[0] != "n" for g, w in zip(got, want)): return None, []
    rows = [[g[0], w[1], None if g[1] is None else round(g[1], 1)] for g, w in zip(got, want)]; starts = [i for i, w in enumerate(want) if i == 0 or w[2] < want[i - 1][2] or w[2] == 1 != want[i - 1][2]] + [len(want)]; num = den = da = 0.0
    for s, e in zip(starts, starts[1:]):
        q = [(1.0 if want[i][1] else 0.0, got[i][1]) for i in range(s, e) if got[i][1] is not None]
        if len(q) < 3: continue
        h, f = np.array([v[0] for v in q]), np.clip(np.array([v[1] for v in q]), -12, 12); h, f = h - h.mean(), f - f.mean(); num += (h * f).sum(); den += (h * h).sum(); da += (f * f).sum()
    return (round(num / np.sqrt(den * da), 2) if den * da > 0 else None), rows


def median_hz(x):
    F = pitch(x); F = F[F > 0]; return round(float(np.median(F)), 1) if len(F) else None


lines = json.load(sys.stdin); hear = None if o.pitch else ear(o.model); out = []
for l in lines:
    x = sound(l["audio"])
    if o.pitch: out.append({"id": l["id"], "hz": median_hz(x)}); continue
    heard = hear(x); acc, rows = tune(x, l["text"], l["track"]) if l.get("track") else (None, [])
    out.append({"id": l["id"], "heard": heard, "edits": edits(plain(l["phones"]), heard), "accent": acc, "pitch": rows, "hz": median_hz(x)})
print("\n" + json.dumps(out, ensure_ascii=False))  # libraries print, too: the answer is the last line
