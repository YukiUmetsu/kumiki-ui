#!/usr/bin/env bash
# Rebuilds the local tools of the painted storybook films in local-assets/storybook (git ignores it): the Python environment py/
# and the models in models/, from pinned public sources. Each file is checked with its SHA-256 and each clone with its commit.
# It never touches paintings/, voice/ or voices/. What the parts are: docs/component-specs/storybook-character.md#tools
#
#   bash scripts/storybook-setup.sh                  create what is missing; a part that verifies is skipped
#   bash scripts/storybook-setup.sh --check          verify only, download nothing; exit 1 when a part is not ok
#   bash scripts/storybook-setup.sh --only <part>    one part: py, esrgan, mediapipe, phonectc, klein, julius, segkit
#   bash scripts/storybook-setup.sh --klein-from-base   klein: quantize FLUX.2 Klein 4B here with mflux, instead of the pinned copy
#
# STORY_ROOT (default local-assets/storybook) is where this script writes, STORY_MODELS where the models go. The commands read
# STORY_PY (the Python) and STORY_MODELS (scripts/storybook-tools.mjs): set them too when you move the folder.
# STORY_PYTHON names the Python 3.12 that makes py/ (default python3.12 on PATH). HF_TOKEN is read from the environment only, for
# a Hugging Face model that has become gated; none of these is gated on 2026-11-25.
# Needs curl, openssl or shasum, git, make and a C compiler (xcode-select --install), and uv or Python 3.12. The commands also need
# ffmpeg, which this script does not install. MLX, and so mflux, runs on Apple silicon only.
# A part that differs from its pin is reported and left as it is: move it away and run again.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${STORY_ROOT:-$(dirname "$here")/local-assets/storybook}"
MODELS="${STORY_MODELS:-$ROOT/models}"
PYDIR="$ROOT/py"
REQS="$here/storybook-requirements.txt"
PARTS="py esrgan mediapipe phonectc klein julius segkit"
export HF_HUB_DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 PIP_DISABLE_PIP_VERSION_CHECK=1

HF=https://huggingface.co
KLEIN=mlx-community/FLUX.2-Klein-4B-6bit KLEIN_REV=76fd8a876cb61126fb1fdce97eb9464eab063ff5
BASE=black-forest-labs/FLUX.2-klein-4B BASE_REV=e7b7dc27f91deacad38e78976d1f2b499d76a294  # the revision that mflux 0.24.0 pins
EAR=prj-beatrice/japanese-hubert-base-phoneme-ctc-v4 EAR_REV=f5fe07043bcb0b77a86faf72ac6d8fc1ae558f99
JULIUS_URL=https://github.com/julius-speech/julius.git JULIUS_REV=1604011abafa2751181767f785e9aa4740743c65
SEGKIT_URL=https://github.com/julius-speech/segmentation-kit.git SEGKIT_REV=e0e8bbaf98e27d19dfc6fe8312be607ad03592ad
SEGKIT_HMM=models/hmmdefs_monof_mix16_gid.binhmm SEGKIT_HMM_SHA=58952ccfe60f283c7efb1c22f9e012c7d297429700b7eeb4b60f7651a6e65940
# Julius as it was built on 2026-11-24: rev.4.6 with the flags that let its old C compile with the clang of macOS.
JULIUS_CFLAGS='-O2 -Dstatic_assert=_Static_assert -Wno-error -Wno-implicit-function-declaration -Wno-implicit-int -std=gnu89'

