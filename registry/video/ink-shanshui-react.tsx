import {useId,useMemo} from "react";
import type {ReactNode} from "react";
import {assertShanshuiControls,shanshuiAt,shanshuiHash} from "./ink-shanshui";
import type {ShanshuiControls,ShanshuiScene,ShanshuiMotion,InkRockSchool} from "./ink-shanshui";

/**
 * A procedural painter, NOT a flat bitmap disguised as a movie.
 *
 * Three separate independent visual vocabularies drawn in code:
 *  • distant mountain silhouettes, hemp-fiber slope contours & wet washes;
 *  • near pine/willow/bamboo, individually attached loaded needle/leaf gestures;
 *  • rock, path, water, arch, distant pavilion, sky and paper grain.
 *
 * The source reference images are never distributed or sampled as textures.
 * No interval, runtime randomness, image loading or independent animation clock.
 */
const W=960,H=540;
const INK="#493b2e",STONE="#82674d",PAPER="#f3e6cd";
type P=readonly [number,number];
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const f=(x:number)=>Number(x.toFixed(2));
const s=(seed:number,i:number)=>shanshuiHash(seed,i);
const quadraticPoint=(a:P,b:P,c:P,t:number):P=>{
  const u=1-t;
  return [u*u*a[0]+2*u*t*b[0]+t*t*c[0],
    u*u*a[1]+2*u*t*b[1]+t*t*c[1]];
};
const cubicPoint=(a:P,b:P,c:P,d:P,t:number):P=>{
  const u=1-t;
  return [
    u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],
    u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1],
  ];
};
/** Curved rock profiles have local fracture variation and non-regular slope
 * transitions, unlike polygons that look like paper triangles. The silhouette
 * is stable for a seed and its exact x stations are also used by cunfa strokes.
 */
/** Construct one fractured mountain silhouette. The exact same stations are
 * used for the filled contour, cliff brush roots, and moss deposits. Linear
 * interpolation over only the teacher nodes put some strokes into empty sky.
 */
const ridgeStations=(nodes:readonly P[],seed:number,band:number):P[]=>{
  const stations:P[]=[[f(nodes[0][0]),f(nodes[0][1])]];
  for(let i=0;i<nodes.length-1;i++){
    const a=nodes[Math.max(i-1,0)][1],b=nodes[i][1],
      c=nodes[i+1][1],d=nodes[Math.min(i+2,nodes.length-1)][1];
    const x0=nodes[i][0],x1=nodes[i+1][0];
    for(let k=1;k<=9;k++){
      const t=k/9,t2=t*t,t3=t2*t;
      const smooth=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+
        (-a+3*b-3*c+d)*t3);
      const shapeNoise=(shanshuiHash(seed+band*113,i*17+k)-.5)*2;
      // ArtCraft negative control: the earlier 25-node summit became
      // a saw-tooth ridge because every ~14px segment received a full
      // 4.5px independent ink fracture. Tooth amplitude must be tied to
      // the spatial span of the SAME parent rock, not its point count.
      // Long cliffs retain all their original seed-specific fracture.
      const segmentScale=Math.min(1,(x1-x0)/70);
      const fracture=(band===0?2.5:band===1?4.5:6.2)*
        segmentScale*Math.sin(Math.PI*t)*shapeNoise;
      stations.push([f(x0+(x1-x0)*t),f(smooth+fracture)]);
    }
  }
  return stations;
};
const ridgePath=(stations:readonly P[])=>
  stations.map(([x,y],i)=>(i?"L ":"M ")+x+" "+y).join(" ")+
  " L 1080 550 L -110 550 Z";
const ridgeHeight=(stations:readonly P[],x:number)=>{
  if(x<=stations[0][0])return stations[0][1];
  for(let i=0;i<stations.length-1;i++){
    const [x0,y0]=stations[i],[x1,y1]=stations[i+1];
    if(x<=x1)return y0+(y1-y0)*(x-x0)/(x1-x0);
  }
  return stations[stations.length-1][1];
};
const RIDGES:Record<ShanshuiScene,readonly (readonly P[])[]>={
  "misty-hermit":[
    [[-60,213],[70,170],[160,206],[247,112],[292,127],[360,213],[483,158],[571,201],[681,166],[790,186],[875,92],[940,110],[1040,195]],
    [[-50,302],[65,243],[133,259],[235,155],[278,202],[358,294],[492,218],[590,283],[672,226],[770,264],[840,150],[914,120],[1040,272]],
    [[-50,384],[64,326],[170,344],[263,260],[350,352],[448,306],[532,385],[646,290],[733,345],[828,244],[916,228],[1040,378]],
  ],
  "river-scholar":[
    [[-60,250],[88,210],[170,222],[260,177],[345,241],[447,154],[538,230],[653,178],[747,128],[825,159],[960,170],[1040,237]],
    [[-50,327],[67,267],[160,297],[265,231],[348,292],[460,223],[535,267],[620,174],[706,124],[755,146],[840,192],[1050,298]],
    [[-50,379],[90,344],[175,355],[259,295],[345,349],[464,309],[565,357],[635,259],[706,217],[790,266],[922,261],[1050,352]],
  ],
  "mountain-trail":[
    [[-60,235],[50,180],[152,204],[252,147],[312,192],[422,155],[489,178],[581,103],[624,117],[737,183],[832,149],[1030,230]],
    // Fuchun source: rolling crag shoulder, short rock saddles and an
    // uneven but continuous summit; NOT one geometric triangular apex.
    [[-60,334],[64,271],[146,288],[254,195],[340,251],
      [420,222],[452,202],[474,174],[492,153],[512,130],
      [531,111],[545,103],[559,105],[572,111],[588,126],
      [603,137],[622,166],[647,181],[672,172],[707,154],
      [741,159],[763,183],[790,208],[825,221],[1050,318]],
    [[-60,430],[78,359],[160,405],[275,298],[338,361],[427,304],[530,235],[586,274],[713,340],[812,295],[1050,383]],
  ],
};
/** One deliberately authored macro landform per master, not four coats
 * of different strokes on exactly the same generic triangle. All retain
 * monotone x stations, genuine ridgeHeight-rooted child anatomy, independent
 * depth bands and source-guided intentional voids. These are not tracings. */
const MASTER_TRAIL_MIDDLE:Record<Exclude<InkRockSchool,"fuchun">,readonly P[]>={
  "early-spring":[
    [-60,334],[64,271],[146,288],[254,195],[340,251],
    [408,220],[432,182],[451,159],[472,162],[488,173],
    [507,150],[527,119],[548,109],[565,120],[585,128],
    [601,116],[617,119],[638,156],[662,185],[690,173],
    [730,158],[755,181],[825,221],[1050,318],
  ],
  "travelers":[
    [-60,334],[64,271],[146,288],[254,195],[340,251],
    [382,261],[412,226],[438,164],[457,123],[483,93],
    [503,78],[529,76],[550,78],[573,84],[596,98],
    [615,127],[631,157],[650,187],[681,207],[719,190],
    [755,183],[794,205],[825,221],[1050,318],
  ],
  "forest-grotto":[
    [-60,334],[64,271],[146,288],[254,195],[340,251],
    [395,233],[421,201],[443,177],[462,149],[478,130],
    [494,139],[507,154],[526,137],[544,114],
    [561,94],[578,91],[597,111],[617,156],[636,162],
    [657,181],[684,175],[711,160],[748,183],[825,221],[1050,318],
  ],
};
/** Long, ridge-rooted hemp-fibre families with small alum-head rock
 * shelves. Huang Gongwang's contours accumulate in linked geological
 * groups; independent random raindrops would make the cliff look wet.
 *
 * Unlike the paper tint/gradient, every mark is rooted to the SAME
 * fractured ridge geometry as the outer silhouette. */
function RockInkPlanes({stations,seed,band,detail,mist}:{
  stations:readonly P[];seed:number;band:number;detail:number;mist:number;
}){
  const anchors=band===0?[116,255,564,755,890]:[82,247,345,532,711,857];
  const count=Math.round((band===0?7:band===1?12:17)*detail);
  return <g data-km-rock-plane-family={band}>
    {Array.from({length:count},(_,i)=>{
      const x=anchors[i%anchors.length]+
        (s(seed+band*491,i*17+41)-.5)*(band===0?48:74);
      const crest=ridgeHeight(stations,x);
      const rootY=crest+3.5+4*s(seed+91,i*11+band);
      const slope=clamp((ridgeHeight(stations,x+24)-
        ridgeHeight(stations,x-24))/48,-1.6,1.6);
      const length=(band===0?28:band===1?47:67)*
        (.72+.43*s(seed+317,i*11+9));
      const drift=clamp(slope*length*.5+
        (s(seed+409,i*7+band)-.5)*length*.22,
        -length*.49,length*.49);
      const inkWidth=(band===0?3.4:band===1?5.8:8.3)*
        (.62+.72*s(seed+503,i*23+1));
      const flex=(s(seed+521,i*29+17)-.5)*inkWidth*1.5;
      const opacity=(band===0?.19:band===1?.29:.37)*
        (1-.28*mist)*(.75+.35*s(seed+571,i*11+7));
      const vx=x+drift;
      const top="M"+f(x)+" "+f(rootY);
      // A soft, pressure-loaded shadow plane retreats to a narrow tail.
      const plane=top+
        " C"+f(x+flex*.31)+" "+f(rootY+length*.21)+
        " "+f(x+drift*.45-inkWidth*.35)+" "+f(rootY+length*.43)+
        " "+f(vx)+" "+f(rootY+length*.9)+
        " C"+f(x+drift*.58+inkWidth*.65)+" "+f(rootY+length*.63)+
        " "+f(x+flex+inkWidth)+" "+f(rootY+length*.23)+
        " "+f(x+inkWidth*.28)+" "+f(rootY+2.3)+" Z";
      // Dry lifted lines are interrupted; an uninterrupted long band
      // would instead read as computer-generated vertical rainfall.
      const fibre=top+
        " C"+f(x-inkWidth*.65)+" "+f(rootY+length*.17)+
        " "+f(x+drift*.38+flex*.3)+" "+f(rootY+length*.29)+
        " "+f(x+drift*.44)+" "+f(rootY+length*.45)+
        " M"+f(x+drift*.59+1.7)+" "+f(rootY+length*.57)+
        " Q"+f(vx+3)+" "+f(rootY+length*.72)+
        " "+f(vx)+" "+f(rootY+length*.88);
      const shelf="M"+f(x-inkWidth*.95)+" "+f(rootY+5)+
        " Q"+f(x+inkWidth*.44)+" "+f(rootY-4.5)+
        " "+f(x+inkWidth*1.55)+" "+f(rootY+2)+
        " Q"+f(x+inkWidth*.75)+" "+f(rootY+8)+
        " "+f(x+inkWidth*.23)+" "+f(rootY+9);
      return <g key={i} data-km-rock-ink-plane=""
        data-km-rock-plane-root={f(x)+","+f(rootY)}
        data-km-rock-plane-crest={f(crest)}
        data-km-rock-plane-style={i%3===0?"alum-head":"hemp-fibre"}>
        <path d={plane} fill={band===0?"#806c58":"#5b4837"}
          opacity={f(opacity)}/>
        <path d={fibre} fill="none"
          stroke={i%4===0?"#4b392d":"#796149"}
          strokeWidth={f(.63+1.18*s(seed+597,i*19))}
          strokeLinecap="round" opacity={f(.42+.31*s(seed+607,i*7))}/>
        <path d={shelf} fill="none"
          stroke="#5a4838" strokeWidth={f(.6+.6*s(seed+617,i*5))}
          opacity={f(opacity*1.6)} strokeLinecap="round"/>
        {/* Small non-uniform crest moss pockets grow where rock shelves
            catch moisture; their location derives from this same root. */}
        {band>0&&Array.from({length:i%3===0?5:3},(_,j)=>{
          const dx=(j-2)*2.1+1.6*(s(seed+641,i*17+j)-.5);
          const dy=5.4+(j%2)*1.3+s(seed+659,i*19+j)*3;
          return <ellipse key={j} data-km-rock-moss-pocket=""
            cx={f(x+dx)} cy={f(rootY+dy)}
            rx={f(.57+1.25*s(seed+673,i*23+j))}
            ry={f(.38+.75*s(seed+691,i*29+j))}
            fill="#493f30" opacity={f((.33+.28*s(seed+709,i*31+j))*(1-.23*mist))}/>;
        })}
      </g>;
    })}
  </g>;
}
/** Source-led Huang Gongwang mountain *bone* (shan gu): each dark
 * load starts at an actual peak on the same fractured silhouette as the
 * painted ridge. Lateral dry-fibre families branch from that bone; the
 * broader ink-water shoulder underneath them fades as the brush dries.
 * This is not generic noise randomly pasted across a mountain polygon.
 *
 * Source: Dwelling in the Fuchun Mountains, 1350 (NPM). Smarthistory's
 * 2023 detail shows curving densely loaded folds, secondary hemp fibres,
 * alum-head ledges, and deliberate unmarked paper between the slopes.
 */
/** A two-edge, pressure-sampled hemp-fibre ink gesture following one
 * quadratic spine. Each contour station uses its *local* tangent normal.
 * Avoid the two-C giant lens/wedge produced when the inner edge is
 * independently drawn far away from the same curved axis.
 */
function rockLoadedRibbon(root:P,control:P,tip:P,width:number,seed:number){
  const knots=[0,.035,.08,.14,.22,.32,.43,.54,.65,.75,.84,.91,.97,1] as const;
  const pressure=[0,.08,.25,.52,.82,1,.94,.78,.65,.48,.29,.16,.05,0] as const;
  const side=(sign:1|-1)=>knots.map((t,k):P=>{
    const point=quadraticPoint(root,control,tip,t);
    const tangent:P=[
      2*(1-t)*(control[0]-root[0])+2*t*(tip[0]-control[0]),
      2*(1-t)*(control[1]-root[1])+2*t*(tip[1]-control[1]),
    ];
    const norm=Math.max(.001,Math.hypot(...tangent));
    const broken=(k===0||k===knots.length-1)?0:
      (s(seed+31,k*29+(sign>0?7:11))-.5)*.09;
    const push=width*Math.max(0,pressure[k]+broken)*(sign>0?.8:.46);
    return [point[0]-sign*tangent[1]/norm*push,
      point[1]+sign*tangent[0]/norm*push];
  });
  const outline=[...side(1),...side(-1).slice(1,-1).reverse()];
  const path=["M"+f(root[0])+" "+f(root[1])];
  for(let k=0;k<outline.length;k++){
    const p0=outline[(k-1+outline.length)%outline.length];
    const p1=outline[k],p2=outline[(k+1)%outline.length];
    const p3=outline[(k+2)%outline.length];
    const cp1:P=[p1[0]+(p2[0]-p0[0])*.13,
      p1[1]+(p2[1]-p0[1])*.13];
    const cp2:P=[p2[0]-(p3[0]-p1[0])*.13,
      p2[1]-(p3[1]-p1[1])*.13];
    path.push("C"+f(cp1[0])+" "+f(cp1[1])+
      " "+f(cp2[0])+" "+f(cp2[1])+
      " "+f(p2[0])+" "+f(p2[1]));
  }
  return path.join(" ")+" Z";
}
/** Root-to-tip cubic ink-loaded contour. Both edges sample ONE curve and its
 * tangent: a swelled brush stroke, not two unrelated geometrical wedges.
 * The long midsection rolls over a landform; dry release keeps paper holes.
 */
function rockLoadedCubicRibbon(root:P,c1:P,c2:P,tip:P,width:number,seed:number){
  const knots=[0,.02,.05,.09,.14,.2,.27,.34,.42,.5,.58,.66,.73,.8,.86,.91,.95,.98,1];
  const pressure=[0,.08,.2,.37,.56,.72,.85,.94,1,.88,.75,.66,.53,.4,.3,.19,.1,.03,0];
  const point=(t:number):P=>{
    const q=1-t;
    return [
      q*q*q*root[0]+3*q*q*t*c1[0]+3*q*t*t*c2[0]+t*t*t*tip[0],
      q*q*q*root[1]+3*q*q*t*c1[1]+3*q*t*t*c2[1]+t*t*t*tip[1],
    ];
  };
  const side=(sign:1|-1)=>knots.map((t,k):P=>{
    const q=1-t,location=point(t);
    const tangent:P=[
      3*q*q*(c1[0]-root[0])+6*q*t*(c2[0]-c1[0])+3*t*t*(tip[0]-c2[0]),
      3*q*q*(c1[1]-root[1])+6*q*t*(c2[1]-c1[1])+3*t*t*(tip[1]-c2[1]),
    ];
    const norm=Math.max(.001,Math.hypot(tangent[0],tangent[1]));
    const teeth=k===0||k===knots.length-1?0:
      (s(seed+31,k*37+(sign===1?3:17))-.5)*.19;
    const load=width*Math.max(0,pressure[k]+teeth)*(sign===1?.69:.42);
    return [location[0]-sign*tangent[1]/norm*load,
      location[1]+sign*tangent[0]/norm*load];
  });
  const contour=[...side(1),...side(-1).slice(1,-1).reverse()];
  const out=["M"+f(root[0])+" "+f(root[1])];
  for(let k=0;k<contour.length;k++){
    const before=contour[(k+contour.length-1)%contour.length];
    const current=contour[k],next=contour[(k+1)%contour.length];
    const after=contour[(k+2)%contour.length];
    out.push("C"+f(current[0]+(next[0]-before[0])*.13)+" "+
      f(current[1]+(next[1]-before[1])*.13)+" "+
      f(next[0]-(after[0]-current[0])*.13)+" "+
      f(next[1]-(after[1]-current[1])*.13)+" "+
      f(next[0])+" "+f(next[1]));
  }
  return out.join(" ")+" Z";
}
/**
 * Four distinct historic ink-rock grammars, all drawn as editable SVG.
 *
 * Huang Gongwang (Fuchun): uneven long hemp, paper between dense families.
 * Guo Xi (Early Spring): curled cloud-head folds and reversing hook strokes.
 * Fan Kuan (Travelers): heavy monumental faces / short loaded raindrop cun.
 * Wang Meng (Forest Chamber Grotto): dense curved dry ox-hair brush traffic.
 *
 * These are original authored parent forms with seeded brush-flow children,
 * NOT scanned textures, a common noise overlay, or unrelated sticker marks.
 * Long hemp, ox-hair and cloud-head curves root on named pressure-loaded
 * sub-strata. Fan Kuan raindrop dots instead live independently *within*
 * their supporting rocky face, an intentional texture-particle class.
 * All materials are clipped to that exact parent stone volume. Changing school never changes the 300-frame
 * camera, walker, ridge topology, or original tree/landscape anatomy.
 */
