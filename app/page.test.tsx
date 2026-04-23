/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Home from "./page";

describe("Home page", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows reviewer scope disclaimer", () => {
    render(<Home />);
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("Reviewer note (scope)")).toBeInTheDocument();
    expect(screen.getByText(/not part of the take-home/i)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/analyze/i)).toBeInTheDocument();
  });

  it("disables submit when textarea is empty", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: "Analyze" })).toBeDisabled();
  });

  it("loads sample meeting transcript into the textarea when clicked", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(
      screen.getByRole("button", { name: /load meeting example/i })
    );
    const box = screen.getByRole("textbox", {
      name: /text to analyze/i,
    }) as HTMLTextAreaElement;
    expect(box.value).toContain("Sarah (PM): Okay let's get started");
    expect(box.value).toContain("Marcus");
  });

  it("submits text and renders summary and action items on success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "Ship by Friday.",
        action_items: ["Alice owns API", "Bob writes notes", "QA signs off"],
      }),
    });

    render(<Home />);
    await user.type(
      screen.getByRole("textbox", { name: /text to analyze/i }),
      "Meeting notes about release."
    );
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Ship by Friday.")).toBeInTheDocument();
    });
    expect(screen.getByText("Alice owns API")).toBeInTheDocument();
    expect(screen.getByText("Bob writes notes")).toBeInTheDocument();
    expect(screen.getByText("QA signs off")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Meeting notes about release." }),
      })
    );
  });

  it("shows API error message when response is not ok", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "text must not be empty" }),
    });

    render(<Home />);
    await user.type(screen.getByRole("textbox"), "x");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "text must not be empty"
      );
    });
  });

  it("shows network error when fetch throws", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new Error("offline"));

    render(<Home />);
    await user.type(screen.getByRole("textbox"), "x");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });
});