# part|path in models|bytes|sha256|url
MANIFEST="
esrgan|RealESRGAN_x4plus_anime_6B.pth|17938799|f872d837d3c90ed2e05227bed711af5671a6fd1c9f7d7e91c911a61f155e99da|https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth
mediapipe|face_landmarker.task|3758596|64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff|https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
mediapipe|pose_landmarker_heavy.task|30664242|64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b|https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task
mediapipe|selfie_multiclass_256x256.tflite|16371837|c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0|https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite
phonectc|phonectc/README.md|3051|5f47bf95e6c1394f476179aa6fe98a3c25c44cf2b84cb7a1defa997b7bad1f36|$HF/$EAR/resolve/$EAR_REV/README.md
phonectc|phonectc/config.json|1440|3c3e7d96cf3cb38dc9c83193157569a150bf1592b9a1364d5f2b2e0f6cb49688|$HF/$EAR/resolve/$EAR_REV/config.json
phonectc|phonectc/model.safetensors|377659928|6707669b3b73e5471b7e879d33105f8c1821ccb8ba27048f539bf4d0c2a95d93|$HF/$EAR/resolve/$EAR_REV/model.safetensors
phonectc|phonectc/preprocessor_config.json|258|3698647300e38b0a83ccf0ee9b24834e2d262157410305d54a3a1f655ead3002|$HF/$EAR/resolve/$EAR_REV/preprocessor_config.json
phonectc|phonectc/special_tokens_map.json|91|44436637858e2b38677c3dfbb0d212fa8a07e926881869d3978d67bd3df052f6|$HF/$EAR/resolve/$EAR_REV/special_tokens_map.json
phonectc|phonectc/tokenizer_config.json|4230|c03718343a9199a0821d543cdbcd3e2cfc9cd8374ceba653839451debb378911|$HF/$EAR/resolve/$EAR_REV/tokenizer_config.json
phonectc|phonectc/vocab.json|550|9c5c09049b351bf19479c84c646c69dd3f6fa12c2030b4318215ba4458211b05|$HF/$EAR/resolve/$EAR_REV/vocab.json
klein|klein6/README.md|1166|e1c2661fcfc2a0142a93243cc720ad24deb5996ba96db95dc07a406aae15a7d8|$HF/$KLEIN/resolve/$KLEIN_REV/README.md
klein|klein6/text_encoder/0.safetensors|2141676510|b5e839249c9b5c89e53c5d287bd6d474ecc52c6d54921ac79c7f8a10d26a6b1a|$HF/$KLEIN/resolve/$KLEIN_REV/text_encoder/0.safetensors
klein|klein6/text_encoder/1.safetensors|1126908657|55e1c8566e217d328cf680542eedb2795a297f7552a913f35c7f1434a1997d59|$HF/$KLEIN/resolve/$KLEIN_REV/text_encoder/1.safetensors
klein|klein6/text_encoder/model.safetensors.index.json|51332|1746436a0a644d8effbd56ec5f8002a6f21147373f6c71f8be78faa1fb7ca420|$HF/$KLEIN/resolve/$KLEIN_REV/text_encoder/model.safetensors.index.json
klein|klein6/tokenizer/chat_template.jinja|4168|a55ee1b1660128b7098723e0abcd92caa0788061051c62d51cbe87d9cf1974d8|$HF/$KLEIN/resolve/$KLEIN_REV/tokenizer/chat_template.jinja
klein|klein6/tokenizer/tokenizer.json|11422650|be75606093db2094d7cd20f3c2f385c212750648bd6ea4fb2bf507a6a4c55506|$HF/$KLEIN/resolve/$KLEIN_REV/tokenizer/tokenizer.json
klein|klein6/tokenizer/tokenizer_config.json|376|779410a34a98fb2c6c925a1be6f24d632f1723473161b037f6676eb6c04886c6|$HF/$KLEIN/resolve/$KLEIN_REV/tokenizer/tokenizer_config.json
klein|klein6/transformer/0.safetensors|2136462405|ccabe963580d0dd0a564c7dbc3dec64faf9a3273efca5c17eaadeef19c9aa9db|$HF/$KLEIN/resolve/$KLEIN_REV/transformer/0.safetensors
klein|klein6/transformer/1.safetensors|1012473181|f2f773dad83df1f84c703ec60bf5903202cdd2dea4916c8fbf98d83feca86cdc|$HF/$KLEIN/resolve/$KLEIN_REV/transformer/1.safetensors
klein|klein6/transformer/model.safetensors.index.json|26908|a9b629311aba0a0570c4aa17039dc81d4f8ecaf4b90e725fbb467a67bee1f6ac|$HF/$KLEIN/resolve/$KLEIN_REV/transformer/model.safetensors.index.json
klein|klein6/vae/0.safetensors|165632200|958149aded596c638046b358ccfa9952e087076b129f2f1c3cd0c7afc976b802|$HF/$KLEIN/resolve/$KLEIN_REV/vae/0.safetensors
klein|klein6/vae/model.safetensors.index.json|17547|2f63730bf814527cc2b78ff1f4340ca85117b584c1798f20cef0d1ff3d180026|$HF/$KLEIN/resolve/$KLEIN_REV/vae/model.safetensors.index.json
"

usage() { sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }
check_only=0 only="" klein_base=0
while [ $# -gt 0 ]; do
  case "$1" in
    --check) check_only=1 ;;
    --only) only="${2:-}"; shift ;;
    --only=*) only="${1#--only=}" ;;
    --klein-from-base) klein_base=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done
if [ -n "$only" ]; then case " $PARTS " in *" $only "*) ;; *) echo "--only takes one of: $PARTS" >&2; exit 2 ;; esac; fi