function MasterRockBrush({root,seed,mist,detail,school}:{
  root:P;seed:number;mist:number;detail:number;school:InkRockSchool;
}){
  const id=useId().replace(/[^a-z0-9_-]/gi,"");
  const control:P=[root[0]-19,root[1]+31];
  const tip:P=[root[0]-56,root[1]+116];
  const sourcePlanes:Record<InkRockSchool,readonly {
    at:number;side:1|-1;spread:number;rise:number;depth:number;
  }[]>={
    "fuchun":[
      {at:.085,side:-1,spread:118,rise:27,depth:132},
      {at:.32,side:1,spread:94,rise:15,depth:123},
      {at:.61,side:-1,spread:82,rise:16,depth:92},
    ],
    "early-spring":[
      {at:.09,side:-1,spread:104,rise:40,depth:117},
      {at:.36,side:1,spread:105,rise:22,depth:135},
      {at:.65,side:-1,spread:70,rise:29,depth:91},
    ],
    "travelers":[
      {at:.075,side:-1,spread:135,rise:24,depth:156},
      {at:.31,side:1,spread:126,rise:16,depth:152},
      {at:.59,side:-1,spread:82,rise:10,depth:118},
    ],
    "forest-grotto":[
      {at:.13,side:-1,spread:115,rise:38,depth:145},
      {at:.37,side:1,spread:79,rise:33,depth:118},
      {at:.63,side:-1,spread:95,rise:18,depth:113},
    ],
  };
  const parent=sourcePlanes[school];
  const strokes:Record<InkRockSchool,readonly number[]>={
    "fuchun":[34,26,18],
    "early-spring":[22,17,13],
    "travelers":[78,65,44],
    "forest-grotto":[73,59,46],
  };
  const label:Record<InkRockSchool,string>={
    "fuchun":"long-hemp",
    "early-spring":"cloud-head",
    "travelers":"raindrop",
    "forest-grotto":"ox-hair",
  };
  return <g data-km-master-rock-art="" data-km-master-school={school}
    data-km-master-hero-root={f(root[0])+","+f(root[1])}>
    {parent.map((plane,i)=>{
      const a=quadraticPoint(root,control,tip,plane.at);
      const direction=plane.side;
      const reach=plane.spread*(.95+.12*s(seed+4011,i*47));
      const rise=plane.rise*(.88+.21*s(seed+4027,i*59));
      const depth=plane.depth*(.9+.13*s(seed+4031,i*37));
      const crown:P=[a[0]+direction*reach*.45,a[1]-rise];
      const shoulder:P=[a[0]+direction*reach*.82,a[1]+depth*.32];
      const outer:P=[a[0]+direction*reach*.78,a[1]+depth*.91];
      const inner:P=[a[0]+direction*reach*.12,a[1]+depth*.82];
      // Three different non-radial rock cheeks: supported concavities
      // between weighted outer shoulders, no detached polygon triangle.
      const mass="M"+f(a[0])+" "+f(a[1])+
        " C"+f(a[0]+direction*reach*.15)+" "+f(a[1]-rise*.61)+
        " "+f(crown[0]-direction*reach*.14)+" "+f(crown[1]-rise*.11)+
        " "+f(crown[0])+" "+f(crown[1])+
        " C"+f(a[0]+direction*reach*.74)+" "+f(a[1]-rise*.63)+
        " "+f(a[0]+direction*reach*.77)+" "+f(a[1]+depth*.11)+
        " "+f(shoulder[0])+" "+f(shoulder[1])+
        " C"+f(a[0]+direction*reach*.97)+" "+f(a[1]+depth*.52)+
        " "+f(a[0]+direction*reach*.76)+" "+f(a[1]+depth*.75)+
        " "+f(outer[0])+" "+f(outer[1])+
        " C"+f(a[0]+direction*reach*.58)+" "+f(a[1]+depth*.8)+
        " "+f(a[0]+direction*reach*.35)+" "+f(a[1]+depth*.94)+
        " "+f(inner[0])+" "+f(inner[1])+
        " C"+f(a[0]-direction*reach*.09)+" "+f(a[1]+depth*.6)+
        " "+f(a[0]+direction*reach*.19)+" "+f(a[1]+depth*.17)+
        " "+f(a[0])+" "+f(a[1])+" Z";
      const clip="kmrk"+id+"m"+i;
      const tone=clip+"tone";
      // The previous 495 marks all began on the *upper* rock edge:
      // at native film scale they resembled a dark fringe above an
      // otherwise blank tan triangle. In true layered cunfa, the face
      // contains attached internal strata. These five pressure-loaded
      // curved spines span the vertical rock mass. Connected line families
      // start on actual sampled curves; Fan Kuan's *detached loaded dots*
      // occupy their named rock volume rather than forming fake hair ribs.
      const density=[.15,.31,.49,.67,.83] as const;
      const stratum=density.map((at,k)=>{
        const top=quadraticPoint(a,crown,shoulder,at);
        const bottom=quadraticPoint(a,inner,outer,at);
        const drift=direction*((k%2?1:-1)*(2+
          4*s(seed+4327,i*29+k*11)));
        const tip:P=[top[0]*.18+bottom[0]*.82+drift,
          top[1]*.17+bottom[1]*.83];
        const bend:P=[top[0]*.52+tip[0]*.48+
          direction*(5+3*s(seed+4337,i*23+k*19)),
          top[1]*.57+tip[1]*.43+(k%3===1?-7:3)];
        const load=(school==="travelers"?4.4:
          school==="forest-grotto"?5.4:
          school==="early-spring"?6:3.6)*
          (.66+.49*s(seed+4343,i*41+k*31));
        const body=rockLoadedRibbon(top,bend,tip,load,
          seed+4357+i*109+k*37);
        const lip=rockLoadedRibbon(top,
          [top[0]+direction*(8+k),top[1]+(k%2?-6:-3)],
          [top[0]+direction*(18+k*1.5),top[1]+(7+k%3*4)],
          Math.max(1.1,load*.32),seed+4373+i*73+k*17);
        return {top,bend,tip,body,lip,load};
      });
      const qty=Math.round(strokes[school][i]*detail);
      const brush=Array.from({length:qty},(_,j)=>{
        const budget=strokes[school][i];
        // Distribute marks in two natural, unequal source-flow clusters.
        // Leave the center of each material mass with breathing paper.
        const first=Math.ceil(budget*.57);
        const t=j<first
          ?.13+j*(.29/Math.max(1,first-1))+
            (s(seed+4111,j*43+i*17)-.5)*.015
          :.57+(j-first)*(.31/Math.max(1,budget-first-1))+
            (s(seed+4127,j*37+i*29)-.5)*.014;
        const at=clamp(t,.1,.9);
        const bank=(j*17+Math.floor(j/13))%stratum.length;
        const upperBank=stratum[bank];
        // Compress alternating deposits and introduce intentional gaps
        // without adding independent decoration to the blank paper.
        const depth=clamp(.12+.78*(at-.1)/.8+
          (s(seed+4411,j*23+i*37)-.5)*.09,.08,.92);
        // Fan Kuan's raindrop cun are *separate loaded touches on a
        // connected rock plane*, unlike parent-rooted long hemp ribbons.
        // Root them to the parent rock surface, distributing small dots
        // over its whole face; otherwise five regular vertical tubes
        // misleadingly replace his source-specific mottled cliff texture.
        const fanU=clamp(.11+.8*s(seed+4421,j*29+i*13),.1,.91);
        const fanTop=quadraticPoint(a,crown,shoulder,fanU);
        const fanBottom=quadraticPoint(a,inner,outer,fanU);
        const fanDepth=.14+.72*s(seed+4439,j*31+i*23);
        const fanEntry:P=[
          fanTop[0]*(1-fanDepth)+fanBottom[0]*fanDepth,
          fanTop[1]*(1-fanDepth)+fanBottom[1]*fanDepth,
        ];
        const entry=school==="travelers"?fanEntry:
          quadraticPoint(upperBank.top,upperBank.bend,upperBank.tip,depth);
        const jitter=(s(seed+4153,j*31+i*19)-.5);
        // Source vocabularies differ in geometry, loaded width, cadence,
        // and curve direction. They must not be the same stamp with opacity.
        const wt=s(seed+4177,j*11+i*31);
        const wt2=s(seed+4193,j*17+i*47);
        const curlHandedness=j%4===1||j%7===0?-1:1;
        let c1:P,c2:P,end:P,width:number;
        if(school==="travelers"){
          // Bulbed, occasionally split press-and-lift droplets. The
          // short 3–8px gesture must remain a dot at native resolution,
          // not a 20px repeated black arrowhead or a hanging comb tooth.
          const len=2.4+4.8*wt+(j%11===0?1.7:0);
          const drift=direction*(.22+.88*wt2)+jitter*1.7;
          c1=[entry[0]+drift*.18,entry[1]+len*.18];
          c2=[entry[0]+drift*.72,entry[1]+len*.49];
          end=[entry[0]+drift,entry[1]+len];
          width=.68+1.35*wt+(j%11===0?.58:0);
        }else if(school==="early-spring"){
          // Cloud-head stones hook BACK into their support. Reverse
          // handedness at irregular intervals: identical S-scrolls
          // in five parallel strings are not Guo Xi brush anatomy.
          const len=11+18*wt+(j%7===0?7.5:0);
          const sway=direction*curlHandedness*(7+12*wt2);
          c1=[entry[0]+sway*.96,entry[1]+len*.06];
          c2=[entry[0]-sway*.72,entry[1]+len*.68];
          end=[entry[0]+sway*.31+2.1*jitter,entry[1]+len];
          width=1.2+2.05*wt;
        }else if(school==="forest-grotto"){
          // Wang Meng's ox-tail texture is made of many *short*, tight,
          // alternating dry-brush turns inside the actual rock folds.
          // The earlier 23–69px hairs radiated from the summit like
          // loose strings and erased the grotto's densely nested geology.
          const len=9+20*wt+(j%13===0?8:0);
          const turn=(j%5===0||j%7===2?-1:1);
          const sway=direction*turn*(5+13*wt2)+jitter*3.4;
          c1=[entry[0]+sway*.13,entry[1]+len*.2];
          c2=[entry[0]+sway*.87,entry[1]+len*.63];
          end=[entry[0]+sway*.68,entry[1]+len];
          width=.48+.86*wt+(j%11===0?.52:0);
        }else{
          const len=17+29*wt+(j%5===0?7:0);
          const sway=direction*(10+12*wt2)+jitter*6;
          c1=[entry[0]+sway*.12,entry[1]+len*.28];
          c2=[entry[0]+sway*.72,entry[1]+len*.54];
          end=[entry[0]+sway,entry[1]+len];
          width=.82+1.1*wt+(j%7===0?.6:0);
        }
        const pressure=rockLoadedCubicRibbon(entry,c1,c2,end,width,
          seed+4211+i*113+j*13);
        const dry=(j%5===2||j%9===4);
        const cut=cubicPoint(entry,c1,c2,end,.76);
        const lift=cubicPoint(entry,c1,c2,end,.96);
        const dryPath="M"+f(cut[0])+" "+f(cut[1])+
          " Q"+f((cut[0]+lift[0])*.5+direction*.7)+" "+
          f((cut[1]+lift[1])*.5)+" "+f(lift[0])+" "+f(lift[1]);
        return {entry,pressure,dry,dryPath,bank,curlHandedness};
      });
      const isFan=school==="travelers",isGuo=school==="early-spring";
      const isWang=school==="forest-grotto";
      const isHuang=school==="fuchun";
      // Fuchun's hemp families fold OVER rounded rock shoulders, while
      // Wang Meng's old dark ridges twist into one another. The former
      // long black comb and the latter free-hanging hairs both lacked
      // *positive nested stone banks*; local face shading is a geometry
      // problem, not a request for screen noise. Each sub-bank begins
      // on the parent crown and ends inside its parent stone silhouette.
      const stoneBankStations=isHuang?[.13,.39,.71]:
        isWang?[.1,.29,.53,.76]:[];
      const stoneBanks=stoneBankStations.map((loc,k)=>{
        const t=clamp(loc+(s(seed+4621,i*19+k*47)-.5)*.034,.07,.94);
        const root=quadraticPoint(a,crown,shoulder,t);
        const target=quadraticPoint(a,inner,outer,t);
        const depth=(target[1]-root[1])*(isWang?.76:.56)*
          (.82+.28*s(seed+4637,i*37+k*29));
        const reach=(isWang?22:29)*(.7+.4*s(seed+4651,i*23+k*13));
        const dir=direction*((k%3===1)?-1:1);
        const rim:P=[root[0]+dir*reach*.55,root[1]-
          (isWang?6:10)*(1+.3*s(seed+4657,i*29+k*31))];
        const ridge:P=[root[0]+dir*reach,root[1]+depth*.29];
        const heel:P=[root[0]+dir*reach*.7,root[1]+depth*.93];
        const inside:P=[root[0]+dir*reach*.05,root[1]+depth*.68];
        const path="M"+f(root[0])+" "+f(root[1])+
          " C"+f(root[0]+dir*reach*.16)+" "+f(root[1]-6)+
          " "+f(rim[0]-dir*reach*.13)+" "+f(rim[1]-4)+
          " "+f(rim[0])+" "+f(rim[1])+
          " C"+f(rim[0]+dir*reach*.22)+" "+f(rim[1]-3)+
          " "+f(ridge[0]+dir*4)+" "+f(ridge[1]-depth*.14)+
          " "+f(ridge[0])+" "+f(ridge[1])+
          " C"+f(ridge[0]-dir*reach*.07)+" "+f(ridge[1]+depth*.29)+
          " "+f(heel[0]+dir*reach*.12)+" "+f(heel[1]-depth*.13)+
          " "+f(heel[0])+" "+f(heel[1])+
          " C"+f(heel[0]-dir*reach*.45)+" "+f(heel[1]+depth*.045)+
          " "+f(inside[0]+dir*reach*.19)+" "+f(inside[1]+depth*.1)+
          " "+f(inside[0])+" "+f(inside[1])+
          " C"+f(root[0]-dir*reach*.11)+" "+f(root[1]+depth*.45)+
          " "+f(root[0]+dir*reach*.08)+" "+f(root[1]+depth*.18)+
          " "+f(root[0])+" "+f(root[1])+" Z";
        const cap=rockLoadedCubicRibbon(root,
          [root[0]+dir*reach*.14,root[1]-5],
          [rim[0]-dir*reach*.1,rim[1]-2],rim,
          (isWang?2.1:3.4)*(.8+.45*s(seed+4673,k*29+i*11)),
          seed+4681+i*41+k*19);
        return {root,path,cap,gradient:tone+"rockbank"+k};
      });
      // Wang Meng's moss stipple is a separate brush-particle class,
      // semantically owned by the shaded rock, not a disconnected rock.
      // Dabs gather near the 5 existing stone folds with irregular
      // local density, never across the empty sky.
      const moss=isWang?Array.from({length:21},(_,j)=>{
        const layer=j%stratum.length;
        const bone=stratum[layer];
        const t=clamp(.17+.66*s(seed+4703,i*59+j*41),.1,.89);
        const root=quadraticPoint(bone.top,bone.bend,bone.tip,t);
        const x=root[0]+direction*(s(seed+4711,i*29+j*13)-.5)*9;
        const y=root[1]+(s(seed+4721,i*17+j*23)-.5)*8;
        const breadth=.75+2.4*s(seed+4729,i*19+j*37);
        const height=1.3+4.4*s(seed+4733,i*13+j*43);
        const dx=direction*(1.6*s(seed+4747,i*31+j*17)-.8);
        const d="M"+f(x)+" "+f(y)+
          " q"+f(-breadth*.5)+" "+f(-height*.28)+
          " "+f(dx)+" "+f(-height*.5)+
          " q"+f(breadth*.9)+" "+f(height*.3)+
          " "+f(breadth)+" "+f(height*.76)+
          " q"+f(-breadth*.4)+" "+f(height*.39)+
          " "+f(-breadth-dx)+" "+f(-height*.26)+" Z";
        return {root:[x,y] as P,d,wet:j%6===0};
      }):[];
      // Fan Kuan's original monumental rock has grouped cliff *mass*:
      // two asymmetrically carved dark recesses attach to EACH positive
      // stone face. These are broad angular geologic facets, not more
      // independent texture dots or 5 smooth procedural drip-columns.
      // The many short droplets must sit on a legible shadowed cliff.
      const fanFacets=isFan?([.19,.59] as const).map((at,k)=>{
        const root=quadraticPoint(a,crown,shoulder,at);
        const extent=depth*(k===0?.69:.56)*
          (.83+.23*s(seed+4513,i*43+k*17));
        const width=(k===0?20:15)*
          (.76+.31*s(seed+4523,i*29+k*19));
        const dir=direction*(k===0?1:-1);
        const shoulder0:P=[root[0]+dir*width*.32,root[1]-4];
        const lip:P=[root[0]+dir*width,root[1]+extent*.18];
        const heel:P=[root[0]+dir*width*.78,
          root[1]+extent*(k===0?.95:.83)];
        const throat:P=[root[0]-dir*width*.12,
          root[1]+extent*.69];
        const cut="M"+f(root[0])+" "+f(root[1])+
          " C"+f(root[0]+dir*width*.11)+" "+f(root[1]-4)+
          " "+f(shoulder0[0]-dir*2)+" "+f(shoulder0[1]-2)+
          " "+f(shoulder0[0])+" "+f(shoulder0[1])+
          " L"+f(lip[0])+" "+f(lip[1])+
          " C"+f(lip[0]+dir*4)+" "+f(lip[1]+extent*.2)+
          " "+f(heel[0]+dir*7)+" "+f(heel[1]-extent*.17)+
          " "+f(heel[0])+" "+f(heel[1])+
          " C"+f(throat[0]+dir*width*.43)+" "+
            f(throat[1]+extent*.23)+
          " "+f(throat[0]+dir*width*.18)+" "+
            f(throat[1]-extent*.12)+
          " "+f(throat[0])+" "+f(throat[1])+
          " C"+f(root[0]-dir*width*.11)+" "+
            f(root[1]+extent*.3)+
          " "+f(root[0]+dir*width*.06)+" "+
            f(root[1]+extent*.08)+
          " "+f(root[0])+" "+f(root[1])+" Z";
        const rim=rockLoadedRibbon(root,
          [root[0]+dir*width*.39,root[1]-5],
          [lip[0]+dir*3,lip[1]-3],2.1+k*.76,
          seed+4591+i*59+k*17);
        return {root,cut,rim,gradient:tone+"fanface"+k};
      }):[];
      return <g key={i} data-km-master-face=""
        data-km-master-face-root={f(a[0])+","+f(a[1])}
        data-km-master-face-side={direction}
        data-km-master-plane-index={i}>
        <defs>
          <clipPath id={clip} clipPathUnits="userSpaceOnUse">
            <path d={mass}/>
          </clipPath>
          <linearGradient id={tone} x1="0%" y1="0%" x2="38%" y2="100%">
            <stop offset="0" stopColor={isFan?"#2b2826":isWang?"#3d352f":"#504536"}
              stopOpacity={isFan?.81:isWang?.76:.65}/>
            <stop offset=".24" stopColor={isFan?"#4b4035":isWang?"#4a3c34":"#77634d"}
              stopOpacity={isFan?.76:isWang?.7:.49}/>
            <stop offset=".57" stopColor={isFan?"#735e48":isWang?"#745e4a":"#907960"}
              stopOpacity={isFan?.41:isWang?.47:.31}/>
            <stop offset=".92" stopColor="#b9a287" stopOpacity=".08"/>
            <stop offset="1" stopColor="#b9a287" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path data-km-master-mass="" d={mass}
          fill={"url(#"+tone+")"} opacity={f((isFan?.96:isWang?.94:.87)*(1-.16*mist))}/>
        {(isHuang||isWang)&&<g clipPath={"url(#"+clip+")"}
          data-km-master-rock-bank-field={school}>
          {stoneBanks.map(({root,path,cap,gradient},k)=><g key={k}
            data-km-master-rock-bank=""
            data-km-master-rock-bank-root={f(root[0])+","+f(root[1])}
            data-km-master-rock-bank-index={k}>
            <defs><linearGradient id={gradient} x1="0%" y1="0%"
              x2={k%2===0?"71%":"28%"} y2="100%">
              <stop offset="0" stopColor="#382e27"
                stopOpacity={isWang?.79:.59}/>
              <stop offset=".37" stopColor={isWang?"#514138":"#77644d"}
                stopOpacity={isWang?.61:.41}/>
              <stop offset=".72" stopColor="#897158"
                stopOpacity={isWang?.3:.19}/>
              <stop offset="1" stopColor="#a99273" stopOpacity="0"/>
            </linearGradient></defs>
            <path data-km-master-rock-bank-wash="" d={path}
              fill={"url(#"+gradient+")"}
              opacity={f((isWang?.73:.64)*(1-.23*mist))}/>
            <path data-km-master-rock-bank-cap="" d={cap}
              fill={isWang?"#41362d":"#67513c"}
              opacity={f((isWang?.62:.49)*(1-.2*mist))}/>
          </g>)}
          {moss.map(({root,d,wet},j)=><path key={"moss"+j}
            data-km-master-moss-dab=""
            data-km-master-moss-root={f(root[0])+","+f(root[1])}
            data-km-master-moss-wet={wet?"wet":"dry"}
            d={d} fill={wet?"#342c28":"#554638"}
            opacity={f((wet?.8:.55)*(1-.2*mist))}/>)}
        </g>}
        {isFan&&<g clipPath={"url(#"+clip+")"}
          data-km-master-fan-geology="">
          {fanFacets.map(({root,cut,rim,gradient},k)=><g key={k}
            data-km-master-fan-facet=""
            data-km-master-fan-facet-root={f(root[0])+","+f(root[1])}>
            <defs>
              <linearGradient id={gradient} x1="18%" y1="4%"
                x2="76%" y2="94%">
                <stop offset="0" stopColor="#302b26" stopOpacity=".78"/>
                <stop offset=".36" stopColor="#413a33" stopOpacity=".61"/>
                <stop offset=".76" stopColor="#5e5142" stopOpacity=".31"/>
                <stop offset="1" stopColor="#9b856a" stopOpacity=".02"/>
              </linearGradient>
            </defs>
            <path data-km-master-fan-facet-wash="" d={cut}
              fill={"url(#"+gradient+")"}
              opacity={f((k===0?.7:.61)*(1-.18*mist))}/>
            <path data-km-master-fan-facet-rim="" d={rim}
              fill="#322c27" opacity={f((k===0?.62:.53)*(1-.18*mist))}/>
          </g>)}
        </g>}
        <g clipPath={"url(#"+clip+")"} data-km-master-stratum-field="">
          {stratum.map(({top,body,lip,load},k)=><g key={k}
            data-km-master-stratum=""
            data-km-master-stratum-root={f(top[0])+","+f(top[1])}
            data-km-master-stratum-index={k}>
            <path data-km-master-stratum-wash="" d={body}
              fill={isFan?"#312c27":isWang?"#4c4034":"#5c4e3e"}
              opacity={f((isFan?.19:isWang?.35:isGuo?.29:.19)*
                (1-.18*mist))}/>
            <path data-km-master-stratum-lip="" d={lip}
              fill={isFan?"#2b2925":"#4a3b31"}
              opacity={f((isFan?.26:Math.min(.83,.37+load*.027))*(1-.18*mist))}/>
          </g>)}
        </g>
        <g data-km-master-brush-field="" data-km-master-field-count={qty}
          clipPath={"url(#"+clip+")"}>
          {brush.map(({entry,pressure,dry,dryPath,bank,curlHandedness},j)=><g key={j}
            data-km-master-stroke="" data-km-master-stroke-style={label[school]}
            data-km-master-stroke-root={f(entry[0])+","+f(entry[1])}
            data-km-master-stroke-dry={dry?"dry":"wet"}
            data-km-master-stroke-bank={bank}
            data-km-master-stroke-placement={isFan?"rock-volume":"attached-stratum"}
            data-km-master-stroke-curl={isGuo?(curlHandedness>0?"with":"counter"):"none"}>
            <path data-km-master-stroke-loaded="" d={pressure}
              fill={isFan?"#2a2623":isWang?"#322d29":isGuo?"#392f28":"#44382f"}
              opacity={f((dry?.35:isFan?.83:isWang?.68:isGuo?.72:.62)*
                (1-.25*mist))}/>
            {dry&&<path data-km-master-dry-tail="" d={dryPath}
              fill="none" stroke="#86735a" strokeWidth={isFan?.34:.55}
              opacity={f(.37*(1-.18*mist))}/>}
          </g>)}
        </g>
      </g>;
    })}
  </g>;
}
/** One deliberately composed folded rock formation, not a collection
 * of repeated floating pebbles. Its parent bone emerges at a *real*
 * mid-distance ridge apex; four unequal paper-separated hemp ribs
 * emerge from sampled stations along that same bowed bone.
 * Huang Gongwang's Fuchun handscroll (NPM, 1350) supplies the grammar
 * of nested rounded hill-backs, connected long fibres and sparse recesses.
 * These original curves are authored, not traced from museum pixels.
 */
