/**
 * Figure-specific facial ink layers. A scroll hermit is not the young reader
 * with wrinkles overlaid, and the mobile mountain traveler is not the same
 * face with a new hat. Separate anatomical contour rhythms and values.
 *
 * ArtCraft observations: Zeng Jing's Portrait of Pan Qintai (UMMA), the
 * museum's Ming/Qing face studies and the original project teacher portraits.
 * Technique references guide translucent modeling, not copied paths.
 * All positions use the source-projected 260×340 portrait coordinate system.
 */
import type {CharacterPathShape} from "../../registry/character/definition";
import type {ShanshuiScene} from "../../registry/video/ink-shanshui";
import {inkPressureStroke} from "./ink-shanshui-fine-craft";

const p=(d:string,fill="none",stroke="$shadow",width=.6,opacity=.5):
  CharacterPathShape=>({type:"path",d,fill,stroke,strokeWidth:width,opacity});
const brush=(a:[number,number],b:[number,number],
  c:[number,number],d:[number,number],width:number,seed:number,
  ink="$shadow",opacity=.6):CharacterPathShape=>inkPressureStroke({
    from:{x:a[0],y:a[1]},c1:{x:b[0],y:b[1]},c2:{x:c[0],y:c[1]},
    to:{x:d[0],y:d[1]},width,seed,ink,opacity,samples:18,
  });

export const SHANSHUI_PORTRAIT_OBSERVATIONS={
  "misty-hermit":{
    age:"older scholar with deeply set asymmetric eyes",
    characteristic:"Malar and nasolabial folds meet a weathered thin beard",
    expression:"distant, contemplative—not an identical young-reader eye",
  },
  "mountain-trail":{
    age:"adult traveler, slightly leaner, windward expression",
    characteristic:"One lifted lateral brow and distinct nasal silhouette",
    expression:"focused sideways gaze beneath the trailing head tie",
  },
} as const;

/** Independent identity-preserving stroke groups, zero at detail=0. The
 * shared blink and mouth controllers remain authoritative; this only
 * supplies small local relief marks and iris geometry where appropriate. */