size() { stat -c %s "$1" 2>/dev/null || stat -f %z "$1"; }
sha256() {
  local s; s="$(openssl dgst -sha256 -r "$1" 2>/dev/null | cut -c1-64 || true)"
  [ ${#s} -eq 64 ] || s="$(shasum -a 256 "$1" | cut -c1-64)"
  echo "$s"
}
need() { local t; for t in "$@"; do command -v "$t" >/dev/null 2>&1 || { echo "  needs $t on PATH" >&2; exit 1; }; done; }

# Sets ST (ok, missing or differs) and DETAIL for the files of a part in MANIFEST.
files_status() {
  local part="$1" p path bytes sum url f n=0 miss=0 bad=0 first=""
  while IFS='|' read -r p path bytes sum url <&3; do
    [ "$p" = "$part" ] || continue
    n=$((n + 1)); f="$MODELS/$path"
    if [ ! -f "$f" ]; then miss=$((miss + 1)); [ -n "$first" ] || first="no models/$path"
    elif [ "$(size "$f")" != "$bytes" ] || [ "$(sha256 "$f")" != "$sum" ]; then bad=$((bad + 1)); first="models/$path is not the pinned file"
    fi
  done 3<<EOF
$MANIFEST
EOF
  if [ $bad -gt 0 ]; then ST=differs; DETAIL="$bad of $n files differ: $first"
  elif [ $miss -gt 0 ]; then ST=missing; DETAIL="$miss of $n files missing: $first"
  else ST=ok; DETAIL="$n file$([ $n -eq 1 ] || echo s), SHA-256 as pinned"; fi
}

# Downloads one file to <file>.part, checks its SHA-256 and moves it in place. A wrong file is deleted and the script stops (exit 3).
fetch() {
  local url="$1" dest="$2" bytes="$3" sum="$4" part="$2.part" got bar=-sS
  [ -t 2 ] && bar=--progress-bar
  mkdir -p "$(dirname "$dest")"
  if [ -f "$part" ] && [ "$(size "$part")" -gt "$bytes" ]; then rm -f "$part"; fi
  if [ ! -f "$part" ] || [ "$(size "$part")" != "$bytes" ]; then
    echo "  get $url"
    if [ -n "${HF_TOKEN:-}" ] && [ "${url#"$HF"/}" != "$url" ]; then
      curl -fL $bar --retry 3 --proto '=https' --proto-redir '=https' -C - -o "$part" -K <(printf 'header = "Authorization: Bearer %s"\n' "$HF_TOKEN") "$url" || got=fail
    else
      curl -fL $bar --retry 3 --proto '=https' --proto-redir '=https' -C - -o "$part" "$url" || got=fail
    fi
    if [ "${got:-}" = fail ]; then
      echo "  could not download $url" >&2
      [ "${url#"$HF"/}" = "$url" ] || echo "  If Hugging Face asks for a login, the model has become gated: accept its terms on its page and set HF_TOKEN." >&2
      exit 1
    fi
  fi
  got="$(sha256 "$part")"
  if [ "$got" != "$sum" ]; then
    rm -f "$part"
    echo "  $url has SHA-256 $got, pinned $sum: deleted. Stop." >&2
    exit 3
  fi
  mv "$part" "$dest"
}

files_build() {
  local part="$1" p path bytes sum url f
  while IFS='|' read -r p path bytes sum url <&3; do
    [ "$p" = "$part" ] || continue
    f="$MODELS/$path"
    if [ -f "$f" ] && [ "$(size "$f")" = "$bytes" ] && [ "$(sha256 "$f")" = "$sum" ]; then continue; fi
    fetch "$url" "$f" "$bytes" "$sum"
  done 3<<EOF
$MANIFEST
EOF
}

# A shallow clone of one commit, made in <dir>.part and moved in place when its HEAD is the pinned commit.
clone() {
  local url="$1" rev="$2" dir="$3"
  need git
  rm -rf "$dir.part"; mkdir -p "$(dirname "$dir")"
  echo "  clone $url at $rev"
  git init -q "$dir.part"
  git -C "$dir.part" remote add origin "$url"
  git -C "$dir.part" fetch -q --depth 1 origin "$rev"
  git -C "$dir.part" -c advice.detachedHead=false checkout -q FETCH_HEAD
  if [ "$(git -C "$dir.part" rev-parse HEAD)" != "$rev" ]; then rm -rf "$dir.part"; echo "  $url did not give commit $rev. Stop." >&2; exit 3; fi
  mv "$dir.part" "$dir"
}

# Sets ST and DETAIL for a clone: missing, not a clone, or another commit.
clone_status() {
  local dir="$1" rev="$2" at
  if [ ! -e "$dir" ]; then ST=missing; DETAIL="no ${dir#"$ROOT"/}"; return; fi
  if [ ! -d "$dir/.git" ]; then ST=differs; DETAIL="${dir#"$ROOT"/} is not a git clone"; return; fi
  at="$(git -C "$dir" rev-parse HEAD 2>/dev/null || echo none)"
  if [ "$at" != "$rev" ]; then ST=differs; DETAIL="${dir#"$ROOT"/} is at $at, pinned $rev"; return; fi
  ST=ok
}

# Prints "<ok|missing|differs> <detail>" for the Python that runs it, against the requirements file given as its argument.
PYCHECK='
import importlib.metadata as md, re, sys
norm = lambda n: re.sub(r"[-_.]+", "-", n).lower()
have = {norm(d.metadata["Name"]): d.version for d in md.distributions() if d.metadata["Name"]}
want = {}
for row in open(sys.argv[1]):
    row = row.split("#")[0].strip()
    if row: name, version = row.split("=="); want[norm(name)] = version.strip()
v = "%d.%d.%d" % sys.version_info[:3]
bad = ["%s %s (pinned %s)" % (n, have[n], w) for n, w in want.items() if n in have and have[n] != w]
miss = [n for n in want if n not in have]
if sys.version_info[:2] != (3, 12): print("differs Python %s, pinned 3.12" % v)
elif bad: print("differs %d packages: %s" % (len(bad), ", ".join(bad[:3])))
elif miss: print("missing %d packages: %s" % (len(miss), ", ".join(miss[:3])))
else: print("ok Python %s, %d packages as pinned in scripts/storybook-requirements.txt" % (v, len(want)))
'

status_py() {
  local py="${STORY_PY:-$PYDIR/bin/python}" out
  if [ ! -x "$py" ]; then ST=missing; DETAIL="no $py"; return; fi
  out="$("$py" -I -c "$PYCHECK" "$REQS" 2>/dev/null)" || { ST=differs; DETAIL="$py does not run"; return; }
  ST="${out%% *}"; DETAIL="${out#* }"
}

build_py() {
  local base="${STORY_PYTHON:-python3.12}"
  if [ -n "${STORY_PY:-}" ]; then echo "  STORY_PY is set ($STORY_PY): this script does not change that Python." >&2; exit 1; fi
  if [ -e "$PYDIR" ] && [ ! -x "$PYDIR/bin/python" ]; then echo "  $PYDIR is there without bin/python: move it away." >&2; exit 1; fi
  command -v "$base" >/dev/null 2>&1 || { echo "  needs Python 3.12 (brew install python@3.12), or STORY_PYTHON=/path/to/python3.12" >&2; exit 1; }
  if command -v uv >/dev/null 2>&1; then
    [ -x "$PYDIR/bin/python" ] || uv venv -q --python "$base" "$PYDIR"
    uv pip install --python "$PYDIR/bin/python" -r "$REQS"
  else
    [ -x "$PYDIR/bin/python" ] || "$base" -m venv "$PYDIR"
    "$PYDIR/bin/python" -m pip install --no-input -r "$REQS"
  fi
}

status_esrgan() { files_status esrgan; }
build_esrgan() { files_build esrgan; }
status_mediapipe() { files_status mediapipe; }
build_mediapipe() { files_build mediapipe; }
status_phonectc() { files_status phonectc; }
build_phonectc() { files_build phonectc; }

status_klein() {
  local mark="$MODELS/klein6/.from-base" d miss=""
  if [ ! -f "$mark" ]; then files_status klein; return; fi
  for d in text_encoder tokenizer transformer vae; do [ -n "$(ls -A "$MODELS/klein6/$d" 2>/dev/null)" ] || miss="$miss $d"; done
  if [ -n "$miss" ]; then ST=missing; DETAIL="quantized here, but empty or missing:$miss"
  else ST=ok; DETAIL="quantized here from $(cat "$mark"): no pinned SHA-256 for these files"; fi
}

build_klein() {
  if [ $klein_base = 0 ]; then files_build klein; return; fi
  # FLUX.2 Klein 4B at the revision that mflux pins, quantized to 6 bits by mflux's own save command. The base (about 16 GB) comes
  # down into a cache in STORY_ROOT that is deleted after. Prefer the pinned copy: its files have known SHA-256.
  local py="$PYDIR/bin/python" cache="$ROOT/.hf-base"
  status_py; [ "$ST" = ok ] || { echo "  --klein-from-base needs the py part first ($DETAIL)." >&2; exit 1; }
  [ ! -e "$MODELS/klein6" ] || { echo "  models/klein6 is there: move it away to quantize the base." >&2; exit 1; }
  echo "  quantize $HF/$BASE at $BASE_REV to 6 bits with mflux"
  rm -rf "$MODELS/klein6.part"
  HF_HOME="$cache" "$py" -I -c 'import sys; from mflux.models.common.cli.save import main; sys.argv[0] = "mflux-save"; sys.exit(main())' \
    --model flux2-klein-4b --quantize 6 --path "$MODELS/klein6.part" || {
      echo "  mflux-save failed. If Hugging Face asks for a login, $BASE has become gated: accept its terms and set HF_TOKEN." >&2; exit 1; }
  echo "$BASE@$BASE_REV, 6 bits, mflux $("$py" -I -c 'import importlib.metadata as m; print(m.version("mflux"))')" > "$MODELS/klein6.part/.from-base"
  mv "$MODELS/klein6.part" "$MODELS/klein6"
  rm -rf "$cache"
}

status_julius() {
  local bin="$MODELS/julius/src/julius/julius" v
  clone_status "$MODELS/julius/src" "$JULIUS_REV"; [ "$ST" = ok ] || return 0
  if [ ! -x "$bin" ]; then ST=missing; DETAIL="the source is there but not built: no ${bin#"$ROOT"/}"; return; fi
  v="$("$bin" -version 2>&1 || true)"
  case "$v" in
    *"JuliusLib rev.4.6"*) ST=ok; DETAIL="commit ${JULIUS_REV:0:7}, built: JuliusLib rev.4.6" ;;
    *) ST=differs; DETAIL="${bin#"$ROOT"/} does not say JuliusLib rev.4.6" ;;
  esac
}

