/** Canonical discovery shape for browser gallery and local CLI.
 * No network, embeddings, ML, browser APIs, or renderer dependencies.
 * The only authored data is lightweight preview metadata and search synonyms;
 * installable packs and object kinds always come from the existing contracts.
 */
export type CatalogDomain =
  | "ui" | "patterns" | "media" | "motion" | "infographic" | "visual"
  | "craft" | "finance" | "business" | "technology" | "privacy" | "home" | "people" | "scene" | "video";
export type CatalogRenderer = "dom" | "svg" | "three" | "data" | "mixed";
export type CatalogEntryType = "pack" | "object" | "hero" | "film" | "effect";
export interface CatalogEntry {
  id: string;
  type: CatalogEntryType;
  name: string;
  title: string;
  description: string;
  domain: CatalogDomain;
  renderer: CatalogRenderer;
  /** Registry ID (not an invented npm package or unpublished registry URL). */
  registryItem: string;
  files: string[];
  /** Transitive install order, derived from registryDependencies. */
  installOrder: string[];
  dependencies: string[];
  keywords: string[];
  storyId?: string;
  storyParams?: Record<string,string>;
  docs?: string;
  /** Status is evidence-based; not a visual quality score. */
  review: "not-applicable" | "not-reviewed" | "approved";
  /** When and how to use an effect: the jobs it does, what it is for, and what to avoid. */
  guidance?: { jobs: readonly string[]; use: string; avoid: string; settings: string };
}
export interface RawPack {
  name:string;
  title:string;
  description:string;
  files:{path:string;target:string}[];
  dependencies?:string[];
  registryDependencies?:string[];
}
export interface RawKind {kind:string;title:string;archetype:string;
  /** Optional authored description; replaces the generic archetype sentence. */
  meaning?:string}
export interface RawFilm {id:string;title:string;summary:string;registryItem:string;storyExport:string;keywords:readonly string[]}
/** An effect or a ready-made moment, with the guidance an agent needs to choose it. */
export interface RawEffect {id:string;title:string;summary:string;registryItem:string;storyId:string;keywords:readonly string[];jobs:readonly string[];use:string;avoid:string;settings:string;
  /** Words every entry of this family is found by. @default ["effect","shader"] */ family?:readonly string[]}
export interface RawHero {kind:string;title:string;meaning:string;domain:"finance"|"technology"|"privacy"|"scene"}
export interface CatalogSources {
  items:readonly RawPack[];
  films?:readonly RawFilm[];
  effects?:readonly RawEffect[];
  vocabularies:{
    finance: readonly RawKind[];
    business: readonly RawKind[];
    technology: readonly RawKind[];
    people?: readonly RawKind[];
  };
  heroes: readonly RawHero[];
  approvedHeroKinds?:readonly string[];
  /** Authored previews must be validated against real Storybook files in CLI. */
  previews?: Record<string,{storyId:string;params?:Record<string,string>}>;
  docs?:Record<string,string>;
}
const normalize=(v:string)=>v.toLowerCase().normalize("NFKD")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
const words=(s:string)=>normalize(s).split(/\s+/u).filter(Boolean);
/** English filler words ignored when matching, so natural questions ("hook for a short video",
 * "check my video before export") still match. Content words must all match; a query made only of
 * filler words is matched literally. */
const STOPWORDS=new Set(["a","an","the","for","to","of","in","on","at","by","with","from","into","onto","and","or",
  "my","our","your","their","its","it","i","me","we","you","they","this","that","these","those",
  "is","are","be","been","do","does","can","could","should","would","will","how","what","which","when","where",
  "want","need","please","some","any","before","after","about","between","using","use"]);
const contentWords=(s:string)=>{ const all=words(s), kept=all.filter(w=>!STOPWORDS.has(w)); return kept.length?kept:all; };
const uniq=(values:readonly string[])=>[...new Set(values.filter(Boolean))];
const segment=(s:string)=>s.split("-").filter(Boolean);
/** Every 3D person shares the PERSON_ACTIONS vocabulary, so action words find each one. */
const PERSON_TERMS=["person","human","people","character","figure","avatar","3d person","rigged","animated",
  "idle","talking","walking","waving","looking around","thinking","crouching"];
