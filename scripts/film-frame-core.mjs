/** Resolve a requested film frame without a browser. Handles transition frames conservatively. */
export function selectFilmFrame(film, requestedFrame) {
  if (!Number.isSafeInteger(requestedFrame) || requestedFrame < 0 || requestedFrame >= film.durationFrames)
    throw RangeError(`Frame must be an integer from 0 to ${film.durationFrames - 1}`);
  const transition = film.cut?.transitions?.find(item => item.kind !== "cut" &&
    requestedFrame >= item.startFrame && requestedFrame < item.endFrame);
  const scene = film.scenes.find(item => requestedFrame >= item.startFrame && requestedFrame < item.endFrame);
  if (!scene) throw Error(`No compiled scene contains film frame ${requestedFrame}`);
  return { frame: requestedFrame, sceneId: transition?.toShotId ?? scene.id,
    transition: Boolean(transition), opening: !transition && requestedFrame === scene.startFrame };
}
