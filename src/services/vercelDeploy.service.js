import axios from "axios";

const VERCEL_API = "https://api.vercel.com/v13/deployments";

/**
 * Deploy static HTML to Vercel and return the deployment URL and id.
 * @param {string} projectName - Sanitized name for the project (e.g. portfolio-username).
 * @param {string} htmlContent - Full HTML string (including <!DOCTYPE>, <head>, <body>).
 * @returns {Promise<{ url: string, id: string | null }>} Final deployment URL and Vercel deployment id (for later delete).
 */
export async function deployToVercel(projectName, htmlContent) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN is not set");
  }

  try {
    const response = await axios.post(
      VERCEL_API,
      {
        name: projectName,
        files: [
          {
            file: "index.html",
            data: htmlContent,
            encoding: "utf-8",
          },
        ],
        projectSettings: {
          framework: null,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    const deploymentId = data.id || data.uid || null;
    // Vercel may return url directly or in alias; deployment can be async
    const url = data.url || (Array.isArray(data.alias) && data.alias[0]) || data.alias;
    if (url) {
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      return { url: finalUrl, id: deploymentId };
    }
    // Fallback: build URL from deployment host/name if available
    const host = data.readyState === "READY" && data.url;
    if (host) {
      const finalUrl = host.startsWith("http") ? host : `https://${host}`;
      return { url: finalUrl, id: deploymentId };
    }
    throw new Error("Deployment succeeded but no URL returned");
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
    console.error("Vercel deploy error:", err.response?.data || err.message);
    throw new Error(msg || "Deployment failed");
  }
}

/**
 * Delete a deployment from Vercel by id.
 * @param {string} deploymentId - Vercel deployment id (e.g. dpl_xxx).
 * @returns {Promise<void>}
 */
export async function deleteFromVercel(deploymentId) {
  if (!deploymentId) return;
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn("VERCEL_TOKEN is not set; skipping Vercel delete");
    return;
  }
  try {
    await axios.delete(`${VERCEL_API}/${deploymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message;
    if (status === 404 || status === 410) {
      return;
    }
    console.error("Vercel delete deployment error:", msg);
    throw new Error(msg || "Failed to delete deployment from Vercel");
  }
}

/**
 * Escape HTML for safe injection into static HTML.
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
  if (s == null || s === undefined) return "";
  const str = String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate full static portfolio HTML from portfolio data (Tailwind CDN, Portfolio 1 layout).
 * @param {Object} d - Portfolio data: name, role, summary, skills[], experience[], projects[], education, email, phone, linkedin, website, etc.
 * @returns {string} Full HTML document string.
 */
export function generatePortfolioHTML(d) {
  const name = d?.name || "Your Name";
  const role = d?.role || "Your Role";
  const summary = esc(d?.summary || "");
  const skills = Array.isArray(d?.skills) ? d.skills.filter(Boolean) : [];
  const experience = Array.isArray(d?.experience) ? d.experience : [];
  const projects = Array.isArray(d?.projects) ? d.projects.filter(Boolean) : [];
  const education = esc(d?.education || "");
  const email = esc(d?.email || "");
  const phone = esc(d?.phone || "");
  const linkedin = esc(d?.linkedin || "https://linkedin.com");
  const website = esc(d?.website || "");
  const initials = name.split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "P";
  const firstName = name.split(/\s+/)[0] || "Portfolio";

  const expItems = experience.map((e) => {
    if (typeof e === "string") return { role: esc(e), bullets: [] };
    return {
      role: esc(e?.role || ""),
      bullets: (Array.isArray(e?.bullets) ? e.bullets : []).map((b) => esc(typeof b === "string" ? b : String(b))),
    };
  });

  const skillsHtml =
    skills.length > 0
      ? `
    <section id="skills" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <h2 class="text-2xl sm:text-3xl font-bold text-black mb-8">Skills</h2>
      <ul class="flex flex-wrap gap-3">
        ${skills.map((s) => `<li><span class="inline-block rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-800 px-4 py-2 text-sm font-medium">${esc(s)}</span></li>`).join("")}
      </ul>
    </section>`
      : "";

  const experienceHtml =
    expItems.length > 0
      ? `
    <section id="experience" class="bg-neutral-50 border-y border-neutral-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 class="text-2xl sm:text-3xl font-bold text-black mb-10">Experience</h2>
        <ul class="space-y-10">
          ${expItems
            .map(
              (item) => `
          <li class="border-l-2 border-emerald-500 pl-6">
            <h3 class="text-lg font-semibold text-black">${item.role}</h3>
            ${item.bullets.length ? `<ul class="mt-3 space-y-2 text-neutral-600 text-sm sm:text-base">${item.bullets.map((b) => `<li class="flex gap-2"><span class="text-emerald-500 shrink-0">•</span><span>${b}</span></li>`).join("")}</ul>` : ""}
          </li>`
            )
            .join("")}
        </ul>
      </div>
    </section>`
      : "";

  const projectsHtml =
    projects.length > 0
      ? `
    <section id="projects" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <h2 class="text-2xl sm:text-3xl font-bold text-black mb-10">Projects</h2>
      <ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${projects.map((p) => `<li class="rounded-xl border-2 border-neutral-200 bg-white p-6 hover:border-emerald-500 transition-colors"><p class="text-neutral-700 text-sm sm:text-base leading-relaxed">${esc(p)}</p></li>`).join("")}
      </ul>
    </section>`
      : "";

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(name)} – Portfolio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{font-family:system-ui,sans-serif;}</style>
</head>
<body class="min-h-screen bg-white text-neutral-900">
  <header class="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <a href="#home" class="flex items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-bold">${esc(firstName[0]?.toUpperCase() || "P")}</span>
        <span class="text-lg font-semibold text-black">${esc(firstName)}</span>
      </a>
      <nav class="hidden sm:flex items-center gap-8">
        <a href="#home" class="text-sm font-medium text-neutral-600 hover:text-black">Home</a>
        <a href="#about" class="text-sm font-medium text-neutral-600 hover:text-black">About</a>
        <a href="#skills" class="text-sm font-medium text-neutral-600 hover:text-black">Skills</a>
        <a href="#experience" class="text-sm font-medium text-neutral-600 hover:text-black">Experience</a>
        <a href="#projects" class="text-sm font-medium text-neutral-600 hover:text-black">Projects</a>
        <a href="#contact" class="text-sm font-medium text-neutral-600 hover:text-black">Contact</a>
      </nav>
    </div>
  </header>
  <main>
    <section id="home" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <p class="inline-block rounded-lg border-2 border-emerald-500 bg-black text-white px-4 py-2 mb-6 text-sm font-medium">Hi, I'm ${esc(name)}</p>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-black tracking-tight leading-tight">${esc(role)}</h1>
          ${summary ? `<p class="mt-5 text-neutral-600 text-base sm:text-lg leading-relaxed max-w-xl">${summary}</p>` : ""}
          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a href="${email ? `mailto:${email}` : "#contact"}" class="inline-flex items-center gap-2 rounded-lg border-2 border-emerald-500 bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-neutral-800">Get in touch</a>
            <a href="#contact" class="inline-flex items-center gap-2 text-black font-medium hover:underline">Download CV</a>
          </div>
          <div class="mt-10">
            <p class="text-sm text-neutral-500 mb-3">Find me on</p>
            <div class="flex items-center gap-3">
              ${email ? `<a href="mailto:${email}" class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-neutral-300 text-neutral-600 hover:border-emerald-500 hover:text-emerald-600" aria-label="Email">Email</a>` : ""}
              ${phone ? `<a href="tel:${phone}" class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-neutral-300 text-neutral-600 hover:border-emerald-500 hover:text-emerald-600" aria-label="Phone">Phone</a>` : ""}
              <a href="${linkedin}" target="_blank" rel="noopener noreferrer" class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white hover:opacity-90" aria-label="LinkedIn">LN</a>
            </div>
          </div>
        </div>
        <div class="relative flex justify-center lg:justify-end">
          <div class="relative">
            <div class="absolute -top-4 -left-4 w-14 h-16 border-l-2 border-t-2 border-black rounded-tl-lg" aria-hidden></div>
            <div class="relative w-56 h-72 sm:w-72 sm:h-96 rounded-xl border-2 border-black bg-neutral-100 flex items-center justify-center overflow-hidden">
              <span class="text-6xl sm:text-7xl font-bold text-neutral-400">${esc(initials)}</span>
            </div>
            <div class="absolute -bottom-6 -right-6 w-40 h-40 sm:w-52 sm:h-52 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-emerald-500/90 -z-10" aria-hidden></div>
          </div>
        </div>
      </div>
    </section>
    <section id="about" class="bg-neutral-50 border-y border-neutral-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 class="text-2xl sm:text-3xl font-bold text-black mb-6">About</h2>
        <p class="text-neutral-600 text-base sm:text-lg leading-relaxed max-w-3xl">${summary || "Professional with a focus on delivering results and continuous growth."}</p>
        ${education ? `<div class="mt-8"><h3 class="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-2">Education</h3><p class="text-neutral-700">${education}</p></div>` : ""}
      </div>
    </section>
    ${skillsHtml}
    ${experienceHtml}
    ${projectsHtml}
    <section id="contact" class="bg-neutral-900 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 class="text-2xl sm:text-3xl font-bold mb-6">Let's work together</h2>
        <p class="text-neutral-300 max-w-xl mb-10">Have a project in mind or want to connect? Reach out via email or phone.</p>
        <div class="flex flex-wrap gap-6">
          ${email ? `<a href="mailto:${email}" class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-600">${email}</a>` : ""}
          ${phone ? `<a href="tel:${phone}" class="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-5 py-3 text-sm font-medium hover:bg-white/10">${phone}</a>` : ""}
          ${website ? `<a href="${website.startsWith("http") ? website : "https://" + website}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-5 py-3 text-sm font-medium hover:bg-white/10">Website</a>` : ""}
        </div>
      </div>
    </section>
  </main>
  <footer class="border-t border-neutral-200 bg-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
      <p>© ${year} ${esc(name)}. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <a href="#home" class="hover:text-black">Home</a>
        <a href="#about" class="hover:text-black">About</a>
        <a href="#skills" class="hover:text-black">Skills</a>
        <a href="#experience" class="hover:text-black">Experience</a>
        <a href="#projects" class="hover:text-black">Projects</a>
        <a href="#contact" class="hover:text-black">Contact</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}
