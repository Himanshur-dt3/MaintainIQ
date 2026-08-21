const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push(`PASS | ${name}`);
    } catch (error) {
      results.push(`FAIL | ${name} | ${error.message}`);
    }
  }

  await test("Login page loads", async () => {
    const response = await page.goto("http://localhost:3000/login", {
      waitUntil: "domcontentloaded",
    });

    if (!response || response.status() !== 200) {
      throw new Error(`HTTP ${response?.status()}`);
    }

    await page.waitForLoadState("networkidle");
  });

  await test("Login form exists", async () => {
    if (!(await page.locator("form").count())) {
      throw new Error("Login form not found");
    }

    if (!(await page.locator('input[type="email"]').count())) {
      throw new Error("Email input not found");
    }

    if (!(await page.locator('input[type="password"]').count())) {
      throw new Error("Password input not found");
    }

    if (!(await page.locator('button[type="submit"]').count())) {
      throw new Error("Login submit button not found");
    }
  });

  await test("Login page has no visible error initially", async () => {
    const body = await page.locator("body").innerText();

    if (/internal server error|application error/i.test(body)) {
      throw new Error("Application error visible on login page");
    }
  });

  await test("Login page links are valid", async () => {
    const links = await page.locator("a[href]").evaluateAll((els) =>
      els.map((el) => ({
        text: (el.textContent || "").trim(),
        href: el.getAttribute("href"),
      }))
    );

    if (!links.length) {
      throw new Error("No navigation links found");
    }

    for (const link of links) {
      if (!link.href) {
        throw new Error(`Empty href on "${link.text}"`);
      }
    }
  });

  console.log("\n========== PLAYWRIGHT SMOKE TEST ==========\n");

  for (const result of results) {
    console.log(result);
  }

  const failures = results.filter((r) => r.startsWith("FAIL"));

  console.log(
    `\nResult: ${results.length - failures.length}/${results.length} checks passed`
  );

  await browser.close();

  process.exit(failures.length ? 1 : 0);
})();