function MountainHeroCliff({root,seed,mist,detail}:{
  root:P;seed:number;mist:number;detail:number;
}){
  const [x,y]=root;
  const boneControl:P=[x-19,y+31];
  const boneTip:P=[x-56,y+116];
  const ribPlan=[
    {at:.08,side:-1,len:62,reach:28,load:5.3},
    {at:.25,side:1,len:84,reach:35,load:8.6},
    {at:.43,side:-1,len:71,reach:44,load:6.9},
    {at:.62,side:1,len:67,reach:39,load:7.8},
  ] as const;
  // ArtCraft v7: a handscroll rock *face* is a family of interlocking
  // backs, not four thin freestanding drips. Three differently rolled
  // longitudinal contours attach to successive stations on the hero bone
  // and are underpainted behind its vertical fracture ribs.
  const foldPlan=[
    {at:.13,side:-1,reach:91,rise:26,drop:61,width:8.4},
    {at:.36,side:1,reach:77,rise:13,drop:78,width:6.7},
    {at:.59,side:-1,reach:65,rise:21,drop:54,width:5.6},
  ] as const;
  // Huang Gongwang's rounded shan-gu hill backs must read as
  // INTERLOCKING landform contour, not just descending triangular spines.
  // Every arc starts on the same actual painted bone, and each small
  // hemp mark starts on an exact station of its parent's cubic contour.
  const terracePlan=[
    {at:.09,side:-1,reach:103,rise:29,fall:51,width:4.8,marks:13},
    {at:.29,side:1,reach:83,rise:22,fall:57,width:3.6,marks:16},
    {at:.51,side:-1,reach:69,rise:17,fall:50,width:3.9,marks:11},
  ] as const;
  const cubicPoint=(a:P,c1:P,c2:P,b:P,t:number):P=>{
    const u=1-t;
    return [u*u*u*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*b[0],
      u*u*u*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*b[1]];
  };
  // A rock FACE needs positive, soft-but-fractured underpainting,
  // not just the dark disconnected outline wires. These overlapping
  // sectors belong to one parent geological bone; no free ornaments.
  const rockFacePlan=[
    {at:.12,side:-1,reach:49,depth:57,crest:13},
    {at:.31,side:1,reach:42,depth:71,crest:10},
    {at:.55,side:-1,reach:34,depth:48,crest:8},
  ] as const;
  // Instance-local IDs keep simultaneous film/Storybook specimens isolated.
  const faceId=useId().replace(/[^a-z0-9_-]/gi,"");
  const pool=quadraticPoint(root,boneControl,boneTip,.49);
  return <g data-km-rock-hero-cliff=""
    data-km-rock-hero-root={f(x)+","+f(y)}>
    {/* Source-guided, overlapping positive mountain cheek planes.
        Each broad face starts from a parent bone station, rises into
        a small rounded alum-head rim, folds twice, then ends in a dry
        tail. Their dark-to-dilute gradient is local to that face. */}
    <g data-km-rock-interlocked-mass-family="">
      {rockFacePlan.map((face,i)=>{
        const a=quadraticPoint(root,boneControl,boneTip,face.at);
        const sign=face.side;
        const spread=face.reach*(.91+.17*s(seed+2801,i*13));
        const depth=face.depth*(.93+.12*s(seed+2807,i*17));
        const crest=face.crest*(.89+.17*s(seed+2819,i*29));
        const cap:P=[a[0]+sign*spread*.47,a[1]-crest];
        const belly:P=[a[0]+sign*spread*.81,a[1]+depth*.43];
        const base:P=[a[0]+sign*spread*.73,a[1]+depth];
        const inner:P=[a[0]+sign*spread*.17,a[1]+depth*.62];
        // A nibble along the outer edge is a supported erosion recess,
        // not a triangle cut from the silhouette.
        const faceD="M"+f(a[0])+" "+f(a[1])+
          " C"+f(a[0]+sign*spread*.17)+" "+f(a[1]-crest*.93)+
          " "+f(a[0]+sign*spread*.38)+" "+f(a[1]-crest*1.16)+
          " "+f(cap[0])+" "+f(cap[1])+
          " C"+f(a[0]+sign*spread*.62)+" "+f(a[1]-crest*.52)+
          " "+f(a[0]+sign*spread*.76)+" "+f(a[1]+depth*.13)+
          " "+f(belly[0])+" "+f(belly[1])+
          " C"+f(a[0]+sign*spread*.95)+" "+f(a[1]+depth*.53)+
          " "+f(a[0]+sign*spread*.81)+" "+f(a[1]+depth*.83)+
          " "+f(base[0])+" "+f(base[1])+
          " C"+f(a[0]+sign*spread*.49)+" "+f(a[1]+depth*.81)+
          " "+f(a[0]+sign*spread*.4)+" "+f(a[1]+depth*.55)+
          " "+f(inner[0])+" "+f(inner[1])+
          " C"+f(a[0]-sign*spread*.08)+" "+f(a[1]+depth*.37)+
          " "+f(a[0]+sign*spread*.16)+" "+f(a[1]+depth*.17)+
          " "+f(a[0])+" "+f(a[1])+" Z";
        const grad="kmrock"+faceId+"face"+i;
        // The dark cap forms the stone structure; the broad dilute
        // parent wash under it preserves centuries-old paper reserves.
        const caps=([.18,.53] as const).map((t,j)=>{
          const start=quadraticPoint(a,cap,belly,t);
          const c:P=[start[0]+sign*(7+j*4),
            start[1]+(j===0?-6:3)];
          const end:P=[start[0]+sign*(18+j*2),
            start[1]+11+j*7];
          return {start,d:rockLoadedRibbon(start,c,end,
            j===0?3.7:2.6,seed+2851+i*71+j*13)};
        });
        const abrasions=([.27,.46,.69] as const).map((t,j)=>{
          const start=quadraticPoint(a,cap,base,t);
          const c:P=[start[0]+sign*(6+j*2),
            start[1]+(12+j*3)];
          const end:P=[start[0]+sign*(12+j*3),
            start[1]+(24+j*6)];
          return {start,d:rockLoadedRibbon(start,c,end,
            .74+j*.31,seed+2911+i*59+j*23)};
        });
        // Fuchun long-hemp dry brush: marks do not float over the hill.
        // Two unequal density clusters follow the SAME curved face crown,
        // leaving a deliberate open paper passage across the middle.
        // Material pressure varies without narrowing the parent anatomy.
        const budget=i===0?14:i===1?11:8;
        const fibreCount=Math.round(budget*detail);
        const flow=Array.from({length:fibreCount},(_,j)=>{
          const dense=Math.ceil(budget*.59);
          const station=j<dense
            ? .17+j*.022+(s(seed+3011,i*41+j*17)-.5)*.01
            : .54+(j-dense)*.043+(s(seed+3023,i*47+j*19)-.5)*.016;
          const source=quadraticPoint(a,cap,belly,Math.min(.92,station));
          // Transverse drift responds to the facing direction of the
          // curved shoulder instead of drawing vertical screen rain.
          const deviation=(j%4===0?-1:1)*
            (2.5+3.4*s(seed+3041,i*13+j*29));
          const fall=9+14*s(seed+3049,i*31+j*11)+(j%5===0?7:0);
          const ctrl:P=[source[0]+sign*fall*.16+deviation*.24,
            source[1]+fall*(.31+.12*s(seed+3061,i*17+j*7))];
          const tip:P=[source[0]+sign*fall*.32+deviation,
            source[1]+fall];
          const load=(j%6===0?1.45:j%4===1?1.04:.66)*
            (.7+.4*s(seed+3079,i*17+j*41));
          return {source,path:rockLoadedRibbon(source,ctrl,tip,load,
            seed+3083+i*137+j*37),depleted:j%4===2};
        });
        const faceClip=grad+"-contour";
        return <g key={i} data-km-rock-interlocked-mass=""
          data-km-rock-mass-root={f(a[0])+","+f(a[1])}
          data-km-rock-mass-side={sign}>
          <defs>
            <linearGradient id={grad} x1="0%" y1="0%" x2="45%" y2="95%">
              <stop offset="0" stopColor="#39352f" stopOpacity=".88"/>
              <stop offset=".34" stopColor="#514438" stopOpacity=".57"/>
              <stop offset=".69" stopColor="#80694f" stopOpacity=".38"/>
              <stop offset="1" stopColor="#b8a082" stopOpacity=".07"/>
            </linearGradient>
            <clipPath id={faceClip} clipPathUnits="userSpaceOnUse">
              <path d={faceD}/>
            </clipPath>
          </defs>
          <path data-km-rock-mass-underwash="" d={faceD}
            fill={"url(#"+grad+")"} opacity={f(.81*(1-.2*mist))}/>
          <g data-km-rock-mass-flow-group=""
            clipPath={"url(#"+faceClip+")"}
            data-km-rock-mass-flow-count={fibreCount}>
            {flow.map(({source,path,depleted},j)=><path key={j}
              data-km-rock-mass-flow=""
              data-km-rock-mass-flow-root={f(source[0])+","+f(source[1])}
              data-km-rock-mass-flow-load={depleted?"lifted":"loaded"}
              d={path} fill={j%6===0?"#342e2a":"#594939"}
              opacity={f((depleted?.35:j%6===0?.77:.55)*(1-.21*mist))}/>)}
          </g>
          {caps.map(({start,d},j)=><path key={j}
            data-km-rock-mass-alum-cap=""
            data-km-rock-mass-cap-root={f(start[0])+","+f(start[1])}
            d={d} fill={j?"#68523f":"#3d332d"}
            opacity={f((j?.44:.69)*(1-.17*mist))}/>)}
          {abrasions.map(({start,d},j)=><path key={j}
            data-km-rock-mass-erosion=""
            data-km-rock-mass-erosion-root={f(start[0])+","+f(start[1])}
            d={d} fill={j===1?"#6c5b48":"#3d342c"}
            opacity={f((j===1?.39:.61)*(1-.25*mist))}/>)}
        </g>;
      })}
    </g>
    {/* Source hierarchy: rounded rolling hill backs intersect one rooted
        dark geological spine. Open paper channels are NOT filled with
        an overall shadow. This preserves the sparse/dense handscroll. */}
    {foldPlan.map((fold,i)=>{
      const r=quadraticPoint(root,boneControl,boneTip,fold.at);
      const breadth=fold.reach*(.96+.12*s(seed+501,i*23));
      const side=fold.side;
      const rise=fold.rise*(.91+.17*s(seed+509,i*31));
      const descend=fold.drop*(.92+.15*s(seed+521,i*17));
      // The high shoulder bends BACK over the attached root, then
      // descends as a gently rolling hillside rather than a triangle.
      const bend:P=[r[0]+side*breadth*.57,r[1]-rise];
      const tip:P=[r[0]+side*breadth,r[1]+descend];
      const longEdge=rockLoadedRibbon(r,bend,tip,fold.width*.83,
        seed+1511+i*101);
      const taperStart=quadraticPoint(r,bend,tip,.22);
      const taperEnd=quadraticPoint(r,bend,tip,.87);
      const inner="M"+f(taperStart[0])+" "+f(taperStart[1]+2)+
        " Q"+f(bend[0]-side*fold.width*1.15)+" "+
          f(bend[1]+fold.width*1.72)+" "+
          f(taperEnd[0])+" "+f(taperEnd[1]);
      // Source-specific dry/wet rhythm: clustered pima-cun along each
      // rolling hill-back, never independent rain streaks. All origins
      // are measured on THIS fold's quadratic bone, with a common
      // descending flow field, asymmetric brush loading and gaps.
      const bundleCount=i===0?8:i===1?10:6;
      const pimaBundles=Array.from({length:bundleCount},(_,j)=>{
        const station=.19+j*(.61/(bundleCount-1))+
          (s(seed+613,i*29+j*17)-.5)*.018;
        const origin=quadraticPoint(r,bend,tip,station);
        const t2=Math.min(.99,station+.17+
          .06*s(seed+619,i*31+j*13));
        const ahead=quadraticPoint(r,bend,tip,t2);
        const spread=((i+j)%3===0?-1:1)*(5+
          7*s(seed+631,i*19+j*11));
        const target:P=[
          ahead[0]+spread*.35,
          ahead[1]+9+9*s(seed+641,i*13+j*23),
        ];
        const mid:P=[
          origin[0]+(target[0]-origin[0])*.39+spread*.16,
          origin[1]+(target[1]-origin[1])*.34,
        ];
        const load=(j%5===0?1.95:j%3===0?1.28:.78)*
          (.79+.35*s(seed+647,i*17+j));
        const path=rockLoadedRibbon(origin,mid,target,load,
          seed+1637+i*101+j*17);
        const depleted=j%4===2;
        const dryStart=quadraticPoint(origin,mid,target,.82);
        const dryEnd=quadraticPoint(origin,mid,target,.95);
        const dry="M"+f(dryStart[0])+" "+f(dryStart[1])+
          " Q"+f(dryEnd[0]+spread*.16)+" "+f(dryEnd[1]-1.2)+
          " "+f(target[0]+spread*.13)+" "+f(target[1]+2.2);
        return {origin,path,dry,depleted};
      });
      const tributaries=([.31,.54,.73] as const).map((at,k)=>{
        const entry=quadraticPoint(r,bend,tip,at);
        const off=((i+k)%2===0?-1:1)*(11+
          11*s(seed+571,i*19+k*13));
        const fall=17+19*s(seed+587,i*17+k);
        const control:P=[entry[0]+off*.21,entry[1]+fall*.33];
        const end:P=[entry[0]+off,entry[1]+fall];
        return {entry,end,path:rockLoadedRibbon(entry,control,end,
          (k===1?1.5:2.25)*(1+.18*s(seed+593,i*7+k)),
          seed+1601+i*23+k*47)};
      });
      return <g key={i} data-km-rock-hero-fold=""
        data-km-rock-hero-fold-root={f(r[0])+","+f(r[1])}
        data-km-rock-hero-fold-station={f(fold.at)}>
        <path data-km-rock-hero-fold-pressure="" d={longEdge}
          fill={i===1?"#625344":"#4a4035"}
          opacity={f((i===1?.43:.66)*(1-.19*mist))}/>
        <path data-km-rock-hero-fold-understroke="" d={inner}
          fill="none" stroke={i===1?"#907a5d":"#544639"}
          strokeWidth={f(i===1?1.15:1.5)}
          strokeLinecap="round"
          opacity={f((i===1?.38:.59)*(1-.16*mist))}/>
        <g data-km-rock-pima-family="" data-km-rock-pima-family-count={bundleCount}>
          {pimaBundles.map(({origin,path,dry,depleted},j)=><g key={j}
            data-km-rock-pima-stroke=""
            data-km-rock-pima-root={f(origin[0])+","+f(origin[1])}
            data-km-rock-pima-dry={depleted?"lifted":"loaded"}>
            <path data-km-rock-pima-body="" d={path}
              fill={j%4===0?"#39372f":j%4===1?"#625341":"#584939"}
              opacity={f((i===1?.69:.78)*
                (j%4===0?.81:j%4===2?.49:.68)*(1-.2*mist))}/>
            {depleted&&<path data-km-rock-pima-lift="" d={dry}
              stroke="#8c7960" strokeWidth=".48"
              strokeLinecap="round" fill="none"
              opacity={f(.39*(1-.2*mist))}/>}
          </g>)}
        </g>
        {tributaries.map(({entry,path},k)=><path key={k}
          data-km-rock-hero-fold-fibre=""
          data-km-rock-hero-fold-fibre-root={f(entry[0])+","+f(entry[1])}
          d={path} fill={k===1?"#756450":"#4e4236"}
          opacity={f((k===1?.37:.54)*(1-.15*mist))}/>)}
      </g>;
    })}
    {/* Three interlocking curved backs (not parallel stamps), with
        source-led hemp-fibre concentrations and unpainted air gaps.
        All children attach to cubic stations on this same parent. */}
    <g data-km-rock-terrace-family="">
      {terracePlan.map((terrace,i)=>{
        const origin=quadraticPoint(root,boneControl,boneTip,terrace.at);
        const side=terrace.side;
        const spread=terrace.reach*(.95+.13*s(seed+2091,i*31));
        const high=terrace.rise*(.91+.18*s(seed+2093,i*41));
        const fall=terrace.fall*(.92+.15*s(seed+2101,i*27));
        const c1:P=[origin[0]+side*spread*.23,origin[1]-high*.86];
        const c2:P=[origin[0]+side*spread*.81,
          origin[1]-high*(i===1?.55:.76)];
        const end:P=[origin[0]+side*spread,origin[1]+fall];
        const main=rockLoadedCubicRibbon(origin,c1,c2,end,
          terrace.width*.86,seed+2111+i*101);
        const subArcStart=cubicPoint(origin,c1,c2,end,.28);
        const subArcEnd=cubicPoint(origin,c1,c2,end,.76);
        const subControl:P=[subArcStart[0]+side*spread*.29,
          subArcStart[1]+12+i*3];
        const under=rockLoadedRibbon(subArcStart,subControl,
          [subArcEnd[0]+side*3,subArcEnd[1]+8],2.5-i*.38,
          seed+2161+i*43);
        // Each fibre is a child of a specific cubic path station; do not
        // scatter generic scratches across the triangular background wash.
        const fibres=Array.from({length:terrace.marks},(_,j)=>{
          // A deliberately quiet gap between two dense ink concentrations.
          const cluster=j<Math.ceil(terrace.marks*.56)?0:1;
          const local=cluster===0
            ? .14+j*.023+(s(seed+2213,i*53+j*17)-.5)*.011
            : .56+(j-Math.ceil(terrace.marks*.56))*.034+
              (s(seed+2221,i*31+j*29)-.5)*.014;
          const station=Math.min(.87,local);
          const a=cubicPoint(origin,c1,c2,end,station);
          const ahead=cubicPoint(origin,c1,c2,end,
            Math.min(.98,station+.13));
          const drift=(ahead[0]-a[0])*.27+
            side*(2+4*s(seed+2243,i*13+j*7));
          const length=10+11*s(seed+2251,i*19+j*11)+
            (j%4===0?6:0);
          const ctrl:P=[a[0]+drift*.27,
            a[1]+length*(.26+.12*s(seed+2261,i*31+j))];
          const tip:P=[a[0]+drift,a[1]+length];
          const width=(j%7===1?1.65:j%5===0?1.3:.66)*
            (.73+.37*s(seed+2281,i*37+j));
          return {a,
            body:rockLoadedRibbon(a,ctrl,tip,width,
              seed+2293+i*71+j*13),
            dry:j%4===2};
        });
        const caps=([.24,.67] as const).map((station,j)=>{
          const a=cubicPoint(origin,c1,c2,end,station);
          const control:P=[a[0]+side*(j?3:8),a[1]+(j?1:-4)];
          const tip:P=[a[0]+side*(j?14:20),
            a[1]+(j?11:9)];
          return {a,path:rockLoadedRibbon(a,control,tip,
            2.9+j*.75,seed+2333+i*67+j*17)};
        });
        return <g key={i} data-km-rock-terrace=""
          data-km-rock-terrace-root={f(origin[0])+","+f(origin[1])}
          data-km-rock-terrace-side={side}>
          <path data-km-rock-terrace-back="" d={main}
            fill={i===1?"#625444":"#46392d"}
            opacity={f((i===1?.58:.72)*(1-.18*mist))}/>
          <path data-km-rock-terrace-under="" d={under}
            fill="#534233" opacity={f((i===1?.3:.43)*(1-.2*mist))}/>
          {caps.map(({a,path},j)=><path key={j}
            data-km-rock-terrace-cap=""
            data-km-rock-terrace-cap-root={f(a[0])+","+f(a[1])}
            d={path} fill={j?"#5e4b3a":"#312e28"}
            opacity={f((j?.51:.76)*(1-.19*mist))}/>)}
          {fibres.map(({a,body,dry},j)=><path key={j}
            data-km-rock-terrace-hemp=""
            data-km-rock-terrace-hemp-root={f(a[0])+","+f(a[1])}
            data-km-rock-terrace-hemp-dry={dry?"yes":"no"}
            d={body} fill={j%5===0?"#332f2a":"#5b4b3b"}
            opacity={f((dry?.36:j%5===0?.74:.53)*(1-.23*mist))}/>)}
        </g>;
      })}
    </g>
    {/* One broad moving backbone, with a lifted segment at mid-stroke. */}
    <path data-km-rock-hero-bone=""
      d={"M"+f(x)+" "+f(y)+
        " Q"+f(boneControl[0])+" "+f(boneControl[1])+" "+
        f(quadraticPoint(root,boneControl,boneTip,.43)[0])+" "+
        f(quadraticPoint(root,boneControl,boneTip,.43)[1])+
        " M"+f(quadraticPoint(root,boneControl,boneTip,.49)[0])+" "+
        f(quadraticPoint(root,boneControl,boneTip,.49)[1])+
        " Q"+f(boneControl[0]-9)+" "+f(boneControl[1]+23)+" "+
        f(boneTip[0])+" "+f(boneTip[1])}
      fill="none" stroke="#47382d" strokeWidth="2.35"
      strokeLinecap="round" opacity={f(.84*(1-.22*mist))}/>
    {ribPlan.map((rib,i)=>{
      const r=quadraticPoint(root,boneControl,boneTip,rib.at);
      const swing=rib.side*(rib.reach+
        (s(seed+401,i*19)-.5)*7);
      const length=rib.len*(.95+.12*s(seed+403,i*23));
      const bend:P=[r[0]+swing*.24,r[1]+length*.38];
      const tip:P=[r[0]+swing,r[1]+length];
      // Both edges follow *the same* supporting centreline; a narrow
      // calligraphic load must not balloon into a geometrical wedge.
      const face=rockLoadedRibbon(r,bend,tip,
        rib.load*.48,seed+1019*i);
      const mid=quadraticPoint(r,bend,tip,.47);
      const split=quadraticPoint(r,bend,tip,.55);
      const crease="M"+f(r[0])+" "+f(r[1])+
        " Q"+f(bend[0]-rib.side*2.1)+" "+f(bend[1])+
          " "+f(mid[0])+" "+f(mid[1])+
        " M"+f(split[0])+" "+f(split[1])+
        " Q"+f(bend[0]+swing*.12)+" "+f(bend[1]+length*.28)+
          " "+f(tip[0])+" "+f(tip[1]);
      const branches=([.3,.63] as const).map((station,k)=>{
        const point=quadraticPoint(r,bend,tip,station);
        const side=(i+k)%2===0?-rib.side:rib.side;
        const sideReach=(9+8*s(seed+419,i*17+k*7))*side;
        const tipY=point[1]+(12+13*s(seed+421,i*13+k));
        const q="M"+f(point[0])+" "+f(point[1])+
          " Q"+f(point[0]+sideReach*.19)+" "+
          f(point[1]+(tipY-point[1])*.31)+" "+
          f(point[0]+sideReach)+" "+f(tipY);
        return {point,q};
      });
      return <g key={i} data-km-rock-hero-rib=""
        data-km-rock-hero-rib-root={f(r[0])+","+f(r[1])}>
        <path data-km-rock-hero-face="" d={face}
          fill={i%2===0?"#504338":"#75614d"}
          opacity={f((i%2===0?.69:.47)*(1-.19*mist))}/>
        <path data-km-rock-hero-crease="" d={crease}
          fill="none" stroke={i%2===0?"#40362c":"#6b5744"}
          strokeWidth={f(i%2===0?1.1:.85)}
          strokeLinecap="round"
          opacity={f(.78*(1-.2*mist))}/>
        {branches.map(({point,q},k)=><path key={k}
          data-km-rock-hero-fibre=""
          data-km-rock-hero-fibre-root={f(point[0])+","+f(point[1])}
          d={q} stroke={k?"#7b654f":"#443b32"}
          fill="none" strokeWidth={f(k?.7:.93)}
          strokeLinecap="round" opacity={f(.57*(1-.18*mist))}/>)}
      </g>;
    })}
    {/* The deepest local junction absorbs pigment while its edges still
        release into bare paper. Never render it as a detached triangle. */}
    <path data-km-rock-hero-recess=""
      d={"M"+f(pool[0]-4.2)+" "+f(pool[1]-3.4)+
        " Q"+f(pool[0]+7)+" "+f(pool[1]-8.2)+
        " "+f(pool[0]+12)+" "+f(pool[1]+.8)+
        " Q"+f(pool[0]+7.9)+" "+f(pool[1]+8)+
        " "+f(pool[0]-1.6)+" "+f(pool[1]+6.4)+
        " Q"+f(pool[0]-6.3)+" "+f(pool[1]+2)+
        " "+f(pool[0]-4.2)+" "+f(pool[1]-3.4)+" Z"}
      fill="#3c342d" opacity={f(.59*(1-.25*mist))}/>
  </g>;
}
function MountainRockShoulders({ridge,stations,seed,band,detail,mist,id}:{
  ridge:readonly P[];stations:readonly P[];seed:number;band:number;
  detail:number;mist:number;id:string;
}){
  // Geologically anchored positive peaks, not random page coordinates.
  const peaks=ridge.slice(1,-1).flatMap(([x,y],i)=>
    y<ridge[i][1]&&y<ridge[i+2][1] ? [[x,y] as P] : []);
  const count=Math.round(peaks.length*detail);
  // Only the dominant peak of the middle mountain layer receives the
  // authored hero rock anatomy. Repeating it at every peak would erase
  // the handscroll's deliberate sparse/dense geographic rhythm.
  const ridgeClip=id+"-clip",washFilter=id+"-paper-absorption";
  return <g data-km-rock-shoulder-family={band}>
    <defs>
      <clipPath id={ridgeClip} clipPathUnits="userSpaceOnUse">
        <path d={ridgePath(stations)}/>
      </clipPath>
      {/* Distinct wet wash, not a smoothed contour or global scene blur:
          pigment wicks into paper and loses the hard SVG triangle rim.
          Bone/child hemp fibres stay crisp and independently editable. */}
      <filter id={washFilter} x="-19%" y="-19%" width="138%"
        height="138%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".052"
          numOctaves="2" seed={seed%997+1} result="paper"/>
        <feDisplacementMap in="SourceGraphic" in2="paper"
          scale="2.1" xChannelSelector="R" yChannelSelector="G"
          result="absorbed"/>
        <feGaussianBlur in="absorbed" stdDeviation=".72"/>
      </filter>
    </defs>
    <g clipPath={"url(#"+ridgeClip+")"}>
      {peaks.slice(0,count).map(([x],i)=>{
        const crest=ridgeHeight(stations,x);
        const side=s(seed+band*37,i*17+13)>.48?1:-1;
        const depth=(band===0?49:band===1?72:94)*
          (.84+.27*s(seed+151,i*19));
        const spread=(band===0?19:band===1?32:43)*
          (.78+.32*s(seed+163,i*13));
        const y=crest+2.5;
        const parent:P=[x,y];
        const bend:P=[
          x+side*spread*.31,y+depth*.39,
        ];
        const end:P=[
          x+side*spread*.71,y+depth*.91,
        ];
        const washId=id+"-wash-"+i;
        // Unequal rounded fold edges and a depleted lower release.
        const wash="M"+f(x-side*spread*.15)+" "+f(y)+
          " C"+f(x-side*spread*.48)+" "+f(y+depth*.23)+
          " "+f(x+side*spread*.04)+" "+f(y+depth*.36)+
          " "+f(x-side*spread*.18)+" "+f(y+depth*.64)+
          " Q"+f(x+side*spread*.04)+" "+f(y+depth*.87)+
          " "+f(x+side*spread*.55)+" "+f(y+depth)+
          " Q"+f(x+side*spread*.94)+" "+f(y+depth*.71)+
          " "+f(x+side*spread*.85)+" "+f(y+depth*.41)+
          " Q"+f(x+side*spread*.55)+" "+f(y+depth*.13)+
          " "+f(x+side*spread*.22)+" "+f(y)+" Z";
        const spineA=quadraticPoint(parent,bend,end,.43);
        const spineB=quadraticPoint(parent,bend,end,.57);
        const bone="M"+f(parent[0])+" "+f(parent[1])+
          " Q"+f(bend[0])+" "+f(bend[1])+
          " "+f(spineA[0])+" "+f(spineA[1])+
          " M"+f(spineB[0])+" "+f(spineB[1])+
          " Q"+f(bend[0]+side*spread*.13)+" "+f(y+depth*.75)+
          " "+f(end[0])+" "+f(end[1]);
        const veins=Array.from({length:band===0?3:band===1?5:7},(_,j)=>{
          const t=.18+j*.09+(s(seed+181,i*37+j*11)-.5)*.025;
          const root=quadraticPoint(parent,bend,end,t);
          const length=(band===0?17:band===1?27:35)*
            (.72+.39*s(seed+193,i*47+j*7));
          const wing=(j%2===0?-side:side);
          const reach=length*(.37+.18*s(seed+197,i*17+j));
          const tip:P=[
            root[0]+wing*reach,
            root[1]+length*(.76+.16*s(seed+199,i*19+j)),
          ];
          const arc:P=[
            root[0]+wing*reach*.31,
            root[1]+length*.36,
          ];
          const out="M"+f(root[0])+" "+f(root[1])+
            " Q"+f(arc[0])+" "+f(arc[1])+
            " "+f(tip[0])+" "+f(tip[1]);
          return {root,d:out};
        });
        // Alum-head outcrops describe the rock cap's thickness. Their
        // dark interiors are physically attached to the crest-to-foothill
        // spine, not detached triangles sprinkled across the mountain.
        // Sparse, uneven lips expose paper at different heights.
        const shelves=Array.from({length:band===0?1:band===1?2:3},
          (_,j)=>{
            const t=.24+j*.205+
              (s(seed+251,i*37+j*13)-.5)*.025;
            const root=quadraticPoint(parent,bend,end,t);
            const wing=(j%2===0?side:-side);
            const reach=(band===0?6:band===1?11:15)*
              (.81+.34*s(seed+263,i*19+j*17));
            const load=(band===0?2.3:band===1?4.2:5.9)*
              (.76+.33*s(seed+269,i*23+j));
            const x0=root[0],y0=root[1];
            const face="M"+f(x0)+" "+f(y0)+
              " Q"+f(x0+wing*reach*.24)+" "+f(y0-load*.4)+
              " "+f(x0+wing*reach*.53)+" "+f(y0-load*.28)+
              " Q"+f(x0+wing*reach*.73)+" "+f(y0-load*.55)+
              " "+f(x0+wing*reach)+" "+f(y0+load*.18)+
              " Q"+f(x0+wing*reach*.94)+" "+f(y0+load*.77)+
              " "+f(x0+wing*reach*.58)+" "+f(y0+load)+
              " Q"+f(x0+wing*reach*.28)+" "+f(y0+load*.64)+
              " "+f(x0)+" "+f(y0)+" Z";
            const rim="M"+f(x0)+" "+f(y0)+
              " Q"+f(x0+wing*reach*.34)+" "+f(y0-load*.58)+
              " "+f(x0+wing*reach*.53)+" "+f(y0-load*.28)+
              " Q"+f(x0+wing*reach*.78)+" "+f(y0-load*.46)+
              " "+f(x0+wing*reach)+" "+f(y0+load*.18);
            return {root,face,rim};
          });
        return <g key={i} data-km-rock-shoulder=""
          data-km-rock-shoulder-crest={f(crest)}
          data-km-rock-shoulder-root={f(x)+","+f(y)}
          data-km-rock-shoulder-band={band}
          data-km-rock-shoulder-seed={seed}>
          <defs>
            <linearGradient id={washId}
              gradientUnits="userSpaceOnUse"
              x1={f(x)} y1={f(y)}
              x2={f(x+side*spread*.43)} y2={f(y+depth)}>
              <stop offset="0" stopColor="#39352e"
                stopOpacity={f((band===0?.28:band===1?.58:.78)*(1-.2*mist))}/>
              <stop offset=".26" stopColor="#554737"
                stopOpacity={f((band===0?.23:band===1?.45:.62)*(1-.24*mist))}/>
              <stop offset=".69" stopColor="#79614c"
                stopOpacity={f((band===0?.13:band===1?.26:.4)*(1-.22*mist))}/>
              <stop offset="1" stopColor="#927d62" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path data-km-rock-shoulder-wash=""
            d={wash} fill={"url(#"+washId+")"}
            filter={"url(#"+washFilter+")"}/>
          {shelves.map(({root,face,rim},j)=><g key={"ledge"+j}
            data-km-rock-alum-ledge=""
            data-km-rock-alum-ledge-root={f(root[0])+","+f(root[1])}>
            <path data-km-rock-alum-face="" d={face}
              fill={j%2===0?"#48382d":"#65503e"}
              opacity={f((band===0?.27:band===1?.47:.66)*
                (.78+.19*s(seed+281,i*19+j))*(1-.18*mist))}/>
            <path data-km-rock-alum-rim="" d={rim} fill="none"
              stroke="#4d3a2c"
              strokeWidth={f(band===0?.53:band===1?.77:.98)}
              opacity={f((band===0?.29:band===1?.48:.68)*(1-.22*mist))}
              strokeLinecap="round"/>
          </g>)}
          <path data-km-rock-shoulder-bone=""
            d={bone} fill="none" stroke="#4b3d31"
            strokeWidth={f(band===0?.75:band===1?1.28:1.73)}
            strokeLinecap="round"
            opacity={f((band===0?.23:band===1?.48:.68)*(1-.18*mist))}/>
          {veins.map(({root,d},j)=><path key={j}
            data-km-rock-shoulder-vein=""
            data-km-rock-shoulder-vein-root={f(root[0])+","+f(root[1])}
            d={d} fill="none" stroke={j%3===0?"#574332":"#765b45"}
            strokeWidth={f((band===0?.45:band===1?.7:1.05)*
              (.65+.5*s(seed+223,i*13+j)))}
            opacity={f((band===0?.28:band===1?.47:.64)*
              (.74+.19*s(seed+227,i*29+j))*(1-.24*mist))}
            strokeLinecap="round"/>)}
        </g>;
      })}
    </g>
  </g>;
}
/** Five related mid-distance ink pines perched on the *painted* ridge.
 * ArtCraft v7 structural reference: Huang Gongwang's "Dwelling in the
 * Fuchun Mountains" (NPM, tree-and-fisherman detail, illustrated by
 * Smarthistory). The visual motif is slender independent trunk ink bones,
 * forked branches, short irregular dark brush commas and visible paper
 * gaps—not a row of triangular Christmas tree silhouettes.
 *
 * These are original compositional curves. All 5 bases are sampled from
 * exactly the same fractured ridge stations that draw the mountain.
 */
