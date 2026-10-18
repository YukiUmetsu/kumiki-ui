import { forwardRef } from "react";
import { CameraViewport3D } from "./camera-viewport-3d";
import type { CameraViewport3DProps } from "./camera-viewport-3d";
import type { CompiledCinematicCamera } from "./cinematic-camera-types";

export interface CinematicCameraDirectorProps extends Omit<CameraViewport3DProps, "timeline" | "cameraMode" | "cameraId" | "width" | "height"> {
  plan: CompiledCinematicCamera;
}
/** Controlled preview of an already compiled camera. The caller owns the MG1 clock. */
export const CinematicCameraDirector = forwardRef<HTMLDivElement, CinematicCameraDirectorProps>(function CinematicCameraDirector({ plan, ...props }, ref) {
  return <CameraViewport3D ref={ref} {...props} timeline={plan.timeline} cameraMode="pose" cameraId={plan.spec.cameraId ?? "camera3d"} width={plan.spec.output.width} height={plan.spec.output.height} />;
});
