import puppeteer from "puppeteer";

/**
 * Generate PDF from resume HTML & CSS
 */
export const generateResumePDF = async (req, res) => {
  try {
    const { html, css } = req.body;

    if (!html) {
      return res.status(400).json({ message: "HTML content is required" });
    }

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // needed for deployment
    });

    const page = await browser.newPage();

    await page.setContent(
      `<html>
        <head>
          <style>${css || ""}</style>
        </head>
        <body>${html}</body>
      </html>`,
      { waitUntil: "networkidle0" }
    );

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf",
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ message: "Failed to generate PDF", error: error.message });
  }
};