function CliffPineGrove({stations,scene,seed,detail,mist}:{
  stations:readonly P[];scene:ShanshuiScene;seed:number;
  detail:number;mist:number;
}){
  if(detail<.58)return null;
  const center=scene==="mountain-trail"?620:
    scene==="river-scholar"?596:536;
  const distribution=[
    {dx:-33,height:43,bow:-6},
    {dx:-17,height:62,bow:7},
    {dx:-2,height:76,bow:-5},
    {dx:18,height:57,bow:10},
    {dx:33,height:42,bow:-6},
  ] as const;
  const shade=(1-.17*mist);
  return <g data-km-cliff-pine-grove=""
    data-km-cliff-pine-scene={scene}>
    {distribution.map(({dx,height,bow},i)=>{
      const x=center+dx+(s(seed+1703,i*31)-.5)*3.2;
      const crest=ridgeHeight(stations,x);
      const root:P=[x,crest+2.8];
      const trunkControl:P=[
        x+bow*.48,root[1]-height*.57,
      ];
      const crown:P=[
        x+bow,root[1]-height,
      ];
      const trunk=rockLoadedRibbon(root,trunkControl,crown,
        i===2?1.63:1.08,seed+1711+i*29);
      const barkFrom=quadraticPoint(root,trunkControl,crown,.13);
      const barkTo=quadraticPoint(root,trunkControl,crown,.89);
      const bark="M"+f(barkFrom[0])+" "+f(barkFrom[1])+
        " Q"+f(trunkControl[0]-1.4)+" "+f(trunkControl[1])+
        " "+f(barkTo[0])+" "+f(barkTo[1]);
      const boughs=([.31,.5,.67,.84] as const).map((t,j)=>{
        // Every branch root is *on* its own winding trunk, while the
        // ink-loaded terminal twigs carry their own fine foliage tips.
        const origin=quadraticPoint(root,trunkControl,crown,t);
        const direction=(j%2===0?-1:1)*(i%3===0?-1:1);
        const distance=(i===2?24:17)+
          13*s(seed+1763,i*19+j*17);
        const tip:P=[
          origin[0]+direction*distance,
          origin[1]-(3.2+9.8*s(seed+1777,i*13+j*23)),
        ];
        const control:P=[
          origin[0]+direction*distance*.34,
          origin[1]+(j%3===0?3:-4)-3*s(seed+1789,i*23+j),
        ];
        const bone=rockLoadedRibbon(origin,control,tip,
          1.12*(1-.12*j),seed+1801+i*17+j*37);
        const touchCount=[13,18,14,17][j];
        const foliage=Array.from({length:touchCount},(_,k)=>{
          const at=clamp(.48+(k+.35)/(touchCount+.9)*.5+
            (s(seed+1811,i*301+j*47+k*19)-.5)*.025,.43,.985);
          const attach=quadraticPoint(origin,control,tip,at);
          const lean=(s(seed+1823,i*131+j*29+k*7)-.5);
          const reach=3.1+7.8*s(seed+1831,i*43+j*11+k*31);
          const side=(k%7===0?-1:1);
          const tipX=attach[0]+direction*(1.4+3.3*lean)+
            side*(s(seed+1847,i*53+j*13+k)-.5)*3.6;
          const tipY=attach[1]-reach*(k%5===1?.56:1)+
            (k%9===0?reach*.64:0);
          const path="M"+f(attach[0])+" "+f(attach[1])+
            " Q"+f(attach[0]+(tipX-attach[0])*.38+lean*1.8)+
            " "+f(attach[1]+(tipY-attach[1])*.46)+
            " "+f(tipX)+" "+f(tipY);
          return {attach,path,loaded:k%6===0};
        });
        // Three local loaded *ink pads* join true bough stations.
        // In the source, the black crowns are packed, overlapping
        // brush islands—uniform isolated comb needles were too pale
        // at 960×540. Fine needle taps remain visible over these pads.
        const pads=([.69,.81,.92] as const).map((at,k)=>{
          const a=quadraticPoint(origin,control,tip,at);
          const reach=(6+5*s(seed+1897,i*17+j*31+k*7));
          const tipPad:P=[
            a[0]+direction*reach,
            a[1]-(3+5*s(seed+1901,i*13+j*19+k)),
          ];
          const arch:P=[
            a[0]+direction*reach*.39,
            a[1]+(k===1?1.7:-1.8),
          ];
          return {root:a,path:rockLoadedRibbon(a,arch,tipPad,
            (k===1?2.85:1.95)*(1+.18*s(seed+1907,i*31+j*23+k)),
            seed+1921+i*41+j*11+k*19)};
        });
        return {origin,bone,foliage,pads};
      });
      return <g key={i} data-km-cliff-pine=""
        data-km-cliff-pine-root={f(root[0])+","+f(root[1])}
        data-km-cliff-pine-crest={f(crest)}
        data-km-cliff-pine-height={height}>
        <path data-km-cliff-pine-trunk="" d={trunk}
          fill="#37332d" opacity={f(.91*shade)}/>
        <path data-km-cliff-pine-bark="" d={bark}
          stroke="#a18b70" fill="none" strokeWidth=".48"
          strokeLinecap="round" opacity={f(.47*shade)}/>
        {boughs.map(({origin,bone,foliage,pads},j)=>
          <g key={j} data-km-cliff-pine-bough=""
            data-km-cliff-pine-bough-root={f(origin[0])+","+f(origin[1])}>
            <path data-km-cliff-pine-bough-bone="" d={bone}
              fill={j%2===0?"#3d352d":"#554638"}
              opacity={f(.88*shade)}/>
            {pads.map(({root:padRoot,path},k)=><path key={"pad"+k}
              data-km-cliff-pine-pad=""
              data-km-cliff-pine-pad-root={f(padRoot[0])+","+f(padRoot[1])}
              d={path} fill={k===1?"#302b25":"#40372d"}
              opacity={f((k===1?.91:.77)*shade)}/>)}
            {foliage.map(({attach,path,loaded},k)=><path key={k}
              data-km-cliff-pine-needle=""
              data-km-cliff-pine-needle-root={f(attach[0])+","+f(attach[1])}
              d={path} stroke={loaded?"#282922":"#3c362b"}
              strokeWidth={f(loaded?1.13:.54+.39*s(seed+1877,i*13+j*29+k))}
              opacity={f((loaded?.9:.65+.23*s(seed+1889,i*71+j*19+k))*shade)}
              strokeLinecap="round" fill="none"/>)}
          </g>)}
      </g>;
    })}
  </g>;
}
function Mountains({scene,seed,detail,mist,ink,school,ids}:{
  scene:ShanshuiScene;seed:number;detail:number;mist:number;ink:number;
  school:InkRockSchool;
  ids:{far:string;mid:string;near:string;grain:string};
}){
  return <g data-km-shanshui-mountains="">
    {RIDGES[scene].map((baseRidge,band)=>{
      // Source school changes only its authored mountain-trail middle-rock
      // skeleton. Far/near ridge depth, path, waterfall and camera remain.
      const ridge=scene==="mountain-trail"&&band===1&&school!=="fuchun"
        ?MASTER_TRAIL_MIDDLE[school]:baseRidge;
      const width=band===0?1.1:band===1?1.3:1.8;
      const stations=ridgeStations(ridge,seed,band);
      const count=Math.round((band===0?27:band===1?48:67)*detail);
      // Select the original mid-range root before painting; a loaded
      // geometric crag must not be faded again by the parent slope wash.
      const peaks=ridge.slice(1,-1).flatMap(([px,py],i)=>
        py<ridge[i][1]&&py<ridge[i+2][1] ? [[px,py] as P] : []);
      const heroPeak=band===1&&peaks.length
        ?peaks.reduce((best,p)=>p[1]<best[1]?p:best,peaks[0]):null;
      return <g key={band}>
        <g data-km-shanshui-ridge={band}
          opacity={(band===0?.32:band===1?.65:.86)*ink}>
        <path data-km-shanshui-ridge-contour={band} d={ridgePath(stations)}
          fill={"url(#"+([ids.far,ids.mid,ids.near][band])+")"}
          stroke={band===2?"#765e48":"#ac9070"} strokeWidth={band===2?1.05:.55}/>
        <MountainRockShoulders ridge={ridge} stations={stations}
          seed={seed+band*251} band={band} detail={detail} mist={mist}
          id={ids.grain+"-rock-"+band}/>
        <RockInkPlanes stations={stations} seed={seed+band*181} band={band}
          detail={detail} mist={mist}/>
        {/* Ink grove must be AFTER the mountain silhouette and OUTSIDE
            the cliff-plane clipping group, so all crown strokes appear
            over the ridge while each trunk enters painted terrain. */}

        {/* Reference-led rock painting: cluster different brush pressures
            over local geology. Leave quiet paper between texture families,
            rather than repeating parallel grooves across all the mountains. */}
        {Array.from({length:count},(_,i)=>{
          const centers=band===0?[80,250,570,740,900]:[70,210,350,560,720,890];
          const pocket=i%centers.length;
          const x=centers[pocket]+
            (s(seed+band*1201,i*13+3)-.5)*80+
            (s(seed+band*79,pocket*3+11)-.5)*12;
          const crest=ridgeHeight(stations,x);
          const y=crest+5+11*s(seed+5,i*19+band);
          const slope=(ridgeHeight(stations,x+14)-ridgeHeight(stations,x-14))/28;
          const rawLength=(band===0?27:band===1?53:77)*
            (.32+.73*s(seed+19,i*7+band));
          const short=i%4===1||i%5===0;
          const length=rawLength*(short?.52:1);
          const dx=clamp(slope*length*.54+
            (s(seed+29,i*5+band)-.5)*length*.3,
            -length*.56,length*.56);
          const opacity=(.27+.55*s(seed+8,i*11+band))*(1-.38*mist);
          const axe=band>0&&Math.abs(slope)>.5&&
            s(seed+band*47,i*13+19)>.29;
          const style=axe?"side-axe":short?"short-hemp":"long-hemp";
          const side=(slope>=0?1:-1)*(4+4*s(seed+9,i*5+27));
          const cut=length*.67;
          const d=axe
            ?"M"+f(x)+" "+f(y)+
              " Q"+f(x+side*.2)+" "+f(y+cut*.05)+
              " "+f(x+dx*.52+side)+" "+f(y+cut*.23)+
              " L"+f(x+dx*.52+side*1.08)+" "+f(y+cut*.31)+
              " Q"+f(x+side*.68)+" "+f(y+cut*.24)+
              " "+f(x+side*.11)+" "+f(y+cut*.57)+
              " Q"+f(x-side*.25)+" "+f(y+cut*.34)+
              " "+f(x)+" "+f(y)+" Z"
            :short
            ?"M"+f(x)+" "+f(y)+
              " Q"+f(x+dx*.15+2)+" "+f(y+length*.3)+
              " "+f(x+dx*.48)+" "+f(y+length*.53)+
              " M"+f(x+dx*.59)+" "+f(y+length*.64)+
              " Q"+f(x+dx*.74-2)+" "+f(y+length*.85)+
              " "+f(x+dx)+" "+f(y+length)
            :"M"+f(x)+" "+f(y)+
              " C"+f(x+dx*.11-2)+" "+f(y+length*.22)+
              " "+f(x+dx*.44+3)+" "+f(y+length*.35)+
              " "+f(x+dx*.52)+" "+f(y+length*.57)+
              " S"+f(x+dx*.82-3)+" "+f(y+length*.87)+
              " "+f(x+dx)+" "+f(y+length);
          const lift="M"+f(x+dx*.22+1)+" "+f(y+length*.27)+
            " Q"+f(x+dx*.52+1.5)+" "+f(y+length*.46)+
            " "+f(x+dx*.75)+" "+f(y+length*.7);
          return <g key={i} data-km-shanshui-cunfa="">
            <path data-km-cunfa-kind={axe?"axe":"hemp"}
              data-km-cunfa-style={style}
              data-km-cunfa-crest-y={f(crest)} data-km-cunfa-root-y={f(y)}
              data-km-cunfa-root-x={f(x)} d={d}
              fill={axe?INK:"none"} stroke={axe?"none":band===2?INK:STONE}
              strokeWidth={f(width*(.49+s(seed+11,i+band)*.7))}
              strokeLinecap="round" opacity={f(opacity*(axe?.77:1))}/>
            {i%3===0&&<path data-km-cunfa-dry-brush=""
              d={lift} fill="none" stroke="#e0cbb0"
              strokeWidth={f(.3+width*.28)} opacity={f(opacity*.44)}/>}
          </g>;
        })}
        {/* Dragon-vein structure: selected true crest high points produce
            descending fractured rock spines, not free-floating random rain. */}
        {ridge.slice(1,-1).flatMap(([rx,ry],i)=>{
          if(ry>=ridge[i][1]||ry>=ridge[i+2][1]||detail===0)return [];
          const crest=ridgeHeight(stations,rx);
          const rootY=crest+6;
          const len=(band===0?25:band===1?43:56)*
            (.8+.31*s(seed+band*31,i*15+19));
          const drift=(s(seed+band*7,i*11+37)-.5)*len*.68;
          const lateral=(s(seed+band*19,i*7+41)-.5)*len*.28;
          // Three short pressure marks with real paper gaps. A single long
          // line read like leaking paint rather than a fractured cliff.
          const d="M"+f(rx)+" "+f(rootY)+
            " Q"+f(rx+lateral*.12)+" "+f(rootY+len*.12)+
            " "+f(rx+lateral*.45)+" "+f(rootY+len*.23)+
            " M"+f(rx+lateral*.55+1.7)+" "+f(rootY+len*.35)+
            " Q"+f(rx+lateral+drift*.26)+" "+f(rootY+len*.47)+
            " "+f(rx+lateral+drift*.46)+" "+f(rootY+len*.59)+
            " M"+f(rx+lateral+drift*.58+1.2)+" "+f(rootY+len*.73)+
            " Q"+f(rx+lateral+drift*.82)+" "+f(rootY+len*.82)+
            " "+f(rx+lateral+drift)+" "+f(rootY+len*.92);
          return [<g key={"spine-"+i}>
            <path data-km-rock-spine="" data-km-rock-spine-root-y={f(crest)}
              d={d} fill="none"
              stroke={band===0?"#685b4c":INK}
              strokeWidth={band===0?.72:band===1?.96:1.22}
              strokeLinecap="round"
              opacity={f((band===0?.32:.54)*(1-.35*mist))}/>
            <path d={"M"+f(rx+lateral*.5+3)+" "+f(rootY+len*.35)+
              " Q"+f(rx+drift*.26+3)+" "+f(rootY+len*.45)+
              " "+f(rx+drift*.3+3)+" "+f(rootY+len*.52)}
              fill="none" stroke="#d1bb96" strokeWidth=".64"
              opacity=".28"/>
          </g>];
        })}
        {/* Moss dots cling to the actual crest rather than being random screen confetti. */}
        {Array.from({length:Math.round((band===2?52:22)*detail)},(_,i)=>{
          const centers=band===0?[80,250,570,740,900]:[70,210,350,560,720,890];
          const pocket=i%centers.length;
          const x=centers[pocket]+
            (s(seed+band*31,i*3+97)-.5)*89;
          const y=ridgeHeight(stations,x)+3+10*s(seed+band*51,i+119);
          return <ellipse key={i} cx={f(x)} cy={f(y)}
            rx={f(.65+1.9*s(seed,i*13+band))}
            ry={f(.45+.9*s(seed,i*9+band))}
            fill={INK} opacity={.17+.36*s(seed,i*7+3)}/>;
        })}
        </g>
        {/* The fine calligraphic hero is a sibling of the broad mountain
            wash, not its opacity child. Retain the identical ridge-space
            clip so not one pixel paints into the sky. Like the separate
            pine layer this rescues true dark ink deposits without replacing
            the source-structured geometry with a flat contrast filter. */}
        {heroPeak&&detail>.7&&<g data-km-rock-hero-paint-layer=""
          opacity={f(.98*ink)}>
          <defs>
            <clipPath id={ids.grain+"-hero-"+band+"-clip"}
              clipPathUnits="userSpaceOnUse">
              <path d={ridgePath(stations)}/>
            </clipPath>
          </defs>
          <g clipPath={"url(#"+ids.grain+"-hero-"+band+"-clip)"}>
            <MasterRockBrush root={[heroPeak[0],ridgeHeight(stations,heroPeak[0])+2.5]}
              seed={seed+band*251+777} mist={mist} detail={detail} school={school}/>
            {school==="fuchun"&&<MountainHeroCliff
              root={[heroPeak[0],ridgeHeight(stations,heroPeak[0])+2.5]}
              seed={seed+band*251+777} mist={mist} detail={detail}/>}

          </g>
        </g>}
        {/* Independently loaded foreground-to-midground brush layer.
            Keep BEFORE near ridge (it can occlude lower trunks), but
            remove the middle mountain's .65× opacity that made black
            pine clusters disappear at 960×540 playback. */}
        {band===1&&<g opacity={f(.85*ink)}>
          <CliffPineGrove stations={stations} scene={scene}
            seed={seed+1819} detail={detail} mist={mist}/>
        </g>}
      </g>;
    })}
  </g>;
}
function Clouds({shift}:{shift:number}){
  const d="M-51 0 C-34 -7 -25 2 -17 -8 C-11 -15 -1 -11 4 -8 C9 -5 21 -12 28 -6 C35 -1 44 -3 51 -7 M-29 8 C-19 13 -8 9 2 7 C16 4 32 10 42 7";
  return <g fill="none" stroke="#97816a" strokeWidth="1" strokeLinecap="round" opacity=".52"
    transform={"translate("+f(shift)+",0)"}>
    <path d={d} transform="translate(187 143) scale(1.43 .72)"/>
    <path d={d} transform="translate(730 162) scale(.92 .6)"/>
    <path d={d} transform="translate(832 236) scale(.76 .54)" opacity=".72"/>
  </g>;
}
function Birds({motion}:{motion:ShanshuiMotion}){
  return <g fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round"
    data-km-shanshui-birds="" data-km-shanshui-bird-x={f(motion.birdX)}
    transform={"translate("+f(motion.birdX-620)+" "+f(motion.birdY-145)+")"}>
    {[{x:620,y:145,k:1},{x:592,y:165,k:.65},{x:663,y:158,k:.5}].map((b,i)=>
      <g key={i} transform={"translate("+b.x+" "+b.y+") scale("+b.k+")"}>
        <path d={"M-13 1 Q-7 "+f(-6+motion.birdWing*5)+" 0 1 Q8 "+
          f(-6-motion.birdWing*5)+" 14 1"}/>
      </g>)}
  </g>;
}
/** Willow foliage has independent drooping strands and individually tapered leaves.
 * The vine origin follows its branch; tiny breeze changes leaf rotation only.
 */
