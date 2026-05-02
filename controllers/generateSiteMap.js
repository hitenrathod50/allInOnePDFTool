const { SitemapStream, streamToPromise } = require("sitemap");
const { createWriteStream, existsSync, mkdirSync } = require("fs");
const path = require("path");

async function generateSitemap() {
  try {
    // 🔥 FIX: go one level up from controllers
    const dirPath = path.join(__dirname, "..", "public");

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    const sitemapPath = path.join(dirPath, "sitemap.xml");

    const stream = new SitemapStream({
      hostname: "https://pdfversatile.com",
    });

    const writeStream = createWriteStream(sitemapPath);
    stream.pipe(writeStream);

    // Static pages
    // ⭐ Homepage (highest priority)
stream.write({ url: "/", changefreq: "daily" });

// 🔥 Core tools (most important features)
stream.write({ url: "/merge-pdf", changefreq: "daily" });
stream.write({ url: "/split-pdf", changefreq: "daily" });
stream.write({ url: "/compress-pdf", changefreq: "daily" });
stream.write({ url: "/imagetopdf", changefreq: "daily" });
stream.write({ url: "/word-to-pdf", changefreq: "daily" });

// ⚙️ Secondary tools
stream.write({ url: "/excel-to-pdf", changefreq: "daily" });
stream.write({ url: "/powerpoint-to-pdf", changefreq: "daily" });
stream.write({ url: "/html-to-pdf", changefreq: "daily" });
stream.write({ url: "/odt-to-pdf", changefreq: "daily" });
stream.write({ url: "/extract-pdf-pages", changefreq: "daily" });

// 🧰 Editing tools
stream.write({ url: "/edit-pdf-pages", changefreq: "daily" });
stream.write({ url: "/rotate-pages", changefreq: "daily" });
stream.write({ url: "/add-page-numbers", changefreq: "daily" });
stream.write({ url: "/add-pages-pdf", changefreq: "daily" });
stream.write({ url: "/remove-pages", changefreq: "daily" });

// 🔐 Utility tools
stream.write({ url: "/add-watermark", changefreq: "daily" });
stream.write({ url: "/protect-pdf", changefreq: "daily" });
stream.write({ url: "/unlock-pdf", changefreq: "daily" });

// 📄 Legal / Info pages (low SEO priority)
stream.write({ url: "/about", changefreq: "daily" });
stream.write({ url: "/contact", changefreq: "daily" });
stream.write({ url: "/privacy", changefreq: "daily" });
stream.write({ url: "/terms-conditions", changefreq: "daily" });

    stream.end();

    await streamToPromise(stream);

    console.log("✅ Sitemap generated at /public/sitemap/sitemap.xml");
  } catch (err) {
    console.error("❌ Error generating sitemap:", err);
  }
}

module.exports = generateSitemap;