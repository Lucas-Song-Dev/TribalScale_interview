/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AnalysisProgress } from "./analysis-progress";

describe("AnalysisProgress", () => {
  it("renders stage label and progressbar", () => {
    render(<AnalysisProgress stageLabel="Model" />);
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Analysis progress, Model/i })
    ).toBeInTheDocument();
  });

  it("uses custom stage label in aria-label", () => {
    render(<AnalysisProgress stageLabel="GitHub" />);
    expect(
      screen.getByRole("progressbar", { name: /Analysis progress, GitHub/i })
    ).toBeInTheDocument();
  });
});
