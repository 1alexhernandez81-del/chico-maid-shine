import { useEffect } from "react";

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://maidforchico.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/schedule</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/refer</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/blog/spring-cleaning-checklist-chico</loc>
    <lastmod>2026-03-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/blog/how-often-deep-clean-home</loc>
    <lastmod>2026-03-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/blog/hiring-cleaning-service-chico-what-to-know</loc>
    <lastmod>2026-03-05</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/blog/pet-friendly-cleaning-tips</loc>
    <lastmod>2026-02-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://maidforchico.com/blog/move-out-cleaning-guide</loc>
    <lastmod>2026-02-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

const Sitemap = () => {
  useEffect(() => {
    document.querySelector("html")!.innerHTML = "";
    document.open("text/xml");
    document.write(SITEMAP_XML);
    document.close();
  }, []);

  return null;
};

export default Sitemap;