function Willow({wind,seed,detail}:{wind:number;seed:number;detail:number}){
  // Parent every hanging frond to a point ON an authored bough. Earlier
  // random x/y samples left leaf sprays disconnected from the main tree.
  const arches:readonly {from:P;control:P;to:P}[]=[
    {from:[27,-228],control:[140,-328],to:[326,-329]},
    {from:[36,-254],control:[151,-364],to:[393,-332]},
    {from:[58,-298],control:[187,-303],to:[379,-284]},
    {from:[78,-319],control:[205,-370],to:[352,-357]},
    {from:[17,-213],control:[99,-276],to:[243,-252]},
    {from:[40,-248],control:[138,-286],to:[302,-291]},
  ];
  const strands=Math.round(39*detail);
  return <g data-km-shanshui-willow="" transform="translate(25 433)">
    <path d="M-16 10 Q10 -43 18 -112 Q24 -172 35 -237 Q54 -281 97 -315 Q133 -333 168 -347
      Q108 -335 63 -314 Q20 -289 7 -238 Q-9 -161 -26 -94 Q-31 -38 -25 10 Z"
      fill="#7e654a" stroke={INK} strokeWidth="2.2"/>
    <path d="M-10 -3 Q6 -116 26 -217 Q39 -295 115 -332 M1 -91 Q23 -159 30 -223"
      fill="none" stroke="#dfc89f" strokeWidth="5" opacity=".45"/>
    {arches.map((branch,i)=>{
      // A flexible, shrinking ink ribbon: the primary branch retains a
      // loaded root and releases to a hairline, unlike uniform-width bars.
      const steps=14;
      const sides:[P[],P[]]=[[],[]];
      for(let k=0;k<=steps;k++){
        const t=k/steps;
        const center=quadraticPoint(branch.from,branch.control,branch.to,t);
        const tx=2*(1-t)*(branch.control[0]-branch.from[0])+
          2*t*(branch.to[0]-branch.control[0]);
        const ty=2*(1-t)*(branch.control[1]-branch.from[1])+
          2*t*(branch.to[1]-branch.control[1]);
        const norm=Math.max(1e-6,Math.hypot(tx,ty));
        const pressure=(1.48+.19*(i%3))*Math.pow(1-t,.86)+.07;
        const nx=-ty/norm*pressure,ny=tx/norm*pressure;
        sides[0].push([f(center[0]+nx),f(center[1]+ny)]);
        sides[1].push([f(center[0]-nx),f(center[1]-ny)]);
      }
      const points=[...sides[0],...sides[1].reverse()];
      const d=points.map((v,j)=>(j?" L":"M")+f(v[0])+" "+f(v[1])).join("")+" Z";
      return <g key={i}>
        <path data-km-willow-tapered-branch="" d={d}
          fill="#71573e" opacity=".72"/>
        <path d={"M"+branch.from.join(" ")+" Q"+
          branch.control.join(" ")+" "+branch.to.join(" ")}
          stroke="#af9069" strokeWidth=".45" opacity=".39" fill="none"/>
      </g>;
    })}
    <path d="M31 -233 Q137 -320 322 -325 M41 -252 Q152 -352 387 -331
      M62 -294 Q197 -298 367 -280"
      stroke="#c0a180" strokeWidth=".69" fill="none" opacity=".38"/>
    {Array.from({length:strands},(_,i)=>{
      const branch=arches[i%arches.length];
      const u=.13+.83*s(seed,i*7+9);
      // Exactly one insertion point on the original parent arch.
      const origin=quadraticPoint(branch.from,branch.control,branch.to,u);
      const fall=80+148*s(seed,i*11+20);
      // A willow droops: the top of the frond bows outward, but its
      // lower half returns to a nearly vertical fall. The previous
      // 60 px lateral sweep made a diagonal mesh across the sky.
      const sweep=i%3===0?-1:i%3===1?1:
        s(seed+401,i*7+19)>.5?1:-1;
      const drift=sweep*(7+20*s(seed+427,i*13+11));
      const end:P=[origin[0]+drift+wind*8,
        origin[1]+fall*(1+.012*wind)];
      const control:P=[
        end[0]+sweep*(13+16*s(seed+439,i*17+37))-wind*3,
        origin[1]+fall*(.31+.11*s(seed+457,i*23+13)),
      ];
      const frondPoint=(t:number)=>quadraticPoint(origin,control,end,t);
      const stationCount=11;
      const upper:P[]=[],lower:P[]=[];
      for(let k=0;k<stationCount;k++){
        const t=k/(stationCount-1);
        const point=frondPoint(t);
        const before=frondPoint(Math.max(0,t-.012));
        const after=frondPoint(Math.min(1,t+.012));
        const dx=after[0]-before[0],dy=after[1]-before[1];
        const len=Math.hypot(dx,dy)||1;
        const pressure=(.72+.37*s(seed+467,i*5+29))*
          Math.pow(1-t,.91)+.045;
        const nx=-dy/len*pressure,ny=dx/len*pressure;
        upper.push([point[0]+nx,point[1]+ny]);
        lower.push([point[0]-nx,point[1]-ny]);
      }
      const ribbon="M"+upper.map(([x,y])=>f(x)+" "+f(y)).join(" L")+
        " L"+lower.reverse().map(([x,y])=>f(x)+" "+f(y)).join(" L")+" Z";
      // A few source-informed bare silk strands preserve visible paper,
      // while restrained leaves hang from the *same* painted centerline.
      const leafCount=i%9===0?0:5+Math.floor(3*s(seed,i*5+2));
      return <g key={i} data-km-willow-frond=""
        data-km-willow-frond-root={f(origin[0])+","+f(origin[1])}
        data-km-willow-frond-tip={f(end[0])+","+f(end[1])}
        data-km-willow-frond-drift={f(end[0]-origin[0])}
        data-km-willow-frond-leaves={leafCount}>
        <path data-km-willow-pressure-strand="" d={ribbon}
          fill={i%7===0?"#554535":"#897158"}
          opacity={f(.33+.18*s(seed+479,i*17+7))}/>
        {i%4===0&&<path data-km-willow-dry-release=""
          d={"M"+f(origin[0])+" "+f(origin[1])+
            " Q"+f(control[0])+" "+f(control[1])+
            " "+f(end[0])+" "+f(end[1])}
          stroke="#b8a081" strokeWidth=".35" opacity=".35"
          fill="none" strokeLinecap="round"/>}
        {Array.from({length:leafCount},(_,j)=>{
          const t=clamp((j+.75+
            .42*(s(seed+491,i*31+j*9)-.5))/(leafCount+1),.05,.94);
          const [x,y]=frondPoint(t);
          const after=frondPoint(Math.min(1,t+.025));
          const vx=after[0]-x,vy=after[1]-y;
          const len=Math.hypot(vx,vy)||1;
          const tx=vx/len,ty=vy/len,nx=-ty,ny=tx;
          const side=s(seed+509,i*43+j*19)>.47?1:-1;
          const reach=5+6.5*s(seed+521,i*13+j*11);
          const width=.52+1.4*s(seed+547,i*29+j);
          const tipX=x+nx*side*reach*.78+tx*reach*.32;
          const tipY=y+ny*side*reach*.78+ty*reach*.32;
          const leaf="M"+f(x)+" "+f(y)+
            " C"+f(x+nx*side*reach*.2-tx*width)+" "+
                f(y+ny*side*reach*.2-ty*width)+
            " "+f(tipX-nx*side*reach*.22-tx*.5)+" "+
                f(tipY-ny*side*reach*.22-ty*.5)+
            " "+f(tipX)+" "+f(tipY)+
            " C"+f(tipX-nx*side*reach*.32+tx*width*.25)+" "+
                f(tipY-ny*side*reach*.32+ty*width*.25)+
            " "+f(x+nx*side*reach*.12+tx*width)+" "+
                f(y+ny*side*reach*.12+ty*width)+
            " "+f(x)+" "+f(y)+" Z";
          return <path key={j} data-km-willow-leaf=""
            d={leaf} fill={j%5===0?"#a88c69":"#635342"}
            opacity={f(.29+.33*s(seed+563,i*11+j*5))}/>;
        })}
      </g>;
    })}
    {Array.from({length:31},(_,i)=>{
      const yy=-21-i*8,xx=-14+15*Math.sin(i*.25);
      return <path key={i} data-km-willow-bark=""
        d={"M"+f(xx)+" "+f(yy)+" q"+f(8+s(seed,i)*10)+" -17 "+f(17+s(seed,i+2)*18)+" -18"}
        fill="none" stroke={i%3===0?"#382a22":"#bd9b71"} strokeWidth={i%3===0?1.7:1}
        opacity={.5+s(seed,i+2)*.35}/>;
    })}
  </g>;
}
/** Source-study motif: old pine branchlets terminate in separate radial,
 * pressure-loaded needle rosettes, not one flat comb-shaped canopy. Every
 * visible twig roots in the parent branch point and needle root meets a twig.
 * Keep all brush deposition seek-stable and preserve paper between clusters.
 */
/** A pine tuft is a damp ink mass punctuated by scores of individually
 * tapering dry needles. Short compact fans and deliberate gaps prevent the
 * large 'firework spikes on a ruler' appearance of the previous rendering.
 */
