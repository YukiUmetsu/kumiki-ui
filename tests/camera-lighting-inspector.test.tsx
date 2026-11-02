import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CameraLightingInspector } from "../registry/motion/camera-lighting-inspector";
import { DEFAULT_CAMERA_LIGHTING_PRESET, serializeCameraLightingPreset, type CameraLightingPreset } from "../registry/motion/camera-lighting-preset";

function Editor({ physicalLights = true, onChange = vi.fn(), initial = DEFAULT_CAMERA_LIGHTING_PRESET }: {
  physicalLights?: boolean; onChange?: (value: CameraLightingPreset) => void; initial?: CameraLightingPreset;
}) {
  const [value, setValue] = useState<CameraLightingPreset>(initial);
  return <CameraLightingInspector value={value} onChange={next => { setValue(next); onChange(next); }}
    capabilities={{ physicalLights }} onReset={() => setValue(DEFAULT_CAMERA_LIGHTING_PRESET)} />;
}

describe("portable camera and lighting inspector", () => {
  it("edits yaw, camera height and zoom via accessible controls", () => {
    const onChange = vi.fn();
    render(<Editor onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider", { name: /camera yaw/i }), { target: { value: "65" } });
    expect(onChange.mock.lastCall![0].camera.azimuthDeg).toBe(65);
    fireEvent.change(screen.getByRole("slider", { name: /camera height/i }), { target: { value: "1.5" } });
    expect(onChange.mock.lastCall![0].camera.heightOffset).toBe(1.5);
    fireEvent.change(screen.getByRole("slider", { name: /camera zoom/i }), { target: { value: "2" } });
    expect(onChange.mock.lastCall![0].camera.distanceFactor).toBe(1.5);
  });

  it("adds and removes uniquely identified physical lights", () => {
    const onChange = vi.fn();
    render(<Editor onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add light/i }));
    expect(onChange.mock.lastCall![0].lighting.lights).toHaveLength(3);
    const addedId = onChange.mock.lastCall![0].lighting.lights[2].id;
    expect(addedId).not.toBe("key");
    fireEvent.click(screen.getByRole("button", { name: `Remove ${addedId}` }));
    expect(onChange.mock.lastCall![0].lighting.lights).toHaveLength(2);
  });

  it("imports valid portable JSON and refuses invalid JSON atomically", () => {
    const onChange = vi.fn();
    render(<Editor onChange={onChange} />);
    const field = screen.getByRole("textbox", { name: /import preset json/i });
    fireEvent.change(field, { target: { value: "{bad json" } });
    fireEvent.click(screen.getByRole("button", { name: /^import json$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    expect(onChange).not.toHaveBeenCalled();
    const changed = { ...DEFAULT_CAMERA_LIGHTING_PRESET, id: "reusable-camera" };
    fireEvent.change(field, { target: { value: serializeCameraLightingPreset(changed) } });
    fireEvent.click(screen.getByRole("button", { name: /^import json$/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall![0].id).toBe("reusable-camera");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("resets an edited rig", () => {
    render(<Editor />);
    fireEvent.change(screen.getByRole("slider", { name: /camera yaw/i }), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /reset preset/i }));
    expect(screen.getByRole("slider", { name: /camera yaw/i })).toHaveValue("28");
  });

  it("explains baked-image limitations and disables physical lighting changes", () => {
    render(<Editor physicalLights={false} />);
    expect(screen.getByText(/baked image/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add light/i })).toBeDisabled();
    expect(screen.getByRole("slider", { name: /light key intensity/i })).toBeDisabled();
    expect(screen.getByRole("slider", { name: /brightness/i })).toBeEnabled();
  });

  it("disables target and lens edits while preserving the authored animation in offset mode", () => {
    render(<Editor initial={{ ...DEFAULT_CAMERA_LIGHTING_PRESET, mode: "preview-offset" }} />);
    expect(screen.getByRole("combobox", { name: /camera look-at target/i })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /camera projection/i })).toBeDisabled();
    expect(screen.getByRole("slider", { name: /field of view/i })).toBeDisabled();
    expect(screen.getByText(/lens and target follow the authored shot/i)).toBeInTheDocument();
  });
});
