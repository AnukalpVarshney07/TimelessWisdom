
/* =================================
   PDF.JS CONFIGURATION
================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const PDF_PATH = "./book.pdf";

const bookElement = document.getElementById("book");
const reader = document.getElementById("reader");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const errorMessage = document.getElementById("errorMessage");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const fullscreenBtn = document.getElementById("fullscreenBtn");

let pageFlip = null;
let totalPages = 0;


/* =================================
   RENDER PDF INTO IMAGES
================================= */


let BOOK_WIDTH = 550;
let BOOK_HEIGHT = 733;

async function renderPDF() {
  const pdf = await pdfjsLib.getDocument(PDF_PATH).promise;

  totalPages = pdf.numPages;

  const images = [];

  // Detect the original dimensions of the first page.
  const firstPage = await pdf.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });

  const pageRatio = firstViewport.height / firstViewport.width;

  // Use the first page's proportions for the entire book.
  BOOK_HEIGHT = Math.round(BOOK_WIDTH * pageRatio);

  // Render at 2x resolution for better clarity.
  const targetWidth = BOOK_WIDTH * 2;
  const targetHeight = BOOK_HEIGHT * 2;

  for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);

    // Original page dimensions.
    const originalViewport = page.getViewport({ scale: 1 });

    // Calculate scale without distorting the page.
    const scale = Math.min(
      targetWidth / originalViewport.width,
      targetHeight / originalViewport.height
    );

    const viewport = page.getViewport({ scale });

    // Common canvas for every page.
    const canvas = document.createElement("canvas");

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", {
      alpha: false
    });

    // White background.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);

    // Center the original page without stretching.
    const offsetX = (targetWidth - viewport.width) / 2;
    const offsetY = (targetHeight - viewport.height) / 2;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      transform: [1, 0, 0, 1, offsetX, offsetY]
    }).promise;

    // Export high-quality image.
    images.push(canvas.toDataURL("image/jpeg", 0.94));

    // Release canvas memory.
    canvas.width = 0;
    canvas.height = 0;

    loadingText.textContent =
      `Optimizing pages... ${i}/${totalPages}`;
  }

  return images;
}


/* =================================
   UPDATE NAVIGATION
================================= */

function updateNavigation() {
  if (!pageFlip) return;

  const current = pageFlip.getCurrentPageIndex();

  pageInfo.textContent =
    `Page ${current + 1} / ${totalPages}`;

  prevBtn.disabled = current <= 0;
  nextBtn.disabled = current >= totalPages - 1;
}


/* =================================
   INITIALIZE FLIPBOOK
================================= */

async function initializeBook() {
  try {

    loadingText.textContent = "Preparing your book...";

    const images = await renderPDF();

    // Create the page-flip instance.
    pageFlip = new St.PageFlip(bookElement, {

      // Base dimensions of one page.
      width: BOOK_WIDTH,
      height: BOOK_HEIGHT,

      // Automatically adapt to container.
      size: "stretch",

      minWidth: 250,
      maxWidth: 550,

      minHeight: Math.round(250 * BOOK_HEIGHT / BOOK_WIDTH),
      maxHeight: Math.round(550 * BOOK_HEIGHT / BOOK_WIDTH),

      // Responsive orientation.
      usePortrait: true,

      // First page acts as a cover.
      showCover: true,

      // Animation.
      flippingTime: 900,
      drawShadow: true,
      maxShadowOpacity: 0.45,

      // Interaction.
      useMouseEvents: true,
      mobileScrollSupport: false,

      // Automatic sizing.
      autoSize: true,
      startPage: 0
    });

    // Load all PDF pages.
    pageFlip.loadFromImages(images);

    // Show reader.
    loading.style.display = "none";
    reader.hidden = false;

    // Update page counter after initialization.
    pageFlip.on("flip", updateNavigation);
    pageFlip.on("changeOrientation", updateNavigation);

    requestAnimationFrame(updateNavigation);

  } catch (error) {

    console.error("Flipbook error:", error);

    loading.style.display = "none";
    errorMessage.hidden = false;
  }
}


/* =================================
   PREVIOUS / NEXT BUTTONS
================================= */

prevBtn.addEventListener("click", () => {
  if (pageFlip) {
    pageFlip.flipPrev();
  }
});

nextBtn.addEventListener("click", () => {
  if (pageFlip) {
    pageFlip.flipNext();
  }
});


/* =================================
   FULLSCREEN
================================= */

fullscreenBtn.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error("Fullscreen unavailable:", error);
  }
});


/* =================================
   START
================================= */

initializeBook();