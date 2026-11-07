"""Generate one sound with MOSS-SoundEffect v2 on Apple Silicon. `npm run sound:generate` runs this in its own environment.
It works offline from local weights. It writes a WAV, and it prints JSON with the time and the peak memory.
"""
import json
import os
import sys
import time
import wave

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import mlx.core as mx
import numpy as np
from moss_sfx_mlx.pipeline_mlx import MossSoundEffectPipeline

job = json.loads(sys.argv[1])
started = time.time()
pipe = MossSoundEffectPipeline.from_pretrained(job["weights"])
audio = np.array(pipe(prompt=job["prompt"], seconds=job["seconds"], num_inference_steps=job["steps"], cfg_scale=job["cfg"], seed=job["seed"]))
audio = audio[0] if audio.ndim == 3 else audio
pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
with wave.open(job["out"], "wb") as out:
    out.setnchannels(pcm.shape[0])
    out.setsampwidth(2)
    out.setframerate(pipe.sample_rate if hasattr(pipe, "sample_rate") else 48000)
    out.writeframes(pcm.T.tobytes())
print(json.dumps({"wallSeconds": round(time.time() - started, 1), "peakGb": round(mx.get_peak_memory() / 1e9, 2)}))
