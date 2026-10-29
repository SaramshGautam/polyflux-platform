import { openBlobPreview } from "./AIChatPanel";

describe("AIChatPanel PDF preview flow", () => {
  test("uses Google Docs viewer for PDFs instead of a blank page", async () => {
    const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

    await openBlobPreview("https://example.com/file.pdf", "file.pdf");

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      "https://docs.google.com/gview?embedded=true&url=https%3A%2F%2Fexample.com%2Ffile.pdf",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
