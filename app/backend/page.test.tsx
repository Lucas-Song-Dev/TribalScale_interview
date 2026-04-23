/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BackendDocsPage from "./page";

describe("BackendDocsPage", () => {
  it("links back to the analyzer", () => {
    render(<BackendDocsPage />);
    expect(screen.getByRole("link", { name: /back to analyzer/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("lists anchored sections for navigation", () => {
    render(<BackendDocsPage />);
    const nav = screen.getByRole("navigation", {
      name: /backend documentation sections/i,
    });
    expect(nav.querySelector('a[href="#file-and-runtime"]')).toBeTruthy();
    expect(nav.querySelector('a[href="#parse-model"]')).toBeTruthy();
  });

  it("renders copy buttons for each doc block", () => {
    render(<BackendDocsPage />);
    const copies = screen.getAllByRole("button", { name: /copy block/i });
    expect(copies.length).toBeGreaterThanOrEqual(6);
  });
});
