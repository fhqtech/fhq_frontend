import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileDropzone } from "./FileDropzone";

function mkFile(name: string, type = "application/pdf", size = 1000) {
  return new File(["x".repeat(size)], name, { type });
}

describe("FileDropzone", () => {
  it("adds selected files (multiple) via onChange", () => {
    const onChange = vi.fn();
    render(<FileDropzone files={[]} onChange={onChange} accept={[".pdf"]} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mkFile("a.pdf"), mkFile("b.pdf")] } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(2);
    expect(onChange.mock.calls[0][0][0].name).toBe("a.pdf");
  });

  it("renders a removable chip per file", () => {
    const onChange = vi.fn();
    render(<FileDropzone files={[mkFile("a.pdf"), mkFile("b.pdf")]} onChange={onChange} accept={[".pdf"]} />);
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByText("b.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Remove a.pdf"));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: "b.pdf" })]);
  });

  it("rejects a type not in accept and shows an error", () => {
    const onChange = vi.fn();
    render(<FileDropzone files={[]} onChange={onChange} accept={[".pdf"]} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mkFile("bad.exe", "application/x-msdownload")] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/isn't an accepted type/i)).toBeInTheDocument();
  });
});
