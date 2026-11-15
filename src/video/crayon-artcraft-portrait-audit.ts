/**
 * ArtCraft-v7 frozen, source-observed diagnostics ONLY.
 * Both landmark groups were independently annotated on real pixel captures.
 * This does not make the portrait source-derived or artistically approved.
 * CC0 browser-cropped screenshot (not the original JPEG): GH Action 43682633614.
 * Actual 540x960 rendered PR #281 frame 299: GH Action 43671953745.
 */
export const CRAYON_PORTRAIT_AUDIT={
  "source": {
    "link": "https://commons.wikimedia.org/wiki/File:Brunette_woman_portrait_(Unsplash).jpg",
    "preview": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Brunette_woman_portrait_%28Unsplash%29.jpg/960px-Brunette_woman_portrait_%28Unsplash%29.jpg",
    "author": "Christopher Campbell",
    "license": "CC0 1.0",
    "year": 2015,
    "width": 608,
    "height": 1082,
    "sha256": "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2",
    "artifact": "https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43682633614"
  },
  "candidate": {
    "width": 540,
    "height": 960,
    "sha256": "43e0bad437227d868da2e4f4e92502969e5210eddf9d204dabade05aa5e40cbd",
    "commit": "08ad7e158e8b5439ec5edec98c15bafcc4a0a483",
    "artifact": "https://github.com/YukiUmetsu/kumiki-ui/actions/runs/43671953745"
  },
  "sourcePoints": {
    "face_top": [
      281,
      288
    ],
    "face_left": [
      72,
      683
    ],
    "face_right": [
      501,
      709
    ],
    "chin": [
      398,
      858
    ],
    "eye_far_inner": [
      405,
      514
    ],
    "eye_far_outer": [
      463,
      513
    ],
    "eye_near_inner": [
      303,
      543
    ],
    "eye_near_outer": [
      222,
      544
    ],
    "brow_near_peak": [
      274,
      480
    ],
    "nose_root": [
      363,
      522
    ],
    "nose_tip": [
      411,
      631
    ],
    "nostril_near": [
      399,
      643
    ],
    "mouth_left": [
      348,
      741
    ],
    "mouth_right": [
      489,
      710
    ],
    "upper_lip": [
      418,
      708
    ],
    "lower_lip": [
      420,
      761
    ],
    "cheek_near": [
      211,
      658
    ],
    "hairline_center": [
      282,
      292
    ]
  },
  "candidatePoints": {
    "face_top": [
      278,
      158
    ],
    "face_left": [
      144,
      359
    ],
    "face_right": [
      405,
      347
    ],
    "chin": [
      278,
      509
    ],
    "eye_far_inner": [
      331,
      246
    ],
    "eye_far_outer": [
      377,
      249
    ],
    "eye_near_inner": [
      241,
      243
    ],
    "eye_near_outer": [
      174,
      241
    ],
    "brow_near_peak": [
      202,
      204
    ],
    "nose_root": [
      283,
      269
    ],
    "nose_tip": [
      304,
      376
    ],
    "nostril_near": [
      299,
      379
    ],
    "mouth_left": [
      235,
      439
    ],
    "mouth_right": [
      340,
      425
    ],
    "upper_lip": [
      283,
      431
    ],
    "lower_lip": [
      290,
      453
    ],
    "cheek_near": [
      196,
      352
    ],
    "hairline_center": [
      296,
      157
    ]
  },
  "tonalRegions": {
    "eye_socket": {
      "source": 126,
      "candidate": 45
    },
    "nose_planes": {
      "source": 110,
      "candidate": 16
    },
    "cheek_planes": {
      "source": 58,
      "candidate": 15
    },
    "lips": {
      "source": 123,
      "candidate": 17
    },
    "hair": {
      "source": 166,
      "candidate": 154
    }
  },
  "maxLandmarkError": 0.085,
  "minContrastFraction": 0.38
} as const;

export function crayonPortraitFrozenAudit(){
  const p=CRAYON_PORTRAIT_AUDIT;
  const names=Object.keys(p.sourcePoints) as (keyof typeof p.sourcePoints)[];
  const box=(pts:typeof p.sourcePoints|typeof p.candidatePoints,w:number,h:number)=>({
    left:pts.face_left[0]/w,top:pts.face_top[1]/h,
    width:(pts.face_right[0]-pts.face_left[0])/w,
    height:(pts.chin[1]-pts.face_top[1])/h,
  });
  const s=box(p.sourcePoints,p.source.width,p.source.height);
  const c=box(p.candidatePoints,p.candidate.width,p.candidate.height);
  const landmarks=names.map(name=>{
    const [sx,sy]=p.sourcePoints[name];
    const [cx,cy]=p.candidatePoints[name];
    const dx=((sx/p.source.width-s.left)/s.width)-
      ((cx/p.candidate.width-c.left)/c.width);
    const dy=((sy/p.source.height-s.top)/s.height)-
      ((cy/p.candidate.height-c.top)/c.height);
    return {name,error:Math.hypot(dx,dy)};
  });
  const failedLandmarks=landmarks.filter(x=>x.error>p.maxLandmarkError);
  const tonal=Object.entries(p.tonalRegions).map(([region,value])=>({
    region,source:value.source,candidate:value.candidate,
    required:Math.max(4.5,value.source*p.minContrastFraction),
    pass:value.candidate>=Math.max(4.5,value.source*p.minContrastFraction),
  }));
  const failedTonalRegions=tonal.filter(x=>!x.pass);
  const sourceAspect=(s.width*p.source.width)/(s.height*p.source.height);
  const renderAspect=(c.width*p.candidate.width)/(c.height*p.candidate.height);
  return {status:"REJECT" as const,inspectedLandmarks:names.length,
    landmarks,failedLandmarks,tonal,failedTonalRegions,
    faceAspectError:Math.abs(renderAspect/sourceAspect-1),
    artisticApproval:false as const,
    sourceOriginalBytesAvailable:false as const};
}