function NeedleSpray({x,y,scale,seed,wind,lean=0}:{
  x:number;y:number;scale:number;seed:number;wind:number;lean?:number;
}){
  // Layered hanging / ascending / sideward needles form rhythmic
  // brush families, not three copies of the same radial firework.
  const sprigs=[
    {dx:-18,dy:-8,tilt:-.6},
    {dx:-1,dy:-14,tilt:.03},
    {dx:16,dy:-3,tilt:.73},
  ];
  return <g data-km-pine-spray=""
    transform={"rotate("+f(wind*.85)+" "+f(x)+" "+f(y)+")"}>
    {sprigs.map((sprig,j)=>{
      const offset=(s(seed+67,j*5)-.5)*4*scale;
      const tx=x+(sprig.dx+offset)*scale;
      const ty=y+sprig.dy*scale+(s(seed,j*17)-.5)*3*scale;
      const count=17+Math.floor(10*s(seed+17,j*11+1));
      // Wen Zhengming's needle bouquets cross at different pitches rather
      // than rising as identical vertical fireworks along horizontal limbs.
      const fanTurn=lean+sprig.tilt+
        (s(seed+149,j*41+3)-.5)*.49;
      const fanSpread=.37+.24*s(seed+233,j*29+1);
      const wet:string[]=[],dry:string[]=[],middle:string[]=[];
      for(let k=0;k<count;k++){
        // Needle trajectories do not belong to a regular polar stencil.
        // Some close into overlapping dark bundles, others expose open
        // paper sectors; all still grow from the same botanical twig.
        const radial=(k-(count-1)*.5)/((count-1)*.5);
        const crowd=(s(seed+1207,j*89+k*13)-.5)*.19;
        const spread=clamp(radial+crowd-.075*radial*radial,-1.04,1.04);
        const angle=-Math.PI/2+spread*fanSpread+fanTurn;
        const len=(7.5+9*s(seed+j*73,k*17+7))*scale*
          (1-.26*Math.abs(spread))*(.86+.28*s(seed+397,j*31+k));
        const rx=tx+spread*2.1*scale;
        const ry=ty+.7*scale*s(seed+j*13,k+17);
        const ex=rx+Math.cos(angle)*len;
        const ey=ry+Math.sin(angle)*len;
        const nx=-(ey-ry)/len,ny=(ex-rx)/len;
        const width=(.27+.52*s(seed+j*31,k*19+3))*scale;
        const d="M"+f(rx)+" "+f(ry)+
          " Q"+f(rx+(ex-rx)*.32+nx*width)+" "+
          f(ry+(ey-ry)*.32+ny*width)+
          " "+f(ex)+" "+f(ey)+
          " Q"+f(rx+(ex-rx)*.29-nx*width*.4)+" "+
          f(ry+(ey-ry)*.29-ny*width*.4)+
          " "+f(rx)+" "+f(ry)+" Z";
        (k%7===0?dry:k%4===0?middle:wet).push(d);
      }
      const twig="M"+f(x)+" "+f(y)+
        " Q"+f((x+tx)*.5)+" "+f((y+ty)*.5-2*scale)+
        " "+f(tx)+" "+f(ty);
      const spreadX=(10+4*s(seed+j*13,31))*scale;
      const spreadY=(3+3*s(seed+j*17,39))*scale;
      return <g key={j} data-km-pine-needle-cluster=""
        data-km-pine-needles={count}
        data-km-pine-twig-root={f(x)+","+f(y)}
        data-km-pine-fan-turn={f(fanTurn)}>
        <path d={twig} stroke="#6a5339"
          strokeWidth={f(1.05*scale)} fill="none" strokeLinecap="round"/>
        {/* Capillary ink underwash must never replace the needles' tips. */}
        <path data-km-pine-foliage-wash=""
          d={"M"+f(tx-spreadX)+" "+f(ty+1.5*scale)+
            " Q"+f(tx)+" "+f(ty-spreadY*.7)+
            " "+f(tx+spreadX)+" "+f(ty+1.6*scale)}
          fill="none" stroke="#665840"
          strokeWidth={f(1.4*scale)}
          opacity={f(.24+.10*s(seed+j*29,47))}/>
        <path d={wet.join(" ")} fill="#332c23" opacity=".86"/>
        <path d={middle.join(" ")} fill="#675741" opacity=".78"/>
        <path d={dry.join(" ")} fill="#a18b6a" opacity=".52"/>
        {Array.from({length:3},(_,k)=>{
          const startX=tx+(k-1)*6*scale;
          const toX=startX+(s(seed+j*29,k*17+31)-.5)*7*scale;
          const upperY=ty-4*scale-(k%2)*3*scale;
          return <path key={k} data-km-pine-feather=""
            d={"M"+f(startX)+" "+f(ty+2*scale)+
              " Q"+f(startX-2*scale)+" "+f(upperY)+
              " "+f(toX)+" "+f(upperY-3*scale)}
            fill="none" stroke={k===0?"#b9a485":"#6c5942"}
            strokeWidth={f((.37+.19*k)*scale)}
            opacity={f(.25+.09*s(seed+j*37,k*9+49))}/>;
        })}
        <path data-km-pine-foliage-wash=""
          d={"M"+f(tx-spreadX*.72)+" "+f(ty+2*scale)+
            " Q"+f(tx)+" "+f(ty-spreadY*.55)+
            " "+f(tx+spreadX*.55)+" "+f(ty+1.5*scale)}
          fill="none" stroke="#7d6a50" strokeWidth={f(1.6*scale)}
          opacity=".36"/>
      </g>;
    })}
  </g>;
}
function OldPine({x,y,scale,wind,seed,detail}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
}){
  // Asymmetric branch endpoints and tip-heavy clustered needles emulate
  // old-pine brush canopies rather than regularly spaced horizontal shelves.
  // Authored branch crooks, not eight Bézier shelves. The first
  // deflection goes against (or across) the eventual tip direction.
  // Wen Zhengming paints wood that turns under load before continuing.
  const stems=[
    {y:-95, dir:-1,len:98, tipDy:39, firstDy:-22,secondDy:27},
    {y:-133,dir:1, len:132,tipDy:28, firstDy:-31,secondDy:-8},
    {y:-166,dir:1, len:92, tipDy:-44,firstDy:18, secondDy:-56},
    {y:-192,dir:-1,len:154,tipDy:-32,firstDy:-17,secondDy:-65},
    {y:-225,dir:-1,len:105,tipDy:25, firstDy:20, secondDy:-14},
    {y:-245,dir:1, len:108,tipDy:-24,firstDy:-36,secondDy:-48},
    {y:-270,dir:-1,len:80, tipDy:-37,firstDy:11, secondDy:-49},
    {y:-285,dir:1, len:63, tipDy:-20,firstDy:-36,secondDy:-4},
  ];
  // A shared trunk construction map also anchors the bark and bough roots.
  // Do not interpolate branches from unrelated arbitrary horizontal shelves.
  const trunkX=(y:number)=>{
    const t=clamp(-y/299,0,1);
    return -8+19*t+27*t*t+4*Math.sin(t*Math.PI*2);
  };
  return <g data-km-shanshui-pine="" transform={"translate("+x+" "+y+") scale("+scale+")"}>
    <path d="M-19 2 C-21 -37 7 -59 2 -94 C-14 -121 15 -144 8 -175
      C-7 -207 32 -229 23 -251 C16 -276 27 -289 38 -299
      L44 -295 C35 -264 45 -248 32 -228 C22 -202 18 -184 20 -169
      C25 -134 7 -116 15 -93 C21 -60 -5 -32 -1 4 Z"
      fill="#68513a" stroke="#3f3024" strokeWidth="2.1"/>
    <path d="M-11 -2 Q-15 -60 10 -93 Q-3 -133 17 -180
      Q35 -233 34 -271 M3 -25 Q-2 -77 12 -115 M6 -140 Q-4 -170 23 -207"
      stroke="#bd9870" strokeWidth="3.3" opacity=".55" fill="none"/>
    {Array.from({length:42},(_,i)=>{
      const cy=-6-i*6.65+(s(seed+1169,i*11)-.5)*4;
      const x0=trunkX(cy)+(s(seed+3,i*23)-.5)*10;
      const side=i%2===0?1:-1;
      const dx=side*(3+6*s(seed+11,i*9));
      const dy=7+10*s(seed+17,i*7);
      return <g key={i} data-km-pine-bark-grain={i%4}>
        <path data-km-pine-bark=""
          d={"M"+f(x0)+" "+f(cy)+
            " Q"+f(x0+dx*.62)+" "+f(cy-dy*.54)+
            " "+f(x0+dx*.35)+" "+f(cy-dy)}
          stroke={i%5===0?"#35291e":"#b49471"}
          strokeWidth={f(i%5===0?1.55:.65)}
          opacity={f(.38+.4*s(seed,i))}
          strokeLinecap="round" fill="none"/>
        {detail>.58&&i%3===1&&
          <path data-km-pine-bark-fissure=""
            d={"M"+f(x0+dx*.14)+" "+f(cy-dy*.23)+
              " q"+f(dx*.33)+" "+f(-dy*.19)+
              " "+f(dx*.21)+" "+f(-dy*.39)+
              " m"+f(-dx*.05)+" "+f(-dy*.17)+
              " l"+f(-dx*.27)+" "+f(-dy*.23)}
            stroke="#e2c6a0" strokeWidth=".55" strokeLinecap="round"
            opacity=".38" fill="none"/>}
      </g>;
    })}
    {stems.map((b,i)=>{
      const reach=b.len*b.dir;
      const root:P=[trunkX(b.y),b.y];
      const tip:P=[root[0]+reach,b.y+b.tipDy];
      const knots:readonly P[]=[
        root,
        [root[0]+reach*.255,b.y+b.firstDy],
        [root[0]+reach*.63,b.y+b.secondDy],
        tip,
      ];
      // A connected Catmull–Rom-like ink skeleton *passes through*
      // the authored crooks but rounds the wood, rather than joining
      // angled strips with sharp artificial corners.
      const handles=knots.slice(0,-1).map((p,k)=>{
        const q=knots[k+1];
        const before=knots[Math.max(0,k-1)];
        const after=knots[Math.min(3,k+2)];
        const a:P=[
          p[0]+(q[0]-before[0])*.17,
          p[1]+(q[1]-before[1])*.17,
        ];
        const b:P=[
          q[0]-(after[0]-p[0])*.17,
          q[1]-(after[1]-p[1])*.17,
        ];
        return [a,b] as const;
      });
      const boughPoint=(t:number):P=>{
        const u=clamp(t,0,1);
        const index=Math.min(2,Math.floor(u*3));
        const [a,b]=handles[index];
        return cubicPoint(knots[index],a,b,knots[index+1],
          index===2&&u===1?1:u*3-index);
      };
      const pointText=(p:P)=>f(p[0])+" "+f(p[1]);
      const spineCurve="M"+pointText(root)+
        handles.map(([a,b],k)=>" C"+pointText(a)+" "+pointText(b)+
          " "+pointText(knots[k+1])).join("");
      // Subpixel curve sampling gives one smooth, pressure-tapered
      // silhouette with local unevenness. No pointy quad joints.
      const stationCount=37;
      const upper:P[]=[],lower:P[]=[];
      for(let k=0;k<stationCount;k++){
        const u=k/(stationCount-1);
        const p=boughPoint(u);
        const before=boughPoint(Math.max(0,u-.006));
        const after=boughPoint(Math.min(1,u+.006));
        const dx=after[0]-before[0],dy=after[1]-before[1];
        const len=Math.hypot(dx,dy)||1;
        const width=(3.7*Math.pow(1-u,.68)+.14)*
          (1+.075*Math.sin(6.5*Math.PI*u+i*.7));
        const nx=-dy/len,ny=dx/len;
        upper.push([p[0]+nx*width,p[1]+ny*width]);
        lower.push([p[0]-nx*width,p[1]-ny*width]);
      }
      const bone="M"+upper.map(pointText).join(" L")+
        " L"+lower.reverse().map(pointText).join(" L")+" Z";
      const inner=spineCurve;
      const count=Math.round((3+(i%3))*detail);
      return <g key={i} data-km-pine-bough=""
        data-km-pine-bough-root={f(root[0])+","+f(root[1])}
        data-km-pine-bough-tip={f(tip[0])+","+f(tip[1])}>
        {/* A pressure-tapered, smoothly curved multi-elbow ink bone.
            Sampled contour normals avoid sharp folded wooden strips.
            All young stems, fissures
            and needles inherit this same changing centerline. */}
        <path data-km-pine-bough-shape="" d={bone}
          data-km-pine-bough-stations={stationCount}
          fill="#594733" opacity=".91" stroke="#3e3228"
          strokeWidth=".42" strokeLinejoin="round"/>
        <path data-km-pine-bough-light="" d={inner}
          stroke="#d0b18c" strokeWidth=".82" fill="none"
          strokeLinecap="round" opacity=".59"/>
        {knots.slice(1,3).map((p,k)=>
          <path key={k} data-km-pine-elbow={pointText(p)}
            d={"M"+pointText(p)+" q"+f((k===0?-1:1)*2.1)+
              " "+f((i%2===0?-1:1)*3.2)+
              " "+f((k===0?1:-1)*3.4)+" "+f((i%2===0?-1:1)*4.6)}
            stroke="#382d23" strokeWidth="1.05" opacity=".65"
            strokeLinecap="round" fill="none"/>
        )}
        {/* The exposed heartwood is alternately dark/soft and chipped:
            fractal noise is NOT a replacement for contour-following bark. */}
        {Array.from({length:Math.round(detail*9)},(_,k)=>{
          const u=.095+.83*(k+.35)/(9+.2);
          const at=boughPoint(u);
          const after=boughPoint(Math.min(u+.055,.995));
          const tangentX=after[0]-at[0],tangentY=after[1]-at[1];
          const len=Math.hypot(tangentX,tangentY)||1;
          const tx=tangentX/len,ty=tangentY/len;
          const side=(k%3===0?-1:1);
          const off=side*(.65+1.2*s(seed+1103,i*19+k));
          const x0=at[0]-ty*off,y0=at[1]+tx*off;
          const reach=3.2+7.1*s(seed+1117,i*31+k*7);
          const d="M"+f(x0)+" "+f(y0)+
            " Q"+f(x0+tx*reach*.48-ty*side*1.1)+" "+
                f(y0+ty*reach*.48+tx*side*1.1)+
            " "+f(x0+tx*reach)+" "+f(y0+ty*reach);
          return <path key={k} data-km-pine-bough-bark=""
            data-km-pine-bough-bark-root={f(at[0])+","+f(at[1])}
            d={d} fill="none" stroke={k%4===0?"#3d3026":"#ddbd96"}
            strokeWidth={f(.44+.72*s(seed+1139,i*17+k))}
            strokeLinecap="round" opacity={f(.35+.3*s(seed+1151,i*41+k))}/>;
        })}

        {/* A gnarled pine divides into independent secondary limbs whose
            roots are exact points ON the primary cubic, not random
            canopy stickers. Each fork carries its own old-wood ink bone. */}
        {Array.from({length:3},(_,k)=>{
          const u=.22+.235*k+.035*(s(seed+911,i*37+k)-.5);
          const rootFork=boughPoint(u);
          const flip=(k===1?-1:1)*(s(seed+929,i*13+k)>.55?-1:1);
          const branchLen=(27+27*s(seed+947,i*17+k))*(k===2?.8:1);
          const dx=reach>=0?branchLen*.47:-branchLen*.47;
          const q1:P=[rootFork[0]+dx*.47-flip*7,
            rootFork[1]-flip*(branchLen*.22)];
          const q2:P=[rootFork[0]+dx+flip*branchLen*.26,
            rootFork[1]-flip*branchLen*(.56+.16*s(seed+967,i*11+k))];
          const half=(2.1+.8*s(seed+981,i*23+k))*(1-.13*k);
          const inkBone="M"+f(rootFork[0])+" "+f(rootFork[1]-half)+
            " Q"+f(q1[0])+" "+f(q1[1]-half*.65)+
            " "+f(q2[0])+" "+f(q2[1])+
            " Q"+f(q1[0]+half*.6)+" "+f(q1[1]+half*.9)+
            " "+f(rootFork[0])+" "+f(rootFork[1]+half)+" Z";
          const veil="M"+f(rootFork[0]+.7)+" "+f(rootFork[1]-half*.52)+
            " Q"+f(q1[0])+" "+f(q1[1]-half*.42)+
            " "+f(q2[0])+" "+f(q2[1]);
          return <g key={k} data-km-pine-lateral=""
            data-km-pine-lateral-root={f(rootFork[0])+","+f(rootFork[1])}
            data-km-pine-lateral-parent-pt={f(rootFork[0])+","+f(rootFork[1])}
            data-km-pine-lateral-side={flip}>
            <path data-km-pine-lateral-bone="" d={inkBone}
              fill="#5b4935" opacity={f(.82-.08*k)}/>
            <path data-km-pine-lateral-lift="" d={veil}
              stroke="#e0c59f" strokeWidth={f(.48+.11*k)}
              fill="none" opacity=".5" strokeLinecap="round"/>
            <path data-km-pine-lateral-crotch=""
              d={"M"+f(rootFork[0]-3)+" "+f(rootFork[1]+1)+
                " q"+f(dx*.17)+" "+f(-flip*8)+
                " "+f(dx*.29)+" "+f(-flip*10)}
              fill="none" stroke="#392e25" strokeWidth="1.05" opacity=".64"/>
            {Array.from({length:Math.round(detail)},(_,j)=>{
              const t=.85;
              const twig=quadraticPoint(rootFork,q1,q2,t);
              return <NeedleSpray key={j}
                x={f(twig[0])} y={f(twig[1])}
                scale={f(.35+.28*s(seed+997,i*29+k*7+j))}
                lean={f(flip*.25+.23*(s(seed+1013,i*31+k*5+j)-.5))}
                wind={wind} seed={seed+1031+i*149+k*31+j*17}/>;
            })}
          </g>;
        })}
        {Array.from({length:count},(_,j)=>{
          const u=clamp(.43+.54*(j+.35)/(count+.25)+
            .1*(s(seed+307,i*53+j*13)-.5),.34,.98);
          const point=boughPoint(u);
          return <NeedleSpray key={j}
            x={f(point[0])} y={f(point[1])}
            scale={.58+(.62*s(seed,i*21+j))} wind={wind}
            lean={f((b.dir<0?-.19:.21)+.52*(s(seed+313,i*23+j*7)-.5))}
            seed={seed+i*41+j*71}/>;
        })}
      </g>;
    })}
    {detail>0&&<>
      <NeedleSpray x={39} y={-296} scale={.92} seed={seed+9} wind={wind}/>
      <NeedleSpray x={19} y={-263} scale={1.1} seed={seed+61} wind={wind}/>
    </>}
  </g>;
}
/** One calligraphic wrist pull drives both pigment boundary and dry-bristle
 * skips. The small secondary turn prevents perfectly mirrored SVG lozenges.
 * Reference: Wu Zhen, Manual of Ink Bamboo (NPM, 1350), album leaves 12/20.
 */
function bambooStrokeOffset(t:number,length:number,seed:number){
  const bow=(s(seed,17)-.5)*length*.22;
  const wrist=(s(seed,19)-.5)*length*.075;
  return bow*Math.sin(Math.PI*t)+wrist*Math.sin(2*Math.PI*t);
}
/** Pressure-loaded ink *gesture*, not a filled arrow template.
 * One-sided width, delayed brush contact and families of press/lift timing
 * separate a stalk-attached broad leaf from a quick light twig gesture.
 * Fifteen pressure knots are smoothly interpolated on both fibre edges.
 */
function bambooBrushBlade(root:P,tip:P,width:number,seed:number){
  const dx=tip[0]-root[0],dy=tip[1]-root[1];
  const length=Math.max(.01,Math.hypot(dx,dy));
  const nx=-dy/length,ny=dx/length;
  const stations=[0,.045,.09,.15,.23,.32,.42,.52,.62,.70,.78,.84,.90,.95,1] as const;
  const pressure=([
    [0,.14,.44,.82,1,.99,.91,.75,.57,.43,.31,.23,.14,.06,0],
    [0,.04,.12,.31,.59,.85,1,.95,.80,.66,.49,.35,.19,.07,0],
    [0,.19,.48,.76,.89,1,.92,.79,.69,.48,.29,.18,.09,.04,0],
  ] as const)[Math.abs(seed)%3];
  const dominant=.84+.26*s(seed,47);
  const recessive=.33+.31*s(seed,31);
  const makeSide=(side:1|-1)=>stations.map((t,k):P=>{
    // Edge grain follows brush load; none of it jumps independently in X/Y.
    const scratch=k===0||k===14?0:
      (s(seed+71,k*23+(side===1?3:17))-.5)*.085*
      Math.sin(Math.PI*t);
    const loaded=Math.max(0,pressure[k]+scratch);
    const turn=bambooStrokeOffset(t,length,seed);
    const shift=turn+side*width*loaded*(side===1?dominant:recessive);
    return [root[0]+dx*t+nx*shift,root[1]+dy*t+ny*shift];
  });
  const outline=[...makeSide(1),...makeSide(-1).slice(1,-1).reverse()];
  const path=["M"+f(root[0])+" "+f(root[1])];
  // Smooth local tangents preserve the pressured edge without angular
  // polygon vertices or uniform Bézier taper. Both ends return to the axis.
  for(let k=0;k<outline.length;k++){
    const p0=outline[(k-1+outline.length)%outline.length];
    const p1=outline[k],p2=outline[(k+1)%outline.length];
    const p3=outline[(k+2)%outline.length];
    const c1:P=[p1[0]+(p2[0]-p0[0])*.13,
      p1[1]+(p2[1]-p0[1])*.13];
    const c2:P=[p2[0]-(p3[0]-p1[0])*.13,
      p2[1]-(p3[1]-p1[1])*.13];
    path.push("C"+f(c1[0])+" "+f(c1[1])+
      " "+f(c2[0])+" "+f(c2[1])+
      " "+f(p2[0])+" "+f(p2[1]));
  }
  return path.join(" ")+" Z";
}
/** Fei-bai (flying-white): paper reserves are cut *out* of the deposited
 * ink, not bright highlight stickers painted over an opaque dark leaf.
 * Every short split travels on the exact same loaded calligraphic centerline.
 */
function bambooDryBristles(root:P,tip:P,width:number,seed:number){
  const dx=tip[0]-root[0],dy=tip[1]-root[1];
  const length=Math.max(.01,Math.hypot(dx,dy));
  const nx=-dy/length,ny=dx/length;
  const point=(t:number,offset:number):P=>{
    const belly=Math.sin(Math.PI*t);
    const shift=bambooStrokeOffset(t,length,seed)+width*offset*belly;
    return [root[0]+dx*t+nx*shift,root[1]+dy*t+ny*shift];
  };
  return Array.from({length:3},(_,i)=>{
    const start=.21+.29*s(seed+191,i*31+5);
    const finish=Math.min(.91,start+.14+.19*s(seed+193,i*17+11));
    const offset=(i-1)*.17+.08*(s(seed+197,i*23)-.5);
    const a=point(start,offset),mid=point((start+finish)*.5,
      offset+.04*(s(seed+199,i*17)-.5)),b=point(finish,offset);
    return {
      d:"M"+f(a[0])+" "+f(a[1])+" Q"+f(mid[0])+" "+f(mid[1])+
        " "+f(b[0])+" "+f(b[1]),
      width:f(.29+.28*s(seed+211,i*19)),
    };
  });
}
/** One complete terminal botanical gesture (the hero crop), not
 * seven isolated SVG arrows. The supporting thin shoot begins at the
 * painted main bough and every new leaf roots on that exact secondary
 * curve. Wu Zhen's NPM 1350 album shows compact crossings of unequal
 * dark brush marks separated by open windows of paper. Only the high-
 * load clusters earn this additional botanical mass.
 */
