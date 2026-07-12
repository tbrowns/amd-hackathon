import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ImageUploader } from "@/components/assessment/image-uploader";
import { LanguageProvider } from "@/components/providers/language-provider";
import type { DemoScenario } from "@/lib/demo";

function Harness({ allowDemo }: { allowDemo: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [scenario, setScenario] = useState<DemoScenario | null>(null);
  return <LanguageProvider><ImageUploader files={files} onChange={setFiles} scenario={scenario} onScenario={setScenario} allowDemo={allowDemo} /></LanguageProvider>;
}

describe("ImageUploader", () => {
  it("previews a valid selected image", async () => {
    const user = userEvent.setup();
    render(<Harness allowDemo={false} />);
    const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], "tomato-leaf.jpg", { type: "image/jpeg" });

    await user.upload(screen.getByLabelText("Choose crop photos"), image);

    expect(screen.getByText("tomato-leaf.jpg")).toBeInTheDocument();
    expect(screen.getByAltText("Crop photo 1")).toBeInTheDocument();
    expect(screen.queryByText("or try a demo")).not.toBeInTheDocument();
  });

  it("shows demo fixtures only when the runtime permits them", () => {
    const { unmount } = render(<Harness allowDemo={false} />);
    expect(screen.queryByText("Tomato leaf spots")).not.toBeInTheDocument();
    unmount();

    render(<Harness allowDemo />);
    expect(screen.getByText("Tomato leaf spots")).toBeInTheDocument();
    expect(screen.getByText("Onion discoloration")).toBeInTheDocument();
    expect(screen.getByText("Kale pest damage")).toBeInTheDocument();
  });
});
