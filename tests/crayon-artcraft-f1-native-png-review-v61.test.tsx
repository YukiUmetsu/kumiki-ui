import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {webcrypto} from "node:crypto";
import {deflateSync} from "node:zlib";
import {
  CRAYON_F1_V59_SOURCE,
  crayonF1NativeCaptureWorksheetV60,
  crayonF1NativePngDimensionsV61,
  crayonF1ValidateSourcePngV62,
  crayonF1NativePngSha256V61,
  crayonF1ValidateNativePngManifestV61,
} from "../src/video/crayon-artcraft-f1-candidate-landmarks-v59";
import {Cc0NativePngReviewWorkbenchV61}
  from "../src/video/crayon-artcraft-adult-face.stories";

const WIDTH=608,HEIGHT=1082;
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(data:Buffer){
  let crc=0xffffffff;
  for(const byte of data){
    crc^=byte;
    for(let bit=0;bit<8;bit++)
      crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function chunk(type:string,data:Buffer){
  const name=Buffer.from(type),length=Buffer.alloc(4),checksum=Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([length,name,data,checksum]);
}
function nativePng(width=WIDTH,height=HEIGHT,fill=255){
  const stride=1+width*4,raw=Buffer.alloc(stride*height);
  for(let y=0;y<height;y++){
    raw[y*stride]=0;
    raw.fill(fill,y*stride+1,(y+1)*stride);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([SIGNATURE,chunk("IHDR",ihdr),
    chunk("IDAT",deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
function asArrayBuffer(bytes:Buffer){
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
}

function hexArrayBuffer(hex:string){
  return asArrayBuffer(Buffer.from(hex,"hex"));
}
function installExactSourceHash(sourceBytes:Buffer){
  const originalDigest=webcrypto.subtle.digest.bind(webcrypto.subtle);
  vi.stubGlobal("crypto",{
    subtle:{
      digest:async(algorithm:AlgorithmIdentifier,data:BufferSource)=>{
        const bytes=data instanceof ArrayBuffer?Buffer.from(data):
          Buffer.from(data.buffer,data.byteOffset,data.byteLength);
        if(bytes.equals(sourceBytes))
          return hexArrayBuffer(CRAYON_F1_V59_SOURCE.sha256);
        return originalDigest(algorithm,data as Parameters<typeof originalDigest>[1]);
      },
    },
  } as unknown as Crypto);
}

async function sha256(bytes:Buffer){
  const digest=await webcrypto.subtle.digest("SHA-256",asArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
async function manifestFor(bytes:Buffer,variant:"source-anat1-hair-top-v56"|"source-anat1-hair-edge-v57"="source-anat1-hair-edge-v57"){
  const fileName=variant==="source-anat1-hair-edge-v57"?
    "v58-photo-native-V57-299.png":"v58-photo-native-V56-299.png";
  const hash=await sha256(bytes);
  return {fileName,hash,manifest:crayonF1NativeCaptureWorksheetV60({
    variant,nativePngSha256:hash,checkoutCommitSha:"d".repeat(40),pngFileName:fileName,
  })};
}
beforeEach(()=>vi.stubGlobal("crypto",webcrypto));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe("Crayon ArtCraft V61 exact native PNG review",()=>{
  it("accepts only the exact frozen CC0 source PNG bytes and 608x1082 camera",()=>{
    expect(()=>crayonF1ValidateSourcePngV62(
      "cc0-source-608x1082.png",CRAYON_F1_V59_SOURCE.sha256,608,1082,
    )).not.toThrow();
    expect(()=>crayonF1ValidateSourcePngV62(
      "cc0-source-608x1082.png","0".repeat(64),608,1082,
    )).toThrow(RangeError);
    expect(()=>crayonF1ValidateSourcePngV62(
      "cc0-source-608x1082.png",CRAYON_F1_V59_SOURCE.sha256,540,960,
    )).toThrow(RangeError);
    expect(()=>crayonF1ValidateSourcePngV62(
      "renamed.png",CRAYON_F1_V59_SOURCE.sha256,608,1082,
    )).toThrow(RangeError);
  });

  it("reads PNG dimensions and computes the actual byte SHA-256",async()=>{
    const bytes=nativePng();
    expect(crayonF1NativePngDimensionsV61(new Uint8Array(bytes))).toEqual([608,1082]);
    expect(await crayonF1NativePngSha256V61(asArrayBuffer(bytes),webcrypto as unknown as Crypto))
      .toBe(await sha256(bytes));
    expect(()=>crayonF1NativePngDimensionsV61(new Uint8Array(nativePng(540,960))))
      .toThrow(RangeError);
    expect(()=>crayonF1NativePngDimensionsV61(new Uint8Array([1,2,3,4])))
      .toThrow(RangeError);
  });

  it("authenticates the screenshot against the exact V60 source and camera manifest",async()=>{
    const bytes=nativePng(),capture=await manifestFor(bytes);
    const verified=crayonF1ValidateNativePngManifestV61(
      capture.manifest,capture.fileName,capture.hash,608,1082);
    expect(verified.native.sha256).toBe(capture.hash);
    expect(verified.native.fileName).toBe(capture.fileName);
    expect(verified.native.variant).toBe("source-anat1-hair-edge-v57");
    expect(verified.audit.measured).toBe(0);
    expect(verified.audit.missing).toHaveLength(18);
    expect(verified.releaseApproved).toBe(false);
  });

  it("rejects mismatched screenshot bytes, wrong dimensions, edited source anchors and nonempty candidate marks",async()=>{
    const bytes=nativePng(),capture=await manifestFor(bytes);
    expect(()=>crayonF1ValidateNativePngManifestV61(
      capture.manifest,capture.fileName,"0".repeat(64),608,1082)).toThrow(RangeError);
    expect(()=>crayonF1ValidateNativePngManifestV61(
      capture.manifest,"renamed.png",capture.hash,608,1082)).toThrow(RangeError);
    expect(()=>crayonF1ValidateNativePngManifestV61(
      capture.manifest,capture.fileName,capture.hash,540,960)).toThrow(RangeError);
    const edited=JSON.parse(JSON.stringify(capture.manifest));
    edited.source.frozenPoints.face_top=[280,288];
    expect(()=>crayonF1ValidateNativePngManifestV61(
      edited,capture.fileName,capture.hash,608,1082)).toThrow(RangeError);
    const premarked=JSON.parse(JSON.stringify(capture.manifest));
    premarked.evidence.marks.face_top=[281,288];
    expect(()=>crayonF1ValidateNativePngManifestV61(
      premarked,capture.fileName,capture.hash,608,1082)).toThrow(RangeError);
    const approved=JSON.parse(JSON.stringify(capture.manifest));
    approved.artistApproved=true;
    expect(()=>crayonF1ValidateNativePngManifestV61(
      approved,capture.fileName,capture.hash,608,1082)).toThrow(RangeError);
  });

  it("only enables manual landmarks after both exact screenshot bytes and matching manifest are verified",async()=>{
    const bytes=nativePng(),capture=await manifestFor(bytes);
    const sourceBytes=nativePng(WIDTH,HEIGHT,254);
    installExactSourceHash(sourceBytes);
    const source=new File([sourceBytes],"cc0-source-608x1082.png",{type:"image/png"});
    render(<Cc0NativePngReviewWorkbenchV61/>);
    expect(screen.getByText(/upload the exact source photo, native png and matching v60 json/i)).toBeTruthy();
    expect(screen.queryByRole("button",{name:/Click the verified native PNG/})).toBeNull();
    const png=new File([bytes],capture.fileName,{type:"image/png"});
    const json=new File([JSON.stringify(capture.manifest)],
      "v60-native-candidate-V57-299.json",{type:"application/json"});
    fireEvent.change(screen.getByLabelText("Original CC0 source PNG"),{
      target:{files:[source]},
    });
    fireEvent.change(screen.getByLabelText("Native Chromium screenshot PNG"),{
      target:{files:[png]},
    });
    fireEvent.change(screen.getByLabelText("Matching V60 capture manifest JSON"),{
      target:{files:[json]},
    });
    await waitFor(()=>expect(screen.getByText(/verified native screenshot bytes/i)).toBeTruthy());
    expect(screen.getByAltText("Verified CC0 original source photo")).toBeTruthy();
    expect(screen.getByAltText("Verified native crayon candidate screenshot")).toBeTruthy();
    expect(screen.getByText(/0\/18 candidate pixel observations/)).toBeTruthy();
    expect(screen.getByRole("button",{name:/Click the verified native PNG/})).toBeTruthy();
    const sourceCamera=screen.getByTestId("crayon-f1-verified-source-camera");
    const candidateCamera=screen.getByTestId("crayon-f1-verified-candidate-camera");
    expect(sourceCamera.querySelectorAll("[data-km-crayon-f1-source-landmark]")).toHaveLength(18);
    expect(candidateCamera.querySelectorAll("[data-km-crayon-f1-source-landmark]")).toHaveLength(0);
    const canvas=screen.getByRole("button",{name:/Click the verified native PNG to mark face_top/});
    Object.defineProperty(canvas,"getBoundingClientRect",{
      value:()=>({left:20,top:35,width:304,height:541}),configurable:true,
    });
    fireEvent.click(canvas,{clientX:172,clientY:305.5});
    expect(screen.getByText(/1\/18 candidate pixel observations/)).toBeTruthy();
    const output=JSON.parse((screen.getByLabelText(
      "Verified-PNG candidate observation record") as HTMLTextAreaElement).value);
    expect(output.nativePngBytesSha256Verified).toBe(true);
    expect(output.sourcePngBytesSha256Verified).toBe(true);
    expect(output.source.sha256).toBe(CRAYON_F1_V59_SOURCE.sha256);
    expect(output.candidateMarksManuallyEntered).toBe(true);
    expect(output.reviewerIndependenceVerified).toBe(false);
    expect(output.artistApproved).toBe(false);
    expect(output.releaseApproved).toBe(false);
    expect(output.evidence.marks.face_top).toEqual([304,541]);
  },60_000);

  it("rejects a visually unrelated source PNG even when the candidate PNG and V60 sidecar match",async()=>{
    const bytes=nativePng(),capture=await manifestFor(bytes);
    const wrongSource=nativePng(WIDTH,HEIGHT,254);
    render(<Cc0NativePngReviewWorkbenchV61/>);
    fireEvent.change(screen.getByLabelText("Original CC0 source PNG"),{
      target:{files:[new File([wrongSource],"cc0-source-608x1082.png",{type:"image/png"})]},
    });
    fireEvent.change(screen.getByLabelText("Native Chromium screenshot PNG"),{
      target:{files:[new File([bytes],capture.fileName,{type:"image/png"})]},
    });
    fireEvent.change(screen.getByLabelText("Matching V60 capture manifest JSON"),{
      target:{files:[new File([JSON.stringify(capture.manifest)],
        "v60-native-candidate-V57-299.json",{type:"application/json"})]},
    });
    await waitFor(()=>expect(screen.getByText(/capture verification failed/i)).toBeTruthy());
    expect(screen.queryByAltText("Verified native crayon candidate screenshot")).toBeNull();
    expect(screen.queryByRole("button",{name:/Click the verified native PNG/})).toBeNull();
  },60_000);

  it("quarantines a mismatched file pair without displaying or accepting candidate marks",async()=>{
    const bytes=nativePng(),capture=await manifestFor(bytes);
    const sourceBytes=nativePng(WIDTH,HEIGHT,254);
    installExactSourceHash(sourceBytes);
    render(<Cc0NativePngReviewWorkbenchV61/>);
    fireEvent.change(screen.getByLabelText("Original CC0 source PNG"),{
      target:{files:[new File([sourceBytes],"cc0-source-608x1082.png",{type:"image/png"})]},
    });
    fireEvent.change(screen.getByLabelText("Native Chromium screenshot PNG"),{
      target:{files:[new File([bytes],capture.fileName,{type:"image/png"})]},
    });
    const wrong={...capture.manifest,native:{...capture.manifest.native,sha256:"0".repeat(64)}};
    fireEvent.change(screen.getByLabelText("Matching V60 capture manifest JSON"),{
      target:{files:[new File([JSON.stringify(wrong)],"wrong.json",{type:"application/json"})]},
    });
    await waitFor(()=>expect(screen.getByText(/capture verification failed/i)).toBeTruthy());
    expect(screen.queryByAltText("Verified native crayon candidate screenshot")).toBeNull();
    expect(screen.queryByRole("button",{name:/Click the verified native PNG/})).toBeNull();
    expect(screen.getByText(/0\/18 candidate pixel observations/)).toBeTruthy();
  },60_000);
});
