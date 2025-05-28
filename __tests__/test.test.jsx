import { render, screen } from "@testing-library/react";

describe("Test Component", () => {
  test("renders successfully", () => {
    render(<div>Hello Test</div>);
    expect(screen.getByText("Hello Test")).toBeInTheDocument();
  });
});
