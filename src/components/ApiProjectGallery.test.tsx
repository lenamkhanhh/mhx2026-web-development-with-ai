// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiProjectGallery } from "./ApiProjectGallery";

describe("ApiProjectGallery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads projects from the API and sends search as a query parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "portfolio",
            title: "Portfolio",
            description: "Evidence-led React portfolio",
            image: "/assets/paper-network.png",
            technologies: ["ReactJS", "TypeScript"],
            link: "https://github.com/lenamkhanhh/portfolio",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApiProjectGallery />);
    expect(await screen.findByText("Evidence-led React portfolio")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search API projects"), {
      target: { value: "react" },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/projects?q=react"));
  });
});
