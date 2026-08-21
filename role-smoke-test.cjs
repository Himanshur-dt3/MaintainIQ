const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const PASSWORD = "MaintainIQDemo!2026";

const users = [
  {
    role: "ADMIN",
    email: "admin@maintainiq.demo",
    home: "/admin",
  },
  {
    role: "TECHNICIAN",
    email: "technician@maintainiq.demo",
    home: "/technician",
  },
  {
    role: "REPORTER",
    email: "reporter@maintainiq.demo",
    home: "/reporter",
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push(`PASS | ${name}`);
    } catch (error) {
      results.push(`FAIL | ${name} | ${error.message}`);
    }
  }

  for (const user of users) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await test(`${user.role} login`, async () => {
      await page.goto(`${BASE}/login`, {
        waitUntil: "networkidle",
      });

      await page.locator('input[type="email"]').fill(user.email);
      await page.locator('input[type="password"]').fill(PASSWORD);
      await page.locator('button[type="submit"]').click();

      await page.waitForURL(
        (url) => !url.pathname.startsWith("/login"),
        { timeout: 10000 }
      );

      if (!page.url().includes(user.home)) {
        throw new Error(`Expected ${user.home}, got ${page.url()}`);
      }
    });

    await test(`${user.role} dashboard loads`, async () => {
      const response = await page.goto(`${BASE}${user.home}`, {
        waitUntil: "networkidle",
      });

      if (!response || response.status() !== 200) {
        throw new Error(`HTTP ${response?.status()}`);
      }

      const body = await page.locator("body").innerText();

      if (/internal server error|application error/i.test(body)) {
        throw new Error("Application error visible");
      }
    });

    await test(`${user.role} navigation links work`, async () => {
      const links = await page.locator("a[href]").evaluateAll((els) =>
        els
          .map((el) => ({
            text: (el.textContent || "").trim(),
            href: el.getAttribute("href"),
          }))
          .filter((link) => link.href)
      );

      if (!links.length) {
        throw new Error("No navigation links found");
      }

      for (const link of links) {
        if (
          link.href.startsWith("/") &&
          !link.href.startsWith("/api/")
        ) {
          const response = await page.request.get(`${BASE}${link.href}`);

          if (response.status() >= 500) {
            throw new Error(
              `${link.text || "Unnamed link"} -> ${link.href} returned ${response.status()}`
            );
          }
        }
      }
    });

    await test(`${user.role} sign-out button exists`, async () => {
      const signOut = page.getByRole("button", {
        name: /sign out/i,
      });

      if (!(await signOut.count())) {
        throw new Error("Sign out button not found");
      }
    });

    await context.close();
  }

  console.log("\n========== ROLE SMOKE TEST ==========\n");

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
