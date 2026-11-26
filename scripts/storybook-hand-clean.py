"""One clean-up of a painted hand shape (storybook-hand-paint.py) by the local FLUX.2 Klein 4B, with the shape as the only
reference. It keeps the shape, the pose, the size and the place; it adds the ink, the knuckles and the nails of the kit.

  local-assets/storybook/py/bin/python -I scripts/storybook-hand-clean.py painted.png out-dir --side little \
      --pose "the fingers together and gently curved" [--seeds 1,2,3] [--models local-assets/storybook/models]

Writes out-dir/<stem>-<seed>.png for each seed. Look at all of them and keep one: the count of fingers and the side that
is seen are not checked here. Set-up of the model: docs/component-specs/storybook-character.md#tools
"""
import argparse, time
from pathlib import Path

SIDES = {"thumb": "seen from the thumb side", "little": "seen from the little-finger side, the thumb hidden behind the palm",
         "back": "seen from the back of the hand", "palm": "seen from the palm side",
         "little-palm": "seen between the little-finger side and the palm, the hollow of the palm showing and the tip of the thumb below it"}
a = argparse.ArgumentParser(); a.add_argument("painted"); a.add_argument("out"); a.add_argument("--side", choices=SIDES, required=True)
a.add_argument("--pose", default="the fingers together and gently curved"); a.add_argument("--seeds", default="1,2,3")
a.add_argument("--models", default=str(Path(__file__).resolve().parent.parent / "local-assets/storybook/models"))
o = a.parse_args()
from mflux.models.common.config.model_config import ModelConfig
from mflux.models.flux2.variants import Flux2KleinEdit

prompt = (f"Clean up this painting of a man's right hand into a finished storybook illustration: {o.pose}, {SIDES[o.side]}, "
          "the forearm coming in from the left. Keep the shape, the pose, the size and the place exactly. Hand-painted watercolor "
          "washes, warm skin, fine dark brown ink outline, colored pencil texture, fingers with knuckles and nails, white paper background.")
m = Flux2KleinEdit(model_config=ModelConfig.flux2_klein_4b(), model_path=str(Path(o.models) / "klein6"))
Path(o.out).mkdir(parents=True, exist_ok=True)
for s in (int(x) for x in o.seeds.split(",")):
    t = time.time()
    im = m.generate_image(seed=s, prompt=prompt, width=1024, height=768, guidance=1.0, image_paths=[Path(o.painted)], num_inference_steps=4, scheduler="flow_match_euler_discrete")
    p = Path(o.out) / f"{Path(o.painted).stem}-{s}.png"; im.save(path=str(p)); print(p, round(time.time() - t, 1), "s", flush=True)
