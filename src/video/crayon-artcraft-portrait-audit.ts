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
    "height": 343,
    "sha256": "a7984f9e0322aefe2c55d3771b57c3c2f75a955268b57609e6647e946c6826ed",
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
      291,
      79
    ],
    "face_left": [
      221,
      197
    ],
    "face_right": [
      376,
      213
    ],
    "chin": [
      340,
      297
    ],
    "eye_far_inner": [
      344,
      169
    ],
    "eye_far_outer": [
      367,
      166
    ],
    "eye_near_inner": [
      309,
      177
    ],
    "eye_near_outer": [
      274,
      183
    ],
    "brow_near_peak": [
      291,
      152
    ],
    "nose_root": [
      325,
      175
    ],
    "nose_tip": [
      348,
      204
    ],
    "nostril_near": [
      341,
      215
    ],
    "mouth_left": [
      333,
      243
    ],
    "mouth_right": [
      374,
      230
    ],
    "upper_lip": [
      355,
      238
    ],
    "lower_lip": [
      360,
      251
    ],
    "cheek_near": [
      266,
      229
    ],
    "hairline_center": [
      299,
      89
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
      "source": 140,
      "candidate": 45
    },
    "nose_planes": {
      "source": 113,
      "candidate": 16
    },
    "cheek_planes": {
      "source": 97.1,
      "candidate": 15
    },
    "lips": {
      "source": 131,
      "candidate": 17
    },
    "hair": {
      "source": 157,
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