build_julius() {
  local dir="$MODELS/julius" build=""
  need git make cc
  [ -e "$dir/src" ] || clone "$JULIUS_URL" "$JULIUS_REV" "$dir/src"
  if [ "$(uname -s)" = Darwin ]; then build="$(uname -m | sed 's/^arm64$/aarch64/')-apple-darwin"; fi
  echo "  build Julius (logs: models/julius/conf.log, make.log)"
  ( cd "$dir/src" && CFLAGS="$JULIUS_CFLAGS" ./configure ${build:+--build="$build"} --without-sndfile --disable-sdl ) > "$dir/conf.log" 2>&1 ||
    { echo "  configure failed: see $dir/conf.log" >&2; exit 1; }
  # Only julius and the two libraries it needs: gramtools does not compile with the clang of macOS, and no command uses it.
  make -C "$dir/src" julius > "$dir/make.log" 2>&1 || { echo "  make failed: see $dir/make.log" >&2; exit 1; }
}

status_segkit() {
  local f="$MODELS/segkit/src/$SEGKIT_HMM"
  clone_status "$MODELS/segkit/src" "$SEGKIT_REV"; [ "$ST" = ok ] || return 0
  if [ ! -f "$f" ]; then ST=differs; DETAIL="the clone has no $SEGKIT_HMM"
  elif [ "$(sha256 "$f")" != "$SEGKIT_HMM_SHA" ]; then ST=differs; DETAIL="$SEGKIT_HMM is not the pinned file"
  else ST=ok; DETAIL="commit ${SEGKIT_REV:0:7}, $SEGKIT_HMM SHA-256 as pinned"; fi
}

build_segkit() { clone "$SEGKIT_URL" "$SEGKIT_REV" "$MODELS/segkit/src"; }

report() { printf '%-10s %-8s %s\n' "$1" "$2" "$3"; }
[ $check_only = 1 ] || echo "Storybook tools in $ROOT"
fail=0
for part in $PARTS; do
  [ -z "$only" ] || [ "$only" = "$part" ] || continue
  ST="" DETAIL=""
  "status_$part"
  if [ "$ST" = ok ] || [ $check_only = 1 ]; then report "$part" "$ST" "$DETAIL"; [ "$ST" = ok ] || fail=1; continue; fi
  if [ "$ST" = differs ]; then report "$part" differs "$DETAIL: left as it is; move it away and run again"; fail=1; continue; fi
  echo "$part: $DETAIL"
  mkdir -p "$MODELS"
  set +e
  ( set -e; "build_$part" )
  rc=$?
  set -e
  [ $rc -ne 3 ] || exit 1
  "status_$part"
  report "$part" "$ST" "$DETAIL"
  [ "$ST" = ok ] || fail=1
done
exit $fail
