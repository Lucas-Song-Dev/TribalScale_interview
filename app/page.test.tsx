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

  it("links to example PR for repo testing and branch protection setup", () => {
    render(<Home />);
    const inline = screen.getByRole("link", {
      name: /example pull request \(\#1\)/i,
    });
    const cta = screen.getByRole("link", {
      name: /open example pr on github/i,
    });
    const href =
      "https://github.com/Lucas-Song-Dev/TribalScale_interview/pull/1";
    expect(inline).toHaveAttribute("href", href);
    expect(cta).toHaveAttribute("href", href);
  });

  it("shows reviewer scope disclaimer", () => {
    render(<Home />);
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText("For reviewers")).toBeInTheDocument();
    expect(screen.getByText(/scope creep/i)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/analyze/i)).toBeInTheDocument();
  });

  it("links to the backend walkthrough page", () => {
    render(<Home />);
    const walkthrough = screen.getByRole("link", {
      name: /open annotated backend walkthrough/i,
    });
    expect(walkthrough).toHaveAttribute("href", "/backend");
  });

  it("links to the source repository on GitHub", () => {
    render(<Home />);
    const repo = screen.getByRole("link", {
      name: /open repository on github/i,
    });
    expect(repo).toHaveAttribute(
      "href",
      "https://github.com/Lucas-Song-Dev/TribalScale_interview"
    );
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

  it("toggles results between HTML and JSON and can copy JSON", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "Ship by Friday.",
        action_items: ["Alice owns API", "Bob writes notes", "QA signs off"],
      }),
    });

    render(<Home />);
    await user.type(screen.getByRole("textbox", { name: /text to analyze/i }), "x");
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => {
      expect(screen.getByText("Ship by Friday.")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "JSON" }));
    expect(screen.getByText(/"summary": "Ship by Friday/i)).toBeInTheDocument();
    expect(screen.getByText(/"action_items"/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /copy json/i }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('"summary"');
    expect(writeText.mock.calls[0][0]).toContain("Alice owns API");

    await user.click(screen.getByRole("button", { name: "HTML" }));
    expect(screen.getByText("Ship by Friday.")).toBeInTheDocument();
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