function BambooTerminalSpray({root,bend,tip,fan,seed,id,detail}:{
  root:P;bend:P;tip:P;fan:number;seed:number;id:string;detail:number;
}){
  const count=Math.round(clamp((detail-.55)/.45,0,1)*7);
  if(!count)return null;
  const stemRoot=quadraticPoint(root,bend,tip,.68);
  const stemBend:P=[
    stemRoot[0]+fan*(11+5*s(seed,111)),
    stemRoot[1]-(3+6*s(seed,113)),
  ];
  const stemTip:P=[
    stemRoot[0]+fan*(29+7*s(seed,117)),
    stemRoot[1]-(19+9*s(seed,119)),
  ];
  // Deliberately authored contact points and crossing directions: these
  // should remain recognizable as a real leaf group at 960x540. Small
  // deterministic seed changes alter wrist speed, not its anatomy.
  const gestures=[
    // A few long leaves fall *across* the twig, instead of seven
    // vertically upraised knives. Album 17010703 carries down-swept
    // pennants under its arching twig and only a few upright accents.
    {at:.22,angle:.32,len:44,wide:5.5},
    {at:.33,angle:.92,len:34,wide:4.3},
    {at:.46,angle:-.29,len:53,wide:6.1},
    {at:.55,angle:1.2,len:30,wide:3.9},
    {at:.68,angle:-.67,len:41,wide:4.9},
    {at:.78,angle:.52,len:39,wide:5.1},
    {at:.88,angle:-.06,len:35,wide:3.8},
  ] as const;
  return <g data-km-bamboo-hero-spray=""
    data-km-bamboo-hero-parent={f(stemRoot[0])+","+f(stemRoot[1])}
    data-km-bamboo-hero-plan={count}>
    <path data-km-bamboo-hero-twig="" fill="none"
      stroke="#4e493b" strokeWidth="1.25" strokeLinecap="round"
      opacity=".88"
      d={"M"+f(stemRoot[0])+" "+f(stemRoot[1])+
        " Q"+f(stemBend[0])+" "+f(stemBend[1])+
        " "+f(stemTip[0])+" "+f(stemTip[1])}/>
    {gestures.slice(0,count).map((gesture,k)=>{
      const t=clamp(gesture.at+
        (s(seed+139,k*13)-.5)*.064,.12,.95);
      const base=quadraticPoint(stemRoot,stemBend,stemTip,t);
      const tangent:P=[
        2*(1-t)*(stemBend[0]-stemRoot[0])+
          2*t*(stemTip[0]-stemBend[0]),
        2*(1-t)*(stemBend[1]-stemRoot[1])+
          2*t*(stemTip[1]-stemBend[1]),
      ];
      const angle=Math.atan2(tangent[1],tangent[0])+
        gesture.angle*fan+(s(seed+151,k*17)-.5)*.19;
      const length=gesture.len*(.91+.19*s(seed+163,k*7));
      const width=gesture.wide*(.87+.25*s(seed+167,k*29));
      const end:P=[base[0]+Math.cos(angle)*length,
        base[1]+Math.sin(angle)*length];
      const strokeSeed=seed+211+k*79;
      const blade=bambooBrushBlade(base,end,width,strokeSeed);
      const fibres=detail>.85
        ?bambooDryBristles(base,end,width,strokeSeed).slice(0,2):[];
      const leafId=id+"-hero-"+k;
      const gradientId=leafId+"-gradient",maskId=leafId+"-reserve";
      const m=width*4+3,px=Math.min(base[0],end[0])-m,
        py=Math.min(base[1],end[1])-m,
        pw=Math.abs(end[0]-base[0])+m*2,
        ph=Math.abs(end[1]-base[1])+m*2;
      const light=k===1||k===3||k===6;
      return <g key={k}>
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
            x1={f(base[0])} y1={f(base[1])}
            x2={f(end[0])} y2={f(end[1])}>
            <stop offset="0" stopColor={light?"#4e4a3d":"#222923"}/>
            <stop offset=".27" stopColor={light?"#655b49":"#21271f"}/>
            <stop offset=".64" stopColor={light?"#83735c":"#36382f"}/>
            <stop offset="1" stopColor={light?"#a69779":"#635c4b"}/>
          </linearGradient>
          {fibres.length>0&&<mask data-km-bamboo-hero-mask=""
            id={maskId} maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x={f(px)} y={f(py)} width={f(pw)} height={f(ph)}
            style={{maskType:"luminance"}}>
            <path d={blade} fill="#fff"/>
            {fibres.map((bristle,b)=><path key={b}
              data-km-bamboo-hero-bristle=""
              d={bristle.d} stroke="#000"
              strokeWidth={bristle.width} strokeLinecap="round"
              fill="none"/>)}
          </mask>}
        </defs>
        <path data-km-bamboo-hero-leaf="" d={blade}
          data-km-bamboo-hero-root={f(base[0])+","+f(base[1])}
          data-km-bamboo-hero-heading={f(angle)}
          data-km-bamboo-hero-station={f(t)}
          fill={"url(#"+gradientId+")"}
          mask={fibres.length>0?"url(#"+maskId+")":undefined}
          opacity={light?".82":".97"}/>
      </g>;
    })}
  </g>;
}
/** Bamboo is a calligraphic plant, not uniform fence-post lines. The
 * centerline of each tapered culm also supplies the positions of its branch
 * nodes; each broad leaf begins on its own painted branching centerline.
 */
function Bamboo({x,y,scale,wind,seed,detail,ink,materialId}:{
  x:number;y:number;scale:number;wind:number;seed:number;detail:number;
  ink:number;materialId:string;
}){
  const id="kmbamboo"+useId().replace(/[^a-z0-9_-]/gi,"");
  // Gongbi bamboo paintings place branches at visible culm joints. Sharing
  // node samples between collars and twigs prevents floating leaf clusters.
  return <g data-km-shanshui-bamboo=""
    data-km-bamboo-ink-load={f(ink)}
    filter={"url(#"+materialId+")"}
    opacity={f(.48+.52*ink)}
    transform={"translate("+x+" "+y+") scale("+scale+")"}>
    {[-32,0,25].map((x0,i)=>{
      // Nonparallel bamboo columns: one strong black stalk and two quieter
      // ink companions receding on either side, after Zheng Xie's groves.
      const h=[317,391,356][i],tipX=[-84,-7,64][i];
      const from:P=[x0,0],tip:P=[tipX,-h];
      const control:P=[x0+(tipX-x0)*.19,-h*.52];
      const half=[3.25,4.15,2.9][i];
      const culm="M"+f(x0-half)+" 1 Q"+f(control[0]-half)+" "+
        f(control[1])+" "+f(tipX)+" "+f(-h)+
        " Q"+f(control[0]+half)+" "+f(control[1])+
        " "+f(x0+half)+" 1 Z";
      // Each collar belongs to the same curved culm, but natural internodes
      // are not seven identical evenly-spaced ruler marks.
      const nodes=Array.from({length:7},(_,j)=>
        quadraticPoint(from,control,tip,clamp((j+1)/8+
          (s(seed+193,i*43+j*17)-.5)*.026,.05,.96)));
      return <g key={i} data-km-shanshui-bamboo-stem={i}>
        <path d={culm} fill={["#917b64","#5c4839","#a38b6c"][i]}
          stroke={i===1?"#3e332a":"#65513f"}
          strokeWidth={i===1?.82:.63} opacity={i===1?.96:.83}/>
        <path d={"M"+f(x0-.75)+" 0 Q"+f(control[0]-.75)+" "+
          f(control[1])+" "+f(tipX-.6)+" "+f(-h+12)}
          stroke="#dfc29b" strokeWidth={i===1?.9:.67}
          fill="none" opacity={i===1?.45:.29}/>
        {nodes.map(([cx,cy],j)=>{
          // Sparse, asymmetric calligraphic fans, not alternating rulers.
          const fan=s(seed+211,i*37+j*5)>.47?1:-1;
          const reach=(28+45*s(seed+239,i*17+j*13))*fan;
          const lift=14+25*s(seed+101,i*9+j);
          const base:P=[cx,cy];
          const turn:P=[cx+reach*(.29+.08*s(seed+231,i*23+j)),
            cy-lift*.56];
          const end:P=[cx+reach,cy-lift];
          const branchControl:P=[turn[0]-fan*.8,turn[1]-.9];
          const branch="M"+f(cx-.95)+" "+f(cy+.4)+
            " Q"+f(branchControl[0])+" "+f(branchControl[1])+
            " "+f(end[0])+" "+f(end[1])+
            " Q"+f(turn[0]+fan*.55)+" "+f(turn[1]+.85)+
            " "+f(cx+1.05)+" "+f(cy+1.35)+" Z";
          // Zheng Xie's bamboo distinguishes the principal branch from
          // little lateral shoots. Both child shoots start on the exact
          // painted parent curve; their leaves must use those curves too.
          const spurs=([.59,.78] as const).map((at,k)=>{
            const root=quadraticPoint(base,branchControl,end,at);
            const side=fan*(k===0?-1:1);
            const reach=9+12*s(seed+1021,i*53+j*19+k*7);
            const tip:P=[root[0]+side*reach,
              root[1]-(9+13*s(seed+1051,i*71+j*13+k*11))];
            const bend:P=[root[0]+side*reach*.37,
              root[1]-(7+5*s(seed+1061,i*19+j*37+k*3))];
            return {root,bend,tip};
          });
          // Wu Zhen's bamboo has unequal masses and long silent internodes.
          // Author a rhythmic motif rather than cloning five stars at every
          // one of 21 nodes. The same composition scales deterministically
          // with the public detail control.
          const clusterBudget=[
            [0,3,8,1,10,2,10],
            [10,0,3,10,1,8,2],
            [2,10,1,8,0,10,3],
          ][i][j];
          const visibleLeaves=Math.round(detail*clusterBudget);
          const visibleSpurs=visibleLeaves>4?2:visibleLeaves>1?1:0;
          return <g key={j} data-km-bamboo-branch-root={f(cx)+","+f(cy)}
            data-km-bamboo-cluster-budget={clusterBudget}
            transform={"rotate("+f(wind*.6)+" "+f(cx)+" "+f(cy)+")"}>
            {visibleLeaves>0&&<path data-km-bamboo-pressure-twig="" d={branch}
              fill="#685541" opacity=".87"/>}
            {spurs.slice(0,visibleSpurs).map((spur,k)=>{
              const root=spur.root,bend=spur.bend,tip=spur.tip;
              const side=k===0?-fan:fan;
              const d="M"+f(root[0]-side*.47)+" "+f(root[1]+.35)+
                " Q"+f(bend[0]-side*.31)+" "+f(bend[1]+.35)+
                " "+f(tip[0])+" "+f(tip[1])+
                " Q"+f(bend[0]+side*.37)+" "+f(bend[1]-.35)+
                " "+f(root[0]+side*.47)+" "+f(root[1]-.35)+" Z";
              return <path key={k} data-km-bamboo-secondary-shoot=""
                data-km-bamboo-secondary-root={f(root[0])+","+f(root[1])}
                d={d} fill={k===0?"#62513e":"#514438"}
                opacity={k===0?.78:.65}/>;
            })}
            {clusterBudget>=8&&detail>.55&&
              <BambooTerminalSpray root={base} bend={branchControl}
                tip={end} fan={fan} detail={detail}
                seed={seed+i*659+j*131}
                id={id+"-"+i+"-"+j}/>}
            {Array.from({length:visibleLeaves},(_,k)=>{
              const motif=k%5,layer=Math.floor(k/5);
              const spurIndex=motif===1?0:motif===4?1:-1;
              const origin=spurIndex<0
                ?{root:base,bend:branchControl,tip:end}
                :spurs[spurIndex];
              // Wu Zhen's bamboo resolves into terminal brush groups:
              // most leaves emerge from the outer branch section, not
              // evenly-spaced hooks along the entire bare bough.
              // Group three main strokes around the same terminal twig,
              // while both attached lateral spurs retain their own growth
              // direction. A wide stagger previously made each blade read
              // as an isolated spear instead of a single botanical spray.
              const along=spurIndex<0?[.75,0,.82,.89,0][motif]
                :motif===1?.72:.82;
              const t=clamp(along-layer*.075+
                (s(seed+71,i*43+j*11+k)-.5)*.06,.12,.96);
              const [bx,by]=quadraticPoint(origin.root,origin.bend,
                origin.tip,t);
              // Leaf direction is tied to the actual branch tangent.
              // Independent screen-space arrows caused comb-like foliage.
              const tangent:P=[
                2*(1-t)*(origin.bend[0]-origin.root[0])+
                  2*t*(origin.tip[0]-origin.bend[0]),
                2*(1-t)*(origin.bend[1]-origin.root[1])+
                  2*t*(origin.tip[1]-origin.bend[1]),
              ];
              const branchAngle=Math.atan2(tangent[1],tangent[0]);
              // Wu Zhen's loaded leaves overlap at their bases. The five
              // gesture families are an *alternating* fan (long/short,
              // open/closed), rather than five equally sized rays.
              const fanAngles=[-.69,-.95,.36,.83,-.43];
              const direction=branchAngle+fanAngles[motif]*(fan>0?1:-1)+
                (layer===0?0:-.095*fan)+
                // Individual brush wrists diverge slightly within one
                // common twig fan, avoiding identical ray headings.
                (s(seed+1081,i*29+j*17+k)-.5)*.64;
              const familyLength=[1.12,.81,1.06,.7,.79][motif];
              const len=(24+17*s(seed,i*50+j*9+k))*familyLength*
                (layer===1?.84:1);
              const leafTipX=bx+Math.cos(direction)*len;
              const leafTipY=by+Math.sin(direction)*len;
              const wide=(2.15+4.4*s(seed+11,k+i*13+j))*
                (motif===0?1.12:motif===3?.83:1);
              // Orient the brush belly to the blade tangent, not paper Y.
              // Secondary tip releases grow from the same parent wood,
              // but their size and pitch vary rather than forming mirror pairs.
              const blade=bambooBrushBlade([bx,by],[leafTipX,leafTipY],
                wide,seed+i*1009+j*41+k*17);
              // Leaf cluster resolves at a common live twig tip,
              // not at arbitrary positions distributed across empty space.
              const echo=detail>.62&&motif%2===0;
              const echoT=clamp(t+
                (s(seed+1321,i*59+j*11+k)-.5)*.078,.12,.96);
              const echoRoot=quadraticPoint(origin.root,origin.bend,
                origin.tip,echoT);
              const echoLen=len*(.59+.2*s(seed+1351,i*71+j*17+k));
              const echoAngle=direction+
                (motif===0?.33:motif===2?-.31:.25)*fan+
                (s(seed+1397,i*13+j*29+k)-.5)*.19;
              const echoTip:P=[echoRoot[0]+Math.cos(echoAngle)*echoLen,
                echoRoot[1]+Math.sin(echoAngle)*echoLen];
              const satellite=bambooBrushBlade(echoRoot,echoTip,
                wide*(.59+.19*s(seed+1381,i*17+j*11+k)),
                seed+1409+i*31+j*23+k*37);
              const bristles=detail>.6?bambooDryBristles(
                [bx,by],[leafTipX,leafTipY],wide,
                seed+i*1009+j*41+k*17):[];
              const echoBristles=echo&&detail>.85?bambooDryBristles(
                echoRoot,echoTip,wide*.65,
                seed+1409+i*31+j*23+k*37):[];
              const dilute=k%5===0||j%5===0;
              const leafId=id+"-"+i+"-"+j+"-"+k;
              const reserve=leafId+"-reserve",pigment=leafId+"-ink";
              const echoReserve=leafId+"-echo-reserve";
              const echoPigment=leafId+"-echo-ink";
              const margin=wide*3.3+2;
              const bx0=Math.min(bx,leafTipX)-margin,
                by0=Math.min(by,leafTipY)-margin;
              const bw=Math.abs(leafTipX-bx)+margin*2,
                bh=Math.abs(leafTipY-by)+margin*2;
              const ex0=Math.min(echoRoot[0],echoTip[0])-margin,
                ey0=Math.min(echoRoot[1],echoTip[1])-margin;
              const ew=Math.abs(echoTip[0]-echoRoot[0])+margin*2,
                eh=Math.abs(echoTip[1]-echoRoot[1])+margin*2;
              return <g key={k}>
                <defs>
                  <linearGradient id={pigment} gradientUnits="userSpaceOnUse"
                    x1={f(bx)} y1={f(by)} x2={f(leafTipX)} y2={f(leafTipY)}>
                    <stop offset="0" stopColor={dilute?"#655c4e":"#272a23"}/>
                    <stop offset=".19" stopColor={dilute?"#736857":"#20251f"}/>
                    <stop offset=".54" stopColor={dilute?"#907b66":"#2c3028"}/>
                    <stop offset=".83" stopColor={dilute?"#a59075":"#515043"}/>
                    <stop offset="1" stopColor={dilute?"#baa78d":"#706a58"}/>
                  </linearGradient>
                  {bristles.length>0&&<mask id={reserve}
                    maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
                    x={f(bx0)} y={f(by0)} width={f(bw)} height={f(bh)}
                    style={{maskType:"luminance"}}>
                    <path d={blade} fill="#fff"/>
                    {bristles.map((bristle,b)=><path key={b}
                      data-km-bamboo-internal-bristle="" d={bristle.d}
                      stroke="#000" strokeWidth={bristle.width}
                      strokeLinecap="round" fill="none"/>)}
                  </mask>}
                  {echo&&<linearGradient id={echoPigment}
                    gradientUnits="userSpaceOnUse" x1={f(echoRoot[0])}
                    y1={f(echoRoot[1])} x2={f(echoTip[0])}
                    y2={f(echoTip[1])}>
                    <stop offset="0" stopColor="#544a3b"/>
                    <stop offset=".46" stopColor="#84725d"/>
                    <stop offset="1" stopColor="#aa9174"/>
                  </linearGradient>}
                  {echoBristles.length>0&&<mask id={echoReserve}
                    maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
                    x={f(ex0)} y={f(ey0)} width={f(ew)} height={f(eh)}
                    style={{maskType:"luminance"}}>
                    <path d={satellite} fill="#fff"/>
                    {echoBristles.map((bristle,b)=><path key={b}
                      data-km-bamboo-satellite-bristle="" d={bristle.d}
                      stroke="#000" strokeWidth={bristle.width}
                      strokeLinecap="round" fill="none"/>)}
                  </mask>}
                </defs>
                <path data-km-shanshui-bamboo-leaf="" d={blade}
                  data-km-bamboo-leaf-root={f(bx)+","+f(by)}
                  data-km-bamboo-leaf-parent={spurIndex<0?"main":"spur-"+spurIndex}
                  data-km-bamboo-leaf-heading={f(direction)}
                  data-km-bamboo-leaf-station={f(t)}
                  data-km-bamboo-leaf-cluster={i+"-"+j}
                  fill={"url(#"+pigment+")"}
                  mask={bristles.length>0?"url(#"+reserve+")":undefined}
                  opacity={f((dilute?.76:.88)+
                    .1*s(seed,k+i*31+j*7))}/>
                {echo&&<path data-km-bamboo-satellite-leaf=""
                  data-km-bamboo-satellite-root={f(echoRoot[0])+","+f(echoRoot[1])}
                  d={satellite} data-km-bamboo-satellite-heading={f(echoAngle)}
                  data-km-bamboo-satellite-station={f(echoT)}
                  data-km-bamboo-satellite-cluster={i+"-"+j}
                  fill={"url(#"+echoPigment+")"}
                  mask={echoBristles.length>0?"url(#"+echoReserve+")":undefined}
                  opacity={f(.67+.15*s(seed+1459,i*13+j*7+k))}/>}
                {detail>.77&&(motif===1||motif===3)&&
                  <path data-km-bamboo-dry-lift=""
                    d={"M"+f(bx+(leafTipX-bx)*.2)+" "+
                      f(by+(leafTipY-by)*.2)+
                      " Q"+f(bx+(leafTipX-bx)*.42)+" "+
                      f(by+(leafTipY-by)*.45)+
                      " "+f(bx+(leafTipX-bx)*.68)+" "+
                      f(by+(leafTipY-by)*.69)}
                    stroke="#d6c09b" strokeWidth=".36" opacity=".42"
                    fill="none" strokeLinecap="round"/>}
              </g>;
            })}
          </g>;
        })}
        {/* The collar and all branch roots share exact sampled joint centres. */}
        {nodes.map(([nx,ny],j)=>{
          const t=clamp((j+1)/8+
            (s(seed+193,i*43+j*17)-.5)*.026,.05,.96);
          const dx=2*(1-t)*(control[0]-from[0])+
            2*t*(tip[0]-control[0]);
          const dy=2*(1-t)*(control[1]-from[1])+
            2*t*(tip[1]-control[1]);
          const length=Math.max(1,Math.hypot(dx,dy));
          const normal:P=[-dy/length,dx/length];
          const radius=half*(1-t*.43);
          return <path key={j} data-km-bamboo-node={f(nx)+","+f(ny)}
            d={"M"+f(nx-normal[0]*radius)+" "+
              f(ny-normal[1]*radius)+
              " Q"+f(nx)+" "+f(ny-1.2)+
              " "+f(nx+normal[0]*radius)+" "+
              f(ny+normal[1]*radius)}
            stroke={j%3===0?"#3b3026":"#514132"}
            strokeWidth={f(.94+.4*s(seed+1209,i*31+j))}
            opacity={f(.59+.28*s(seed+1229,i*17+j))}
            fill="none" strokeLinecap="round"/>;
        })}
      </g>;
    })}
  </g>;
}
function Pavilion({x,y,scale=1}:{x:number;y:number;scale?:number}){
  return <g data-km-shanshui-pavilion="" transform={"translate("+x+" "+y+") scale("+scale+")"}
    stroke="#715840" strokeLinecap="round" strokeLinejoin="round">
    <path d="M-46 -35 Q-29 -42 -20 -54 Q0 -51 0 -68 Q0 -52 21 -54 Q31 -41 48 -35
      Q30 -31 20 -38 L-21 -38 Q-30 -30 -46 -35 Z"
      fill="#ac9475" fillOpacity=".36" strokeWidth="2.1"/>
    <path d="M-53 -36 Q-31 -28 -20 -43 L22 -43 Q34 -29 54 -36
      M-13 -54 Q0 -59 13 -54 M0 -69 L0 -74"
      fill="none" strokeWidth="1.9"/>
    <path d="M-38 -29 L-38 -1 M-21 -37 L-21 -1 M0 -39 L0 -1
      M20 -38 L20 -1 M39 -29 L39 -1 M-44 -1 L45 -1"
      fill="none" stroke="#81674e" strokeWidth="2.7"/>
    <path d="M-39 -5 L40 -5 M-20 -25 L20 -25"
      fill="none" strokeWidth="1.2"/>
    <path d="M-47 -3 Q-2 4 49 -3 L55 3 Q0 13 -54 3 Z"
      fill="#9c8060" fillOpacity=".43" strokeWidth="1.3"/>
  </g>;
}
function StoneBridge(){
  return <g data-km-shanshui-bridge="" stroke="#816a50" strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M508 368 Q582 314 683 367 L683 377 Q594 335 512 377 Z"
      fill="#b9a17f" fillOpacity=".7" strokeWidth="1.35"/>
    <path d="M522 374 Q594 330 670 374 M532 379 Q596 348 659 379"
      stroke="#dfc7a5" strokeWidth="2.8" fill="none"/>
    <path d="M514 358 Q585 310 678 359 M514 366 Q587 319 678 366"
      strokeWidth="1.15" fill="none"/>
    {Array.from({length:11},(_,i)=>{
      const t=i/10,x=514+164*t, y=358-43*Math.sin(t*Math.PI);
      return <g key={i}>
        <path d={"M"+f(x)+" "+f(y)+" l0 -12"} strokeWidth="1.7"/>
        <path d={"M"+f(x-3)+" "+f(y-13)+" l6 0"} strokeWidth="1.5"/>
        {i<10&&<path d={"M"+f(x)+" "+f(y-9)+" L"+
          f(x+16.4)+" "+f(358-43*Math.sin((t+.1)*Math.PI)-9)}
          strokeWidth=".8"/>}
      </g>;
    })}
  </g>;
}
/** Ink-reserve waterfall against actual painted cliff banks.
 * The river is readable from negative space and interrupted dark edges,
 * not two unmoored opaque white tubes. The cascade keeps its root and pool
 * still, with only surface flicks varying by absolute film time.
 * Study: Ma Yuan's Scholar Viewing a Waterfall (Met 1973.120.9). */
