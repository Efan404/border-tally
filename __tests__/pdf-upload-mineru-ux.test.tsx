import { fireEvent, render, screen } from "@testing-library/react";

import { PDFUpload } from "../components/pdf-upload";
import { parsePDF } from "../lib/pdf-parser";

jest.mock("../lib/pdf-parser", () => ({
  parsePDF: jest.fn(),
}));

describe("PDFUpload MinerU UX", () => {
  test("closes the confirmation dialog and shows the parsing state after confirm", async () => {
    const parsePDFMock = parsePDF as jest.MockedFunction<typeof parsePDF>;
    parsePDFMock.mockImplementation(
      () => new Promise(() => undefined)
    );

    render(<PDFUpload onParseComplete={jest.fn()} />);

    fireEvent.click(screen.getByRole("checkbox"));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["pdf"], "records.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("确认使用增强解析？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "确认上传并解析" }));

    expect(screen.queryByText("确认使用增强解析？")).not.toBeInTheDocument();
    expect(await screen.findByText("正在解析文件...")).toBeInTheDocument();
  });
});