const EXTRA_SYNONYMS:Record<string,string[]>={
  "sheet":["side sheet","slide over","side panel","properties inspector","resizable panel","editor panel"],
  "drawer":["bottom sheet","mobile drawer","swipeable panel","snap points","swipe to dismiss","gesture panel"],
  "atm":["cash withdrawal","cash machine","bank terminal"],
  "bank-account":["deposit","checking","savings","balance"],
  "credit-card":["credit card payment","chip card","contactless","bank card"],
  "stock-workstation":["trading desk","computer","market charts","candlesticks"],
  "money-printing-press":["currency printer","printing machine","press"],
  "piggy-bank":["savings","ceramic pig","coins"],
  "bull-market":["bullish","rising market"],
  "bear-market":["bearish","declining market"],
  "bank-check":["cheque","bank cheque","payment slip"],
  "org-chart":["organization chart","hierarchy","company structure"],
  "video-export-stage":["mp4","ffmpeg","youtube","tiktok","instagram","reels"],
  "hero-viewer":["product render","three js","3d studio"],
  "domain-home-3d":["house","real estate","building","cutaway","roof layers","wall layers","hvac","plumbing","home construction"],
  "domain-home-model":["house layout","floor plan","real estate","building systems","ducts","pipes","flow routes"],
  "inspectable-asset":["semantic parts","anchors","bounds","inspect","part tree","camera targets"],
  "craft-part-rig":["animate parts","pose parts","ghost","hide part","separately animatable","rig"],
  "craft-procedural-environments":["window treatments","window depth","recessed room pockets",
    "roller shades","pleated curtains","behind glass","glazed facade","brick masonry",
    "streetlamps","procedural street","oak birch pine","urban background"],
  "craft-natural-materials":["ground materials","PBR textures","wood bark","forest soil",
    "moss","stone texture","sand","granite","basalt","sandstone","limestone",
    "river pebbles","wet sand","red sand","wet ground","roughness map","normal map","tiling texture"],
  "craft-glass-materials":["physical glass","refraction","transmission","frosted glass",
    "smoked glass","amber glass","ribbed glass","rain streaks","IOR","glass surface"],
  "craft-mineral-debris":["sand particles","grit","rock chips","ground grains","gravel",
    "instanced debris","mineral particles","surface scatter"],
  "craft-ground-vegetation":["grass meadow","ferns","groundcover","plants","wildflowers",
    "instanced vegetation","botanical background","forest undergrowth","terrain foliage"],
  "section-reveal":["cutaway","cross section","clipping plane","x-ray","ghost","isolate","see inside","cut view"],
  "flow-path":["airflow","water flow","particles","arrows along path","energy flow","money flow","conveyor","animated flow"],
  "domain-home-floor-plan-2d":["floor plan","room layout","blueprint","plan view","furniture layout","apartment plan"],
  "craft-walk-camera":["first person","walkthrough","fps camera","explore interior","wasd","virtual tour"],
  "domain-home-section-2d":["house section","cross section drawing","cutaway 2d","building section","svg house"],
  "semantic-callouts":["labels","annotations","leader lines","callout","pointer label","part labels","tooltips 3d"],
  "failure-cascade":["cause and effect","chain of failures","root cause","domino effect","consequences","defect escalation","causal graph","what happens if ignored"],
  "redaction-reveal":["redact","redaction","black box","hidden text","personal data","pii","mask","censor","sensitive text","blur out"],
  "zone-boundary":["trust boundary","data boundary","where data goes","local processing","upload flow","privacy diagram","zone","region outline","device boundary"],
  "file-format-2d":["file format","file type","file icon","mov","heic","wav","video file","image file","audio file","conversion","format badge","file sheet"],
  "location-pin-2d":["location","gps","geotag","location tag","map pin","coordinates","exact location","approximate area","photo location","metadata location"],
  "document-page-2d":["scanned document","ocr","text layer","pdf redaction","black box","flattened","searchable text","scan","document page","redaction failure"],
  "short-safe-frame":["captions","keep captions away","keep away from ui","tiktok","reels","shorts","tiktok buttons","app buttons","platform overlay","keep clear","9:16 safe area","vertical safe zone","safe zone","safe area","9:16","vertical video","shorts","reels","platform ui","caption safe","reserved region","app overlay","portrait and landscape","blind crop","reframe"],
  "freeze-frame-focus":["zoom in on video","pause video and explain","video detail","highlight in video","examine frame","freeze frame","pause and zoom","examine detail","punch in on footage","spotlight","annotate footage","callout on video","highlight detail","slow down and explain","tracked annotation"],
  "interaction-choreography":["character interaction","grasp object","pick up","hand contact","reach","carry prop","place object","gaze target","physical interaction"],
  "shot-list-editor":["shot list","storyboard editor","reorder shots","scene plan editor"],
  "ray-world":["ray traced","ray tracing","raymarch","raymarching","glsl","webgl","3d world","motion blur","depth of field","cinematic","showcase","impressive","wow"],
  "ray-world-water-drop":["water drop","droplet","refraction","lens","glass ball","macro","photo","waterfall","ice cave","glacier","dive","zoom through","cinematic","showcase","impressive","wow"],
  "ray-world-terraced-relief":["relief","topographic","contour","terrain model","plaster","terracotta","product shot","tabletop","island","map","river","ice sheet","cinematic","showcase","impressive","wow"],
  "ray-world-river-flight":["flight","drone","aerial","fly through","valley","landscape","terrain","glacier","ice tunnel","rewind","waterfall","cinematic","showcase","impressive","wow"],
  "film-gallery":["film","films","video","gallery","video player","showreel","reel","poster","showcase","watch"],
  "sound-design":["sound recipe","sound search","room reverb","foley contact","ambience loop","sound variation","spatial sound"],
  "sound-mastering":["loudness","true peak","mix check","audio mastering","ducking","lufs","clicks"],
  "sound-catalog":["sound effects","sfx","foley","licensed sounds","sound rights","whoosh","impact sound"],
  "shader-fx":["shader","webgl background","animated gradient","mesh gradient","liquid metal","liquid logo","chrome logo","god rays","light rays","grain gradient","water ripple","halftone","print effect","cinematic effect"],
  "shader-fx-model":["shader spec","effect spec","shader data"],
  "film-document":["film json","whole film","make a video","short video","automated video","video from json","render a film","multi scene video","film file"],
  "scene-template-examples":["recipe example","example spec","starter scene","valid scene json"],
  "rendered-text-audit":["text contrast","empty frame","squint test","low contrast","text overlap","rendered bounds","text clipped","safe area check","contact sheet"],
  "object-story":["narrated scene","faceless explainer","animated objects","no stale frames","beat animation","caption placement","stillness report"],
  "shot-bake":["bake shot","offline render","blender render","per-frame bake","export camera to blender"],
  "audio-visual-cue":["sync animation","animation to narration","voiceover sync","timestamps","word timestamps","transcript timing","tts timing","elevenlabs","mix audio","sound timing","audio sync","narration sync","word timing","forced alignment","whisper","whisperx","gentle","textgrid","subtitle files","srt","vtt","beat sync","music beats","sound effects","audio mix","lip sync timing"],
  "frame-accurate-clip":["play video","video clip","video player","footage clip","b-roll","pause video","webm","mp4","exact frame","video clip","footage","video frame","freeze frame","slow motion","reverse","trim","speed ramp","time remap","image sequence","reframe","crop video","variable frame rate","seek video"],
  "cut-director":["transition","shot transition","scene transition","edit","jump cut","video editing","shots","whip","cuts","transitions","match cut","punch in","whip pan","wipe","dissolve","freeze","hold frame","shot sequence","editing","edit plan","foreground wipe"],
  "screen-surface":["device screen","phone screen","laptop screen","screen content 3d","screenshot on a phone","app screen in 3d","display texture","ui on a device","screen mockup","product screen","video of a screen","show the app"],
  "chart-story":["chart story","data story","animated chart","chart animation","data video","explain a chart","chart explainer","reveal series","highlight data point","compare values","what if","scenario","before and after chart","growth","percent change","trend story","checked claim","data claim","honest chart"],
  "graph-topology-stage":["network graph","node edge diagram","topology","force-directed layout","layered hierarchy","graph traversal","BFS DFS walkthrough","network clusters","weighted routes","neural network structure"],
  "scale-comparison-stage":["scale comparison","size comparison","real size","unit conversion","exact conversion","ratio of two values","log scale dots","shared axis","magnitude comparison","dimension check","radius comparison","height comparison"],
  "map-stage":["map","geographic map","GeoJSON","choropleth","region fill","projection","orthographic globe","equirectangular","route animation","migration flow map","border map","pin labels","map attribution"],
  "distribution-stage":["distribution","histogram","sampling","uncertainty interval","confidence interval","probability area","density curve","normal distribution","bins","CDF","stated interval","sample distribution"],
  "code-stage":["code","source code","syntax highlight","code walkthrough","show the code","code explainer","highlight a line","programming explainer","function walkthrough","code snippet","typed code","code review"],
  "evidence-stage":["evidence","cite sources","citation","source document","quote","excerpt","provenance","documentary","screenshot evidence","photo evidence","data excerpt","highlight quote","show the source","receipts","fact check"],
  "short-hook-director":["short video","first seconds","first 3 seconds","video intro","attention","retention","tiktok","reels","youtube shorts","scroll stopper","hook","opening","cold open","short-form hook","first seconds","action first","impact statistic","evidence question","unexpected reveal","transformation hook","payoff","shorts opening"],
  "caption-performer":["captions for video","on-screen text","speaker captions","video subtitles","closed captions","captions","subtitles","word highlight","karaoke captions","timed text","word timing","forced alignment","speaker label","caption stage","rtl captions","cjk captions","burned-in captions"],
  "explainer-principles":["check explainer","explainer video check","validate video","before export","quality check","hook payoff check","video lint","preflight","explainer checks","seek parity","deterministic","hook payoff","reading time","capabilities","licence","rights","principles"],
  "audio-timeline-2d":["waveform","audio waveform","trim","clip trim","timeline","trim handles","in and out points","audio editing","video trim","playhead","time ruler"],
  "inspect-then-quantify":["explainer recipe","zoom into part then chart","object to cost","cutaway then chart","inspect then quantify","camera push and chart"],
  "scalar-field":["heat map","thermal image","temperature map","moisture map","contours","field overlay","infrared","heatmap on surface"],
  "environmental-effects":["rain","snow","dust","leak","drips","condensation","water stain","weather effect","storm","moisture","hail","blizzard","snow cover","snow on roof","sideways rain","splash"],
  "domain-home-effects":["roof leak","storm on house","attic dust","window condensation","ceiling stain","snowman","snow day","hail storm","winter house"],
  "mechanism-sequence":["moving parts","mechanism","machine operation","valve","fan spin","compressor","appliance operation","open door animation","sequence of operations"],
  "dimension-overlay":["dimensions","measurement","dimension lines","thickness","layer thickness","area","angle","roof pitch","scale reference","ruler"],
  "domain-home-dimensions":["house dimensions","wall thickness","roof layers thickness","foundation depth","window size","footprint area"],
  "animated-metric":["count up","counter","number animation","ticker","kpi","stat","odometer","animated number","savings counter","percentage"],
  "asset-state-sequence":["before after","aging","damage","repair","replacement","state change","crossfade","wipe transition","condition states"],
  "people-3d":["people","person","human","humans","character","characters","avatar","figure","rigged character","animated character","3d person","walk cycle","presenter"],
  "human-anatomy":["anatomy","human anatomy","proportions","body proportions","figure drawing","draw a person","draw people","draw a human","realistic human","realistic person",
    "head heights","heads tall","skeleton","joints","joint angles","range of motion","pose","posing","poses","contrapposto","hands","hand poses","fingers","feet",
    "face","face proportions","facial landmarks","facial features","eyes","iris","eye color","eye colour","pupil","eyelashes","lashes","eyebrows","brows",
    "hair","hairstyle","hair strands","curly hair","straight hair","wavy hair","coily hair","afro","hairline","parting","bangs","fringe","grey hair","gray hair","hair color","hair colour","melanin",
    "skin","skin tone","skin tones","skin color","skin colour","monk skin tone","ita","complexion","subsurface scattering","blush",
    "children","child proportions","growth","aging","elderly","age","body measurements","anthropometry","ansur","landmarks","muscles","surface anatomy",
    "turnaround","model sheet","reference figure","clay figure","value study","shading a figure","contour drawing","silhouette","any art style"],
  "animal-anatomy":["animal anatomy","animal","animals","draw an animal","draw animals","animal proportions","quadruped","four-legged","bird anatomy","fish anatomy",
    "body plan","plantigrade","digitigrade","unguligrade","hooves","paws","claws","gait","gaits","walk cycle","trot","canter","gallop","rotary gallop","bound","footfall","muybridge","hildebrand",
    "posture","postures","animal sitting","dog sit","cat sit","lie down","lying down","animal resting","sleeping animal","rear up","rearing horse","levade","bear standing up",
    "animal face front","face square on","front view face","animal front view",
    "fur strands","hair direction","hair flow","fur direction","coat strands","draw fur","young animal","baby animal","juvenile","foal","fawn","calf","puppy","kitten","cub","piglet","kit","chick","duckling","growth","baby schema","bird on one leg","sleeping bird","roosting","duck swimming","floating duck","upending","dabbling","bird flight","flying bird","wingbeat","wing beat","flapping","flap","glide","gliding","bounding flight","wings","wing fold","crane flying","heron flying",
    "fur","coat","fur map","fur direction","coat colour","coat color","markings","palette","animal colours","animal colors","seasonal coat","winter coat",
    "character sheet","model sheet","animal model sheet","turnaround","size comparison","animal size","animal sounds","animal face","muzzle","snout","ears",
    "bear","moon bear","boar","wild boar","fox","kitsune","tanuki","raccoon dog","wolf","dog","shiba","cat","hare","rabbit","monkey","macaque","deer","sika","cattle","ox","horse",
    "weasel","mouse","crane","heron","crow","pheasant","sparrow","hawk","goshawk","mandarin duck","kingfisher","koi","carp","japanese animals","folklore animals","any art style"],
  "plant-anatomy":["plant anatomy","plants","plant","draw a tree","draw trees","tree","trees","tree anatomy","botanical","botany","flower","flowers","leaf","leaves","bark","branches","branching",
    "crown","canopy","foliage","seasons","four seasons","autumn leaves","autumn colour","autumn color","blossom","cherry blossom","sakura","hanami","plum blossom","ume","pine","matsu","cedar","sugi","hinoki",
    "willow","maple","momiji","bamboo","ginkgo","zelkova","camphor","persimmon","peach","wisteria","camellia","chrysanthemum","iris","lotus","susuki","pampas grass","reed","paulownia","morning glory","rice",
    "growth form","bud arrangement","phyllotaxis","leonardo rule","wind in trees","japanese plants","japanese trees","character sheet","model sheet","any art style"],
  "flora-engine":["flora engine","3d plants","3d plant","3d tree","3d trees","procedural plants","procedural tree","procedural flora","plant generator","tree generator","flora generator","species profile",
    "morphology","botanical reference","reference-guided","monstera","swiss cheese plant","fenestration","leaf holes","split leaf","baobab","bottle trunk","dragon tree","dragon blood tree","dracaena",
    "umbrella crown","dichotomous branching","weeping willow","willow curtain","catenary","droop","elastica","sunflower","golden angle","fibonacci","phyllotaxis","maize","corn","crop rows","row crop",
    "echeveria","succulent","rosette","moss","moss cushion","ground cover","grove","forest","field","instanced plants","instancing","growth stage","seedling","three.js plants","webgl plants","any species",
    "coconut palm","palm tree","palm","oak","oak tree","maple","japanese maple","fiddle leaf fig","snake plant","sansevieria","aloe","aloe vera","tulip","tulip field","lavender","lavender field",
    "saguaro","cactus","fern","boston fern","houseplant","house plant","acorn","pinnate","fronds","flower bed","desert plants","park trees"],
  "sky-weather":["sky","weather","sky and weather","clouds","cloud","cloud types","cloud genera","cumulus","cumulonimbus","thunderhead","anvil cloud","cirrus","stratus","nimbostratus","altocumulus",
    "stratocumulus","mackerel sky","rain","raindrops","rain streaks","drizzle","downpour","snow","snowfall","snowflakes","hail","fog","mist","haze","aerial perspective","atmospheric perspective",
    "visibility","wind","beaufort","gale","storm","thunderstorm","lightning","thunder","rainbow","sunset","sunrise","golden hour","blue hour","twilight","dusk","dawn","time of day","overcast",
    "sky gradient","sky colour","sky color","cloud deck","weather effects","any art style"],
  "costume":["costume","costumes","clothing","clothes","garment","garments","outfit","outfits","dress","traditional dress","national dress","folk costume","historical costume","period costume",
    "fashion history","kimono","kosode","furisode","junihitoe","hakama","obi","yukata","hanfu","qipao","cheongsam","hanbok","sari","kurta","ao dai","kebaya","thawb","abaya","kaftan","toga","tunic",
    "doublet","ruff","crinoline","bustle","corset","frock coat","kilt","dirndl","kente","agbada","boubou","poncho","parka","huipil","suit","jeans","by country","by region","by era","tag search","what did people wear"],
  "water":["water","sea","ocean","waves","wave","sea state","swell","surf","breaker","breaking wave","plunging wave","spilling wave","barrel","tube","whitecaps","white horses","foam",
    "ripples","ripple","rain on water","wake","boat wake","kelvin wake","reflection","reflections","water reflection","mirror lake","sun glitter","glitter path","sunglint","fresnel",
    "river","rivers","meander","meanders","lake","pond","stream","water colour","water color","turquoise water","shallow water","beach","shore","float","buoy","boat bobbing","any art style"],
  "fire-effects":["fire","flame","flames","candle","campfire","bonfire","torch","smoke","sparks","embers","explosion","fireball","firelight","flicker","blackbody","flame colour","flame color","burning","vfx","effects","fx","heat","glow","any art style"],
  "human-motion":["motion","movement","human motion","walk","walking","walk cycle","run","running","run cycle","gait","gait cycle","stride","cadence","foot sliding","feet planted","body language","emotion","sad walk","happy walk","angry walk","sit to stand","stand up","animation","muybridge","chronophotograph","locomotion","any art style"],
  "small-creatures":["insects","insect","bugs","bug","small creatures","firefly","fireflies","hotaru","dragonfly","tonbo","butterfly","butterflies","moth","cicada","semi","bee","honeybee","ant","ants","ladybird","ladybug","mantis","praying mantis","cricket","bell cricket","suzumushi","beetle","stag beetle","rhinoceros beetle","kabutomushi","spider","jorogumo","snail","katatsumuri","wings","wingbeat","tripod gait","six legs","eight legs","any art style"],
  "food":["food","cooking","cooked","storybook food","food illustration","still life","food library","golden hour","backlight","sourdough","bread","cheese","pastry","soup","stew","curry","noodles","dumplings","pizza","fruit bowl","vegetables","spices","subsurface scattering","steak","meat","beef","doneness","medium rare","egg","boiled egg","soft boiled","yolk","toast","bread","browning","maillard","caramelization","steam","hot food","rice","onigiri","sushi","nigiri","ramen","dango","tempura","persimmon","fruit","gloss","glaze","dish","dishes","kitchen","heat conduction","any art style"],
  "architecture":["architecture","building","buildings","house","houses","town","street","street front","facade","elevation","storey","storeys","door size","window","roof","roof pitch","gable","hip roof","irimoya","thatch","kawara","tiles","machiya","temple","shrine","pagoda","castle","tenshu","keep","farmhouse","minka","gassho","georgian","townhouse","terrace","half-timbered","timber frame","greek temple","columns","classical orders","doric","ionic","corinthian","apartment","adobe","stairs","staircase","human scale","tatami","ken","shaku","any art style","storybook","storybook illustration","watercolour architecture","painted buildings","cottage","cotswold","tudor","half timber","fachwerk","colombage","haussmann","chalet","canal house","step gable","palazzo","tuscan","cycladic","stave church","riad","kasbah","romanesque","gothic","flying buttress","cathedral","castle","bridge","watermill","windmill","barn","conservatory","glasshouse","bakery","apothecary","library","attic","tavern","cobblestones","limewash","slate roof","thatch roof","ivy","moss","lantern","candlelight","rain","illustrated","illustration","picture book","children's book","fairy tale","fairytale","storybook background","backdrop","environment","painterly","plate","cozy","cosy","interior","interiors","room","rooms","workshop","shop","shopfront","village","medieval","old town","street","alley","harbour","canal","market","square","farmhouse","cottage garden","mill","tower","church","chapel","abbey","ruins","dome","palace","courtyard","weathered","stone wall","timber frame","stained glass","fireplace","hearth","night street","snow","modules","modular","building blocks","asset showcase","kit of parts","column","capital","doric column","ionic column","corinthian column","pediment","coffered dome","pantheon","parthenon","rose window","tracery","gargoyle","lancet","baroque","renaissance","balcony","volute","scroll","chinese architecture","dougong","bracket set","forbidden city","temple of heaven","glazed tiles","ridge beasts","upturned eaves","moon gate","lattice","balustrade","art deco","sunburst","chrysler","modernism","pilotis","ribbon window","villa savoye","fallingwater","barcelona pavilion","brutalism","brutalist","concrete","beton brut","habitat 67","deconstructivism","titanium","guggenheim","diagrid","dancing house","studio backdrop","chinese roof","curved roof","glazed tile","chiwen","xieshan","hip and gable","imperial hall","hall of supreme harmony","temple hall","pavilion","ting","pagoda","paifang","archway","huizhou","horse-head wall","whitewashed wall","garden wall","leak window","vase door","hump bridge","humpback bridge","red lantern","suzhou garden","sculpt","sculpted","gothic nave","rib vault","quadripartite vault","triforium","clerestory","compound pier","moon window","ice-ray lattice"],
  "interiors-furniture":["interior","interiors","furniture","room","rooms","chair","chairs","table","tables","desk","sofa","settee","chesterfield","bed","four-poster","futon","cabinet","chest","dresser","bookcase","shelves","wardrobe","sideboard","stool","bench","settle","windsor chair","ladder-back","shaker","queen anne","chippendale","cabriole","ball and claw","thonet","bentwood","ming chair","horseshoe armchair","official's hat chair","huanghuali","tansu","chabudai","tatami","washitsu","bauhaus","tubular steel","lounge chair","mid-century","art deco","victorian parlour","georgian drawing room","tudor hall","alpine stube","tiled stove","fireplace","chandelier","lamp","tiffany lamp","longcase clock","folding screen","rug","persian rug","cushions","seat height","table height","ergonomics","clearance","period room","living room","bedroom","study","any art style","church interior","cathedral interior","gothic nave","nave","pew","pews","pulpit","altar","reredos","font","lectern","eagle lectern","corona","chandelier crown","votive","stained glass","rib vault","shoji","fusuma","ranma","tokonoma","chigaidana","kakejiku","hanging scroll","ikebana","chabana","shoin","tea room","chashitsu","irori","minka","jizai-kagi","andon","hibachi","kotatsu","byobu","folding screen gold","engawa","japandi","dark academia","library","cottage kitchen","cotswold","range cooker","belfast sink","wing chair","bankers lamp","globe","paper lantern","moon window","skirting","cornice","panelling","curtains","sash window"],
  "terrain":["terrain","landforms","landform","mountain","mountains","mountain range","peak","peaks","ridge","valley","u-valley","v-valley","glacier","glacial","volcano","stratovolcano","shield volcano","cinder cone","fuji","mesa","butte","canyon","desert","dunes","sand dunes","barchan","scree","talus","cliff","sea cliff","coast","coastline","hills","rolling hills","landscape","scenery","ground","rock","snowline","snow line","treeline","tree line","angle of repose","erosion","heightfield","aerial perspective","distant mountains","albedo","geography","geology","any art style"],
  "materials":["materials","material","material library","pbr","pbr material","albedo","base color","base colour","metalness","roughness","gloss","metal","gold","silver","copper","bronze","brass","iron","rust",
    "patina","verdigris","wood","bamboo","tatami","thatch","paper","washi","plaster","lacquer","urushi","negoro","stone","granite","marble","slate","brick","terracotta","roof tile","kawara","porcelain",
    "wet","wet look","weathering","aged","aging","value scale","value","lightness","material ball","any art style"],
  "facial-expressions":["facial expression","facial expressions","expression","expressions","emotion","emotions","face emotion","smile","duchenne smile","laugh","laughter","sad","sadness","cry","crying","tears",
    "angry","anger","fear","afraid","scared","surprise","surprised","disgust","contempt","shy","shyness","pain","sleepy","determined","glare","mie","kabuki","kumadori","noh mask",
    "facs","action units","emfacs","brows","eyebrows","frown","grimace","wrinkles","crow's feet","mouth corners","acting","character acting","any art style"],
  "makeup":["makeup","make-up","cosmetics","beauty","beauty look","makeup look","glam","soft glam","no-makeup makeup","natural makeup","foundation","concealer","colour corrector","color corrector",
    "contour","contouring","sculpt","highlight","highlighter","strobing","bronzer","blush","blusher","flush","eyeshadow","eye shadow","smoky eye","smokey eye","eyeliner","winged liner","cat eye","mascara",
    "brows","brow map","brow shaping","lipstick","red lip","lip liner","gloss","lip gloss","gradient lip","dewy skin","matte","shimmer","glitter","finish","undertone","warm undertone","cool undertone",
    "olive skin","skin undertone","shade match","face chart","face shape","round face","square face","heart face","oblong face","hooded eyes","monolid","eye shape","igari","k-beauty","maiko","oshiroi","douyin makeup","c-beauty","aegyo-sal","tear bag","jirai","jirai-kei","gyaru","ulzzang","ryousangata","k-idol","circle lens","false lashes","manga lashes","puppy liner","lower liner","double eyelid tape","straight brows",
    "beni","stage makeup","makeup transfer","virtual makeup","beauty standards","facial contrast","chiaroscuro","any art style"],
  "art-foundations":["art foundations","shared geometry","scale figure","size comparison","person for scale","character sheet card","swatch list"],
  "casual-adult":[...PERSON_TERMS,"woman","female","adult","homeowner","customer","resident","presenter","host","everyday person","civilian"],
  "contractor":[...PERSON_TERMS,"man","male","worker","construction worker","builder","tradesperson","tradesman","plumber","electrician","technician","inspector","repairman","handyman","hard hat","tool belt","overalls"],
  "comparison-stage":["side by side","compare sizes","true scale","to scale","a vs b","versus","size comparison","tank vs tankless","equal scale"],
  "stepper":["steps","step by step","step-by-step","workflow","workflow steps","wizard","multi-step","multistep","progress steps","step indicator","process steps","checkpoints","onboarding steps","stage tracker","step navigation","pipeline stages","completed steps","current step","step status"],
  "infographic-economic-charts":["waterfall chart","cost breakdown","quote breakdown","lifetime cost","total cost of ownership","tco","payback","break even","crossover","cumulative cost","savings over time","rebate","replacement cost","30 year cost","scenarios","low base high","uncertainty band","range","forecast range","what if"],
};
function domainOf(name:string,path:string):CatalogDomain{
  const parts=path.split("/");
  if(parts[0]==="registry"){
    const folder=parts[1];
    if(["ui","patterns","media","motion","infographic","visual","craft","video"].includes(folder))
      return folder as CatalogDomain;
  }
  if(name.includes("business"))return "business";
  if(name.includes("technology"))return "technology";
  if(name.includes("privacy"))return "privacy";
  if(name.includes("home"))return "home";
  if(name.includes("people"))return "people";
  return "finance";
}
function rendererOf(name:string,paths:readonly string[]):CatalogRenderer{
  if(name.endsWith("-model")||name.includes("quality")||name.includes("review")||name.includes("presets"))
    return "data";
  if(name.includes("-3d")||name.includes("hero"))return "three";
  if(name.includes("-2d")||name.includes("svg")||name.includes("illustration"))return "svg";
  if(paths.some(p=>p.includes("viewport-3d")||p.includes("-3d.")))return "three";
  if(paths.every(p=>p.endsWith(".ts")||p.endsWith(".json")))return "data";
  return "dom";
}
function closure(name:string,items:Map<string,RawPack>):string[]{
  const done=new Set<string>(),active=new Set<string>(),result:string[]=[];
  function visit(current:string){
    if(done.has(current))return;
    if(active.has(current))throw new Error("Catalog registry cycle: "+current);
    const pack=items.get(current);
    if(!pack)throw new Error("Unknown catalog registry item: "+current);
    active.add(current);
    for(const dep of pack.registryDependencies??[])
      if(items.has(dep))visit(dep);
    active.delete(current);done.add(current);result.push(current);
  }
  visit(name);return result;
}
function makeKeywords(kind:string,archetype?:string,more:readonly string[]=[]):string[]{
  return uniq([...segment(kind),kind,...(archetype?[archetype]:[]),...more,
    ...(EXTRA_SYNONYMS[kind]??[])]);
}
export function buildCatalog(sources:CatalogSources):CatalogEntry[]{
  const packs=new Map<string,RawPack>(sources.items.map(p=>[p.name,p]));
  if(packs.size!==sources.items.length)throw new Error("Catalog registry has duplicate pack names.");
  const result:CatalogEntry[]=[];
  const preview=(id:string)=>sources.previews?.[id];
  const mk=(data:Omit<CatalogEntry,"installOrder"|"dependencies">)=>{
    const pack=packs.get(data.registryItem);
    if(!pack)throw new Error("Catalog entry "+data.id+" has missing installable pack "+data.registryItem);
    const order=closure(data.registryItem,packs);
    result.push({...data,installOrder:order,
      dependencies:uniq(order.flatMap(i=>packs.get(i)?.dependencies??[]))});
  };
  for(const pack of sources.items){
    const paths=pack.files.map(f=>f.path);
    const domain=domainOf(pack.name,paths[0]??"");
    const renderer=rendererOf(pack.name,paths);
    const id="pack:"+pack.name,p=preview(id);
    mk({id,type:"pack",name:pack.name,title:pack.title,description:pack.description,
      domain,renderer,registryItem:pack.name,files:paths,
      keywords:makeKeywords(pack.name,undefined,[domain,renderer,pack.title]),
      storyId:p?.storyId,storyParams:p?.params,docs:sources.docs?.[pack.name],
      review:renderer==="three"?"not-reviewed":"not-applicable"});
  }
  const objectPacks={
    finance:{"2d":"domain-finance-objects-2d","3d":"domain-finance-objects-3d"},
    business:{"2d":"domain-business-objects-2d"},
    technology:{"2d":"domain-technology-objects-2d"},
    people:{"3d":"people-3d"},
  } as const;
  for(const domain of ["finance","business","technology","people"] as const){
    const seen=new Set<string>();
    for(const object of sources.vocabularies[domain]??[]){
      if(seen.has(object.kind))throw new Error("Duplicate "+domain+" semantic kind: "+object.kind);
      seen.add(object.kind);
      for(const [medium,pack] of Object.entries(objectPacks[domain])){
        const id="object:"+domain+":"+object.kind+":"+medium,p=preview(id);
        mk({id,type:"object",name:object.kind,title:object.title,
          description:object.meaning??domain+" "+object.archetype+" object, "+medium.toUpperCase()+" visualization.",
          domain,renderer:medium==="3d"?"three":"svg",
          registryItem:pack,files:packs.get(pack)?.files.map(f=>f.path)??[],
          keywords:makeKeywords(object.kind,object.archetype,[domain,medium,object.title]),
          storyId:p?.storyId,storyParams:p?.params,
          docs:sources.docs?.[pack],review:medium==="3d"?"not-reviewed":"not-applicable"});
      }
    }
  }
  for(const film of sources.films??[]){
    mk({id:"film:"+film.id,type:"film",name:film.id,title:film.title,description:film.summary,
      domain:"video",renderer:packs.get(film.registryItem)?.files.some(f=>f.path.includes("ray-world"))?"mixed":"dom",
      registryItem:film.registryItem,files:packs.get(film.registryItem)?.files.map(f=>f.path)??[],
      keywords:makeKeywords(film.id,undefined,["film","video","movie",...film.keywords]),
      storyId:"showcases-films--"+film.storyExport,docs:sources.docs?.[film.registryItem],review:"not-reviewed"});
  }
  for(const effect of sources.effects??[]){
    mk({id:effect.id,type:"effect",name:effect.id.split(":").pop()!,title:effect.title,description:effect.summary,
      domain:"video",renderer:"dom",registryItem:effect.registryItem,files:packs.get(effect.registryItem)?.files.map(f=>f.path)??[],
      keywords:makeKeywords(effect.id.split(":").pop()!,undefined,[...effect.family??["effect","shader"],...effect.jobs,...effect.keywords]),
      storyId:effect.storyId,docs:sources.docs?.[effect.registryItem],review:"not-reviewed",
      guidance:{jobs:effect.jobs,use:effect.use,avoid:effect.avoid,settings:effect.settings}});
  }
  const approved=new Set(sources.approvedHeroKinds??[]);
  const heroPacks:Record<string,string>={
    finance:"domain-finance-hero-3d",
    technology:"crafted-3d-hero",
    privacy:"crafted-3d-hero",
    scene:"crafted-3d-hero",
  };
  const heroes=new Set<string>();
  for(const hero of sources.heroes){
    if(heroes.has(hero.kind))throw new Error("Duplicate catalog hero kind: "+hero.kind);
    heroes.add(hero.kind);
    const id="hero:"+hero.kind,p=preview(id);
    const pack=heroPacks[hero.domain];
    // Non-finance entries are authored in standalone domain modules, but the
    // generic hero toolkit alone cannot install their source. Index as a
    // discoverable catalog hero only where a source-backed pack actually exists.
    if(hero.domain!=="finance")continue;
    mk({id,type:"hero",name:hero.kind,title:hero.title,description:hero.meaning,
      domain:hero.domain,renderer:"three",registryItem:pack,
      files:packs.get(pack)?.files.map(f=>f.path)??[],
      keywords:makeKeywords(hero.kind,undefined,[hero.domain,"3d","hero",hero.meaning]),
      storyId:p?.storyId,storyParams:p?.params,docs:sources.docs?.[pack],
      review:approved.has(hero.kind)?"approved":"not-reviewed"});
  }
  if(approved.size&&[...approved].some(kind=>!heroes.has(kind)))
    throw new Error("An approved hero is not present in the catalog.");
  const ids=new Set<string>();
  for(const row of result){
    if(ids.has(row.id))throw new Error("Duplicate catalog ID: "+row.id);
    ids.add(row.id);
    if(row.storyParams&&!row.storyId)throw new Error("Preview parameters without a real story: "+row.id);
  }
  return result.sort((a,b)=>a.id.localeCompare(b.id,"en"));
}
export interface CatalogFilters {
  query?:string;
  domain?:CatalogDomain|"all";
  renderer?:CatalogRenderer|"all";
  type?:CatalogEntryType|"all";
  limit?:number;
}
// An effect is found by what it is for, so its use is searchable. What to avoid is not, or "avoid text" would match "text".
const searchText=(entry:CatalogEntry)=>normalize([entry.name,entry.title,entry.description,...entry.keywords,
  entry.domain,entry.registryItem,entry.guidance?.use??""].join(" "));