export function shanshuiOtherFaceCraft(scene:ShanshuiScene,detail=1):Record<string,CharacterPathShape[]> {
  if(!Number.isFinite(detail)||detail<0||detail>1)
    throw new RangeError("Face craft detail must be in 0..1.");
  if(scene==="river-scholar"||detail<.45)return {};
  const high=detail>=.8;
  if(scene==="misty-hermit"){
    const face=[
      // A pale sunken eye well with restrained ink accumulation, neither
      // heavy polygonal eye bags nor random parallel hatch.
      p("M117.8 101.2 C123.5 97.9 131.9 100.6 134.2 104.5 C132.7 110.4 126 112.2 119.8 109.3 Z",
        "$skinshade","none",0,.19),
      p("M146.1 98.6 C151.6 96 158.6 96.6 161 100.7 C158.9 106.5 153.4 107.6 148 105.2 Z",
        "$skinshade","none",0,.16),
      p("M122.8 112.9 Q125.7 117.1 130.2 117.7",
        "none","$skinshade",.61,.53),
      p("M150.1 111 Q154.7 115.2 153.2 120.4",
        "none","$skinshade",.58,.5),
      // Muscular bridge and alar transition must join, rather than a
      // free-floating comma used as a generic nose.
      brush([148.1,101],[149,107],[150.2,111.6],[148.2,115.3],
        .61,822,"$shadow",.56),
      p("M146.2 116.1 Q144.4 118 141.6 117.1",
        "none","$shadow",.49,.57),
      p("M120.2 119.1 Q123.2 126.4 130.2 128.6",
        "none","$skinshade",.55,.42),
    ];
    if(high)face.push(
      p("M123.1 82.4 Q128.5 83.4 132 82.2",
        "none","$skinshade",.36,.3),
      p("M117.5 118 Q118.2 124 124.1 129.1",
        "none","$paper",.43,.34),
      p("M149.6 124.1 Q147.6 127.2 145.3 129.4",
        "none","$skinshade",.37,.37),
    );
    return {
      face,
      brow:[
        brush([115.6,94.6],[121.8,91.1],[127.5,92.1],[133.4,94.1],
          .58,823,"$ink",.72),
        p("M146.1 92.1 Q152.8 88.9 161.1 90",
          "none","$deep",.45,.44),
      ],
      "eyes-open":[
        p("M117.5 105.3 Q125.4 108.8 134.3 104.2",
          "none","$shadow",.63,.54),
        p("M146.8 103.2 Q153 106.3 160.4 100.3",
          "none","$shadow",.49,.46),
      ],
      "eyes-soft":[
        p("M118.4 107.8 Q127.1 109.7 133.7 106",
          "none","$skinshade",.52,.51),
      ],
      "eyes-closed":[
        p("M120 110 Q127 111.2 134.4 107.5",
          "none","$skinshade",.36,.36),
      ],
      "pupil-left":[
        p("M124.5 104.9 Q126.5 104.3 127.1 105.5 Q127.3 107 125.9 107.7 Q124.4 107.1 124.5 104.9 Z",
          "$shadow","none",0,.65),
      ],
      "pupil-right":[
        p("M153.2 101.8 Q154.9 101.2 155.6 102.5 Q155.7 104.1 154.2 104.3 Z",
          "$shadow","none",0,.62),
      ],
      "mouth-rest":[
        p("M132.2 127.6 Q139.1 129.5 146.6 125.4",
          "none","$skinshade",.4,.49),
      ],
    };
  }
  const face=[
    // The traveler's windward temple forms a more angular, lean face; no
    // hollowed elder's eye bags or recycled scholar's high nose.
    p("M116.5 103.4 C121.4 106.3 125.8 108.8 130.8 108.1 C126.3 110.7 120.7 108.8 116.5 103.4 Z",
      "$skinshade","none",0,.13),
    p("M146.4 101.5 C152.1 102.2 159 101.6 162 99.2 C159.8 105.3 151.9 106.2 146.4 101.5 Z",
      "$skinshade","none",0,.12),
    brush([150.7,101.2],[150.8,106.2],[148.5,111.8],[144.2,116.7],
      .6,854,"$shadow",.59),
    p("M145.1 117.2 Q140.8 120.8 137.4 118.8",
      "none","$skinshade",.43,.53),
    p("M117.1 119 Q121.1 127.5 129.5 132.8",
      "none","$skinshade",.43,.3),
  ];
  if(high)face.push(
    p("M120.2 112.4 Q125.6 114.5 131.1 112.7",
      "none","$skinshade",.37,.32),
    p("M155 117.2 Q153.9 122.7 151.1 126.5",
      "none","$paper",.4,.34),
    p("M130.4 134 Q134.2 137 137.9 136.7",
      "none","$skinshade",.31,.26),
  );
  return {
    face,
    brow:[
      brush([118.3,93.9],[124,91.1],[129.3,91.3],[135,93.3],
        .58,856,"$ink",.67),
      p("M147.5 91.7 Q156.4 89.8 163.7 92.4",
        "none","$deep",.44,.43),
    ],
    "eyes-open":[
      p("M119.1 104.5 Q126.5 107.6 134.3 103.3",
        "none","$shadow",.55,.51),
      p("M149 103 Q157 105.4 162.8 101.8",
        "none","$shadow",.45,.5),
    ],
    "eyes-soft":[
      p("M119.4 107.4 Q126 109.1 134.5 105.5",
        "none","$skinshade",.43,.44),
    ],
    "eyes-closed":[
      p("M119.4 109 Q128.5 110.2 135 106.6",
        "none","$skinshade",.4,.43),
    ],
    "pupil-left":[
      p("M124.3 103.5 Q126.1 102.8 126.8 104 Q126.8 106 125.2 106.5 Z",
        "$shadow","none",0,.59),
    ],
    "pupil-right":[
      p("M155.3 101.9 Q157 101.3 157.6 102.6 Q157.3 104.1 156.2 104.3 Z",
        "$shadow","none",0,.56),
    ],
    "mouth-rest":[
      p("M133.2 127.5 Q140 129 148 126",
        "none","$skinshade",.39,.38),
    ],
  };
}
