import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Story } from "@/types/story";

export async function exportBookToPdf(story: Story, container: HTMLElement) {
  const pageEls = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  if (!pageEls.length) return;

  const first = pageEls[0];
  const w = first.offsetWidth;
  const h = first.offsetHeight;
  const pdf = new jsPDF({
    orientation: w > h ? "landscape" : "portrait",
    unit: "px",
    format: [w, h],
  });

  for (let i = 0; i < pageEls.length; i++) {
    const canvas = await html2canvas(pageEls[i], {
      backgroundColor: "#fbf6e9",
      scale: 2,
      useCORS: true,
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage([w, h], w > h ? "landscape" : "portrait");
    pdf.addImage(img, "JPEG", 0, 0, w, h);
  }
  pdf.save(`${story.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