function score(entry:CatalogEntry,query:string):number{
  const q=normalize(query);if(!q)return 1;
  const terms=contentWords(query);
  const name=normalize(entry.name),title=normalize(entry.title);
  const termsAndSynonyms=entry.keywords.map(normalize);
  const haystack=searchText(entry);
  if(!terms.every(t=>haystack.includes(t)))return 0;
  let result=1;
  if(name===q||title===q)result+=100;
  else if(name.startsWith(q)||title.startsWith(q))result+=60;
  else if(name.includes(q)||title.includes(q))result+=35;
  if(termsAndSynonyms.some(v=>v===q))result+=30;
  result+=terms.filter(t=>words(name+" "+title).some(word=>word.startsWith(t))).length*6;
  return result;
}
/** Shared deterministic lexical search. No network or hidden ranking calls. */
export function searchCatalog(entries:readonly CatalogEntry[],options:CatalogFilters={}):CatalogEntry[]{
  const filtered=entries.filter(e=>
    (!options.domain||options.domain==="all"||e.domain===options.domain)&&
    (!options.renderer||options.renderer==="all"||e.renderer===options.renderer)&&
    (!options.type||options.type==="all"||e.type===options.type));
  const ranked=filtered.map(e=>({entry:e,score:score(e,options.query??"")}))
    .filter(row=>row.score>0)
    .sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id,"en"));
  return ranked.slice(0,options.limit??ranked.length).map(r=>r.entry);
}
export interface PartialCatalogMatch{entry:CatalogEntry;matched:string[];missing:string[]}
/** Closest entries for a query with no full match, for a reader that shows which words are missing.
 * An entry needs at least half the content words. `searchCatalog` stays strict: a partial match is not a result. */
export function searchCatalogPartial(entries:readonly CatalogEntry[],options:CatalogFilters={}):PartialCatalogMatch[]{
  const terms=contentWords(options.query??"");
  if(!terms.length)return [];
  const rows=entries.filter(e=>
    (!options.domain||options.domain==="all"||e.domain===options.domain)&&
    (!options.renderer||options.renderer==="all"||e.renderer===options.renderer)&&
    (!options.type||options.type==="all"||e.type===options.type)).flatMap(entry=>{
    const haystack=searchText(entry),matched=terms.filter(t=>haystack.includes(t));
    return matched.length*2>=terms.length?[{entry,matched,missing:terms.filter(t=>!matched.includes(t))}]:[];
  });
  return rows.sort((a,b)=>b.matched.length-a.matched.length||a.entry.id.localeCompare(b.entry.id,"en")).slice(0,options.limit??rows.length);
}
/** Emit the exact Storybook ID known to the catalog, or null—not a guessed URL. */
export function catalogStoryUrl(entry:CatalogEntry,base="/iframe.html"):string|null{
  if(!entry.storyId)return null;
  const query=new URLSearchParams({id:entry.storyId,viewMode:"story",
    ...entry.storyParams});
  return base+"?"+query.toString();
}