function InkWaterfall({phase,detail}:{phase:number;detail:number}){
  const flick=f(.56*Math.sin(phase*1.3));
  return <g data-km-shanshui-waterfall="">
    {/* The cliff lip and two shadowed banks give the cascade an origin,
        rock contact, volume and an intelligible receiving pool. */}
    <path data-km-waterfall-bank="left"
      d="M349 308 Q357 303 363 314 Q357 335 354 356
        Q346 390 337 412 Q333 424 329 442
        L322 446 Q323 420 333 394 Q341 372 343 351
        Q342 325 349 308 Z"
      fill="#816e54" opacity=".34" stroke="#594b3c" strokeWidth="1.1"/>
    <path data-km-waterfall-bank="right"
      d="M377 311 Q387 315 389 329 Q393 350 378 383
        Q365 410 356 436 L351 446 Q357 405 367 377
        Q380 346 372 320 Z"
      fill="#62513e" opacity=".3" stroke="#5a4636" strokeWidth=".9"/>
    <path data-km-waterfall-shelf=""
      d="M345 310 Q356 303 363 306 Q369 308 376 308
        Q385 310 392 319 M347 319 Q356 316 359 318
        M378 322 Q382 329 381 339"
      fill="none" stroke="#65523e" strokeWidth="1.1"
      strokeLinecap="round" opacity=".62"/>
    {/* An uneven paper-reserve water body leaves the warm wash legible;
        narrow ink contours reveal speed without drawing white tubes. */}
    <path data-km-waterfall-reserve=""
      d="M361 314 C364 335 358 356 352 381
        C342 410 338 430 336 442
        Q344 440 349 441
        C352 419 361 398 367 377
        C376 350 381 331 376 317
        Q373 311 368 316 Q364 311 361 314 Z"
      fill="#f8eedc" fillOpacity=".82"/>
    <path data-km-waterfall-ribbon=""
      d="M364 321 Q369 339 362 361 T353 399
        Q346 416 343 432"
      fill="none" stroke="#b6a087" strokeWidth=".8"
      strokeLinecap="round" opacity=".7"/>
    <path data-km-waterfall-ribbon=""
      d="M376 326 Q377 347 370 364
        M367 376 Q361 399 354 414"
      fill="none" stroke="#8e755a" strokeWidth=".92"
      strokeLinecap="round" opacity=".55"/>
    <path data-km-waterfall-ribbon=""
      d="M357 341 Q356 366 348 384
        M349 395 Q343 414 339 425"
      fill="none" stroke="#ddd0b9" strokeWidth="1.45"
      strokeLinecap="round" opacity=".85"/>
    <path data-km-waterfall-pool=""
      d="M320 443 Q333 439 344 443 Q355 446 365 443
        M323 449 Q338 446 351 448 Q366 452 378 448
        M336 455 Q353 453 371 455"
      fill="none" stroke="#806b53" strokeWidth=".8"
      strokeLinecap="round" opacity=".57"/>
    {detail>.32&&Array.from({length:Math.round(detail*9)},(_,i)=>{
      const x=329+i*4.4;
      const y=438+1.8*Math.sin(i*1.7)+flick*(.38+i%2*.3);
      const dx=2.2+(i%3)*1.7;
      return <path key={i} data-km-waterfall-impact=""
        d={"M"+f(x)+" "+f(y)+
          " q"+f(-dx*.5)+" -"+f(3.2+i%4*1.7)+
          " "+f(-dx)+" "+f(-2.5-i%3)+
          " M"+f(x)+" "+f(y)+
          " q"+f(dx*.5)+" -"+f(2+i%4)+" "+f(dx)+" -1.5"}
        fill="none" stroke={i%3===0?"#75624e":"#b5a48c"}
        strokeWidth={f(.42+.12*(i%3))} opacity=".5"
        strokeLinecap="round"/>;
    })}
  </g>;
}
function Water({phase,detail,seed}:{phase:number;detail:number;seed:number}){
  return <g data-km-shanshui-water="">
    <path d="M-40 370 Q151 369 286 376 Q438 371 537 380 Q780 362 1010 378
      L1010 560 L-40 560 Z" fill="#efe2cb" opacity=".73"/>
    <path d="M-20 375 Q135 373 295 382 Q443 379 535 383 Q750 377 980 382"
      stroke="#967a5a" strokeWidth="1.1" opacity=".43" fill="none"/>
    {Array.from({length:Math.round(112*detail)},(_,i)=>{
      const x=20+926*s(seed,i*11+14);
      const y=381+158*s(seed,i*7+63);
      const width=5+32*s(seed,i*13+21);
      const jitter=.7*Math.sin(phase+i*.51),shade=.14+.36*s(seed,i*5+13);
      return <path key={i} d={"M"+f(x)+" "+f(y+jitter)+" q"+
        f(width*.48)+" "+f(1.8*s(seed,i*9))+" "+f(width)+" "+
        f(.25*Math.sin(i*.5))}
        fill="none" stroke={i%6===0?"#604b36":"#a68b68"}
        strokeWidth={i%6===0?.95:.57} opacity={shade}/>;
    })}
  </g>;
}
function RockyPath({seed,detail,scene,washId}:{seed:number;detail:number;scene:ShanshuiScene;washId:string}){
  const river=scene==="river-scholar";
  const hermit=scene==="misty-hermit";
  const path=river
    ?"M-55 570 L-55 442 Q50 418 117 425 Q205 448 282 428 Q335 411 398 424 Q497 448 536 500 L650 560 Z"
    :hermit
      ?"M-55 570 L-40 500 Q84 436 214 438 Q320 428 422 416 Q522 407 615 424 L800 570 Z"
      :"M-50 566 Q102 530 220 498 Q327 467 423 430 Q488 403 560 409 L626 443 Q520 458 449 488 Q312 510 245 555 Z";
  return <g data-km-shanshui-ground="">
    <path d={path} fill="#d8bea0" fillOpacity=".61" stroke="#9d8160" strokeOpacity=".45"
      strokeWidth="2"/>
    <path d={path} fill={"url(#"+washId+")"} opacity=".34"/>
    {Array.from({length:Math.round(52*detail)},(_,i)=>{
      const x=20+780*s(seed,i*11+400),y=river?428+105*s(seed,i*7+402):
        hermit?426+100*s(seed,i*7+402):438+112*s(seed,i*7+402);
      const w=7+28*s(seed,i*9+409),h=2+5*s(seed,i*5+408);
      return <path key={i}
        d={"M"+f(x-w/2)+" "+f(y)+" q"+f(w*.53)+" "+
          f(-h)+" "+f(w)+" "+f(.8)+" l"+f(-w*.17)+" "+f(h*.6)}
        stroke="#917355" strokeWidth={i%6===0?1.5:.75}
        fill="none" opacity={.15+.4*s(seed,i*5+18)}/>;
    })}
  </g>;
}
function Rock({x,y,w,h,seed,detail}:{
  x:number;y:number;w:number;h:number;seed:number;detail:number;
}){
  const rock="M"+f(x-w*.52)+" "+f(y)+" L"+f(x-w*.34)+" "+f(y-h*.47)+
    " Q"+f(x-w*.22)+" "+f(y-h*.98)+" "+f(x)+" "+f(y-h*.85)+
    " L"+f(x+w*.17)+" "+f(y-h*.97)+" L"+f(x+w*.40)+" "+
    f(y-h*.5)+" L"+f(x+w*.55)+" "+f(y)+" Z";
  return <g data-km-shanshui-rock="">
    <path d={rock} fill="#b8a083" opacity=".56" stroke="#5d4937" strokeWidth="2"/>
    <path d={"M"+f(x-w*.31)+" "+f(y-h*.39)+" Q"+f(x-w*.2)+
      " "+f(y-h*.8)+" "+f(x)+" "+f(y-h*.83)+
      " Q"+f(x-w*.12)+" "+f(y-h*.49)+" "+f(x+w*.1)+" "+f(y-h*.08)}
      fill="none" stroke="#665240" strokeWidth="3.4" opacity=".48"/>
    <path d={"M"+f(x+w*.12)+" "+f(y-h*.87)+" Q"+
      f(x+w*.31)+" "+f(y-h*.47)+" "+f(x+w*.41)+" "+f(y)}
      fill="none" stroke="#ddc29f" strokeWidth={w*.11} opacity=".35"/>
    {Array.from({length:Math.round(14*detail)},(_,i)=>{
      const xx=x-w*.32+s(seed,i*5+19)*w*.68;
      const yy=y-h*.7+s(seed,i*3+7)*h*.6;
      return <path key={i} d={"M"+f(xx)+" "+f(yy)+" l"+
        f((s(seed,i+67)-.5)*12)+" "+f(7+s(seed,i+37)*14)}
        fill="none" stroke={INK} strokeWidth={.55+1.3*s(seed,i*6)}
        opacity={.12+.38*s(seed,i*13)}/>;
    })}
    {Array.from({length:Math.round(19*detail)},(_,i)=>{
      const xx=x+w*(s(seed,i*3+97)-.5)*.96,yy=y-h*s(seed,i*7+47)*.15;
      return <ellipse key={i} cx={f(xx)} cy={f(yy)} rx={.8+s(seed,i)*2}
        ry={.6+s(seed,i+10)*1.3} fill={i%4===0?INK:STONE}
        opacity={.3+s(seed,i*7)*.35}/>;
    })}
  </g>;
}
function Grass({x,y,seed,scale=1}:{x:number;y:number;seed:number;scale?:number}){
  return <g transform={"translate("+x+" "+y+") scale("+scale+")"} stroke="#6c573f"
    fill="none" strokeLinecap="round">
    {Array.from({length:11},(_,i)=>{
      const a=(i-5)*.35,reach=15+26*s(seed,i*13+5);
      return <path key={i} d={"M0 0 Q"+f(Math.sin(a)*reach*.5)+" "+
        f(-reach*.78)+" "+f(Math.sin(a)*reach)+" "+f(-reach)}
        strokeWidth={.64+s(seed,i*5)*.6} opacity={.37+.38*s(seed,i*21)}/>;
    })}
  </g>;
}
function Foreground({scene,seed,detail,wind,ink,materialId}:{scene:ShanshuiScene;seed:number;detail:number;wind:number;ink:number;materialId:string}){
  if(scene==="river-scholar")return <g data-km-shanshui-foreground="">
    <Rock x={15} y={540} w={175} h={98} seed={seed+91} detail={detail}/>
    <Rock x={899} y={544} w={151} h={83} seed={seed+47} detail={detail}/>
    <Grass x={360} y={521} seed={seed} scale={1.1}/>
    <Grass x={746} y={510} seed={seed+3}/>
    <Bamboo x={925} y={510} scale={.55} seed={seed+79} detail={detail} wind={wind} ink={ink} materialId={materialId}/>
  </g>;
  if(scene==="misty-hermit")return <g data-km-shanshui-foreground="">
    <Rock x={23} y={557} w={171} h={96} seed={seed} detail={detail}/>
    <Rock x={873} y={548} w={184} h={83} seed={seed+8} detail={detail}/>
    <OldPine x={74} y={522} scale={1.28} seed={seed+47} detail={detail} wind={wind}/>
    <Bamboo x={908} y={538} scale={1.07} seed={seed+55} detail={detail} wind={wind} ink={ink} materialId={materialId}/>
    <Grass x={344} y={510} seed={seed} scale={.8}/>
  </g>;
  return <g data-km-shanshui-foreground="">
    <Rock x={76} y={568} w={218} h={168} seed={seed+7} detail={detail}/>
    <Rock x={885} y={567} w={205} h={162} seed={seed+13} detail={detail}/>
    <OldPine x={65} y={540} scale={1.43} seed={seed+9} detail={detail} wind={wind}/>
    <Bamboo x={914} y={535} scale={.9} seed={seed+10} detail={detail} wind={wind} ink={ink} materialId={materialId}/>
    <Grass x={366} y={522} seed={seed+10}/>
    <Grass x={758} y={499} seed={seed+35} scale={1.17}/>
  </g>;
}
export interface InkShanshuiStageProps {
  frame:number;
  controls?:ShanshuiControls;
  reducedMotion?:boolean;
  /** Native CharacterPresenter acting layer, between landscape and foreground. */
  children?:ReactNode;
}
export function InkShanshuiStage({frame,controls={
  scene:"mountain-trail",seed:71,detail:.9,mist:.67,wind:.32,ink:.73,
},reducedMotion=false,children}:InkShanshuiStageProps){
  assertShanshuiControls(controls);
  const at=shanshuiAt(controls,frame,reducedMotion);
  const rawId=useId().replace(/[^a-z0-9_-]/gi,"");
  const ids=useMemo(()=>({
    far:"kmshan"+rawId+"far",mid:"kmshan"+rawId+"mid",
    near:"kmshan"+rawId+"near",grain:"kmshan"+rawId+"grain",
    paper:"kmshan"+rawId+"paper",mist:"kmshan"+rawId+"mist",
    path:"kmshan"+rawId+"path",brush:"kmshan"+rawId+"brush",
  }),[rawId]);
  const river=controls.scene==="river-scholar";
  const seed=controls.seed;
  // Center-anchored slow camera push; leaf motion, scholar walking and water
  // remain stage-space deterministic rather than incremented per RAF tick.
  const zoom=at.cameraZoom;
  const transform="translate("+f(480*(1-zoom)+at.cameraX)+" "+
    f(270*(1-zoom)+at.cameraY)+") scale("+f(zoom)+")";
  // A static, reduced-motion frame shows the completed wash, not its reveal.
  const washOpacity=clamp((at.frame+13)/63,0,1);
  return <div role="group" aria-label={"Animated Chinese ink landscape: "+controls.scene}
    data-km-shanshui-scene={controls.scene}
    data-km-shanshui-frame={frame}
    style={{position:"relative",width:W,height:H,overflow:"hidden",
      background:PAPER,isolation:"isolate"}}>
    <svg width={W} height={H} viewBox="0 0 960 540"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{position:"absolute",inset:0,width:W,height:H,display:"block"}}>
      <defs>
        <linearGradient id={ids.far} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9b8267" stopOpacity=".5"/>
          <stop offset=".45" stopColor="#c5aa85" stopOpacity=".38"/>
          <stop offset="1" stopColor="#f6e9d0" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={ids.mid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c7256" stopOpacity=".69"/>
          <stop offset=".44" stopColor="#ae9071" stopOpacity=".45"/>
          <stop offset="1" stopColor="#f7e9d2" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={ids.near} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#806447" stopOpacity=".65"/>
          <stop offset=".48" stopColor="#a99070" stopOpacity=".45"/>
          <stop offset="1" stopColor="#f7e9d2" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={ids.paper} x1="0" y1="0" x2=".12" y2="1">
          <stop offset="0" stopColor="#fbf1df"/>
          <stop offset=".55" stopColor="#f5e8d2"/>
          <stop offset="1" stopColor="#ede0c6"/>
        </linearGradient>
        <filter id={ids.grain} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="3" seed={seed%999+1}/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="linear" slope=".17"/></feComponentTransfer>
        </filter>
        <filter id={ids.mist} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="28"/>
        </filter>
        <filter id={ids.brush} x="-8%" y="-8%" width="116%" height="116%"
          colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".13" numOctaves="2"
            seed={seed%997+1} result="fibres"/>
          <feDisplacementMap in="SourceGraphic" in2="fibres" scale=".9"
            xChannelSelector="R" yChannelSelector="G" result="absorbed"/>
          <feGaussianBlur in="absorbed" stdDeviation=".42" result="fringe"/>
          <feComponentTransfer in="fringe" result="wick">
            <feFuncA type="linear" slope=".24"/>
          </feComponentTransfer>
          <feMerge><feMergeNode in="wick"/><feMergeNode in="absorbed"/></feMerge>
        </filter>
        <linearGradient id={ids.path} x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#b29371" stopOpacity=".15"/>
          <stop offset="1" stopColor="#8f7055" stopOpacity=".7"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={"url(#"+ids.paper+")"}/>
      <g data-km-shanshui-world="" transform={transform}>
        <g opacity={f(washOpacity)}>
          <Mountains scene={controls.scene} seed={seed} detail={controls.detail}
            mist={controls.mist} ink={controls.ink}
            school={controls.inkSchool??"fuchun"} ids={ids}/>
          <Clouds shift={at.cloudX}/>
          <Birds motion={at}/>
          {controls.scene==="mountain-trail"&&
            <InkWaterfall phase={at.waterPhase} detail={controls.detail}/>}
          {river&&<>
            <Water seed={seed} phase={at.waterPhase} detail={controls.detail}/>
            <StoneBridge/>
            <Pavilion x={806} y={316} scale={.96}/>
          </>}
          {!river&&<Pavilion x={controls.scene==="misty-hermit"?419:290}
            y={controls.scene==="misty-hermit"?235:284}
            scale={controls.scene==="misty-hermit"?.47:.65}/>}
          {river&&<Willow seed={seed+47} detail={controls.detail} wind={at.breeze}/>}
          <g data-km-shanshui-mist=""
            transform={"translate("+f(at.mistX)+" 0)"}
            opacity={f(controls.mist)}>
            <ellipse cx="395" cy={river?288:293} rx="315" ry="46" fill="#fff8e9"
              filter={"url(#"+ids.mist+")"} opacity=".82"/>
            <ellipse cx="720" cy={river?341:337} rx="325" ry="41" fill="#fff6e4"
              filter={"url(#"+ids.mist+")"} opacity=".72"/>
          </g>
          <RockyPath seed={seed} detail={controls.detail} scene={controls.scene}
            washId={ids.path}/>
        </g>
        <foreignObject x={0} y={0} width={W} height={H}
          style={{overflow:"visible"}}>
          <div style={{width:W,height:H,position:"relative",pointerEvents:"none"}}>
            {children}
          </div>
        </foreignObject>
        <Foreground scene={controls.scene} seed={seed} detail={controls.detail}
          wind={at.breeze} ink={controls.ink} materialId={ids.brush}/>
      </g>
      <rect width={W} height={H} filter={"url(#"+ids.grain+")"} opacity=".42"
        style={{mixBlendMode:"multiply",pointerEvents:"none"}}/>
    </svg>
  </div>;
}
