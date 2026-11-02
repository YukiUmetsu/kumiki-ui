import { useContext } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CameraLightingQaFrame } from "../src/storybook/camera-lighting-qa";
import { CameraLightingPreviewContext } from "../registry/motion/camera-lighting-preview";

function CompatibleViewer({ physical = true }: { physical?: boolean }) {
  const preset = useContext(CameraLightingPreviewContext);
  return <div data-km-camera-viewport-3d="" data-km-physical-lights={String(physical)}>
    <output data-testid="qa-preset">{preset ? `${preset.mode}:${preset.camera.distanceFactor}` : "authored"}</output>
  </div>;
}

describe("Storybook camera and lighting QA", () => {
  it("never adds camera controls to an unrelated 2D/UI story", () => {
    render(<CameraLightingQaFrame><div>Ordinary UI</div></CameraLightingQaFrame>);
    expect(screen.queryByRole("button", { name: "Camera & lighting QA" })).toBeNull();
  });

  it("preserves authored shots until enabled, keeps edits when hidden, and restores on disable", async () => {
    render(<CameraLightingQaFrame><CompatibleViewer /></CameraLightingQaFrame>);
    const toggle = await screen.findByRole("button", { name: "Camera & lighting QA" });
    expect(screen.getByTestId("qa-preset").textContent).toBe("authored");
    fireEvent.click(toggle);
    expect(screen.getByTestId("qa-preset").textContent).toBe("preview-offset:1");
    expect(screen.getByRole("region", { name: "Storybook camera and lighting QA controls" })).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: "Camera zoom" }), { target: { value: "2" } });
    expect(screen.getByTestId("qa-preset").textContent).toBe("preview-offset:0.5");
    fireEvent.click(screen.getByRole("button", { name: "Hide controls" }));
    expect(screen.queryByRole("region", { name: "Storybook camera and lighting QA controls" })).toBeNull();
    expect(screen.getByTestId("qa-preset").textContent).toBe("preview-offset:0.5");
    fireEvent.click(screen.getByRole("button", { name: "Disable QA" }));
    expect(screen.getByTestId("qa-preset").textContent).toBe("authored");
  });

  it("disables physical lights for baked 2.5D imagery", async () => {
    render(<CameraLightingQaFrame><CompatibleViewer physical={false} /></CameraLightingQaFrame>);
    fireEvent.click(await screen.findByRole("button", { name: "Camera & lighting QA" }));
    expect((screen.getByRole("button", { name: "+ Add light" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/physical lights cannot relight pixels/i)).toBeTruthy();
  });

  it("skips the floating panel when a story already has its own inspector", async () => {
    render(<CameraLightingQaFrame><CompatibleViewer /><div data-km-camera-lighting-inspector="" /></CameraLightingQaFrame>);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Camera & lighting QA" })).toBeNull());
  });
});
