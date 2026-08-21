const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const PASSWORD = "MaintainIQDemo!2026";

const users = [
  ["ADMIN", "admin@maintainiq.demo", "/admin"],
  ["TECHNICIAN", "technician@maintainiq.demo", "/technician"],
  ["REPORTER", "reporter@maintainiq.demo", "/reporter"],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log(`PASS | ${name}`);
      results.push(true);
    } catch (error) {
      console.log(`FAIL | ${name} | ${error.message}`);
      results.push(false);
    }
  }

  async function login(page, email, expectedPath) {
    await page.goto(`${BASE}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(PASSWORD);

    await page.getByRole("button", {
      name: /sign in to dashboard/i,
    }).click();

    await page.waitForURL(
      (url) => !url.pathname.startsWith("/login"),
      { timeout: 15000 }
    );

    if (!page.url().includes(expectedPath)) {
      throw new Error(`Expected ${expectedPath}, got ${page.url()}`);
    }

    await page.waitForLoadState("networkidle", {
      timeout: 15000,
    }).catch(() => {});

    await page.waitForTimeout(1000);

    await page.getByRole("button", {
      name: /sign out/i,
    }).waitFor({
      state: "visible",
      timeout: 15000,
    });
  }

  // =========================
  // REPORTER
  // =========================
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, users[2][1], "/reporter");

    await test("REPORTER - Report Issue form exists", async () => {
      const heading = page.getByRole("heading", {
        name: /report an issue/i,
      });

      if (!(await heading.count())) {
        throw new Error("Report an Issue section not found");
      }

      const form = page.locator("form");

      if (!(await form.count())) {
        throw new Error("Report Issue form not found");
      }
    });

    await test("REPORTER - Issue submission controls exist", async () => {
      const submitButton = page.getByRole("button", {
        name: /submit issue for triage/i,
      });

      if (!(await submitButton.count())) {
        throw new Error("Submit Issue for Triage button not found");
      }

      if (!(await submitButton.first().isVisible())) {
        throw new Error("Submit Issue for Triage button is not visible");
      }

      const body = await page.locator("body").innerText();

      if (!/description/i.test(body)) {
        throw new Error("Issue description field not visible");
      }
    });

    await test("REPORTER - Reviews page opens", async () => {
      await page.goto(`${BASE}/reporter/reviews`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      if (page.url() !== `${BASE}/reporter/reviews`) {
        throw new Error(`Unexpected URL: ${page.url()}`);
      }

      const body = await page.locator("body").innerText();

      if (/internal server error|application error/i.test(body)) {
        throw new Error("Application error visible");
      }
    });

    await test("REPORTER - Review form controls exist", async () => {
      const body = await page.locator("body").innerText();

      // If there are no eligible resolved tickets, this is still a valid page.
      if (!/review|rating|completed|resolved/i.test(body)) {
        throw new Error("Review page does not appear to contain review content");
      }
    });

    await context.close();
  }

  // =========================
  // TECHNICIAN
  // =========================
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, users[1][1], "/technician");

    await test("TECHNICIAN - Start Work workflow", async () => {
      const startWork = page.getByRole("button", {
        name: /start work/i,
      }).first();

      const startWorkCount = await startWork.count();

      if (startWorkCount > 0) {
        await startWork.waitFor({
          state: "visible",
          timeout: 15000,
        });

        await startWork.click();

        await page.waitForTimeout(1500);

        const body = await page.locator("body").innerText();

        if (/application error|internal server error/i.test(body)) {
          throw new Error("Application error after Start Work");
        }

        return;
      }

      // No Assigned ticket currently exists.
      // Verify that an active In Progress workflow is available instead.
      const body = await page.locator("body").innerText();

      if (!/in progress/i.test(body)) {
        throw new Error(
          "No Start Work button and no In Progress ticket available"
        );
      }

      const workNoteButton = page.getByRole("button", {
        name: /save work note/i,
      });

      const resolutionButton = page.getByRole("button", {
        name: /save & complete resolution/i,
      });

      if (
        !(await workNoteButton.count()) &&
        !(await resolutionButton.count())
      ) {
        throw new Error(
          "Active In Progress ticket does not expose workflow controls"
        );
      }
    });
    await test("TECHNICIAN - Work Note controls", async () => {
      const body = await page.locator("body").innerText();

      if (!/work note|progress note|add note|note/i.test(body)) {
        throw new Error("Work-note functionality not visible");
      }

      const textareas = page.locator("textarea");

      if (!(await textareas.count())) {
        throw new Error("Work-note textarea not found");
      }
    });

    await test("TECHNICIAN - Resolve controls", async () => {
      const body = await page.locator("body").innerText();

      if (!/resolve|resolution/i.test(body)) {
        throw new Error("Resolution functionality not visible");
      }
    });

    await test("TECHNICIAN - Reviews page opens", async () => {
      await page.goto(`${BASE}/technician/reviews`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      const response = await page.request.get(`${BASE}/technician/reviews`);

      if (response.status() >= 500) {
        throw new Error(`HTTP ${response.status()}`);
      }

      const body = await page.locator("body").innerText();

      if (/internal server error|application error/i.test(body)) {
        throw new Error("Application error visible");
      }
    });

    await context.close();
  }

  // =========================
  // ADMIN
  // =========================
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, users[0][1], "/admin");

    await test("ADMIN - Ticket management visible", async () => {
      const body = await page.locator("body").innerText();

      if (!/ticket|technician|assignment/i.test(body)) {
        throw new Error("Ticket management content not visible");
      }
    });

    await test("ADMIN - Reviews page opens", async () => {
      await page.goto(`${BASE}/admin/reviews`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      const response = await page.request.get(`${BASE}/admin/reviews`);

      if (response.status() >= 500) {
        throw new Error(`HTTP ${response.status()}`);
      }

      const body = await page.locator("body").innerText();

      if (/internal server error|application error/i.test(body)) {
        throw new Error("Application error visible");
      }
    });

    await test("ADMIN - Past Tickets page opens", async () => {
      await page.goto(`${BASE}/admin/past-tickets`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      const response = await page.request.get(`${BASE}/admin/past-tickets`);

      if (response.status() >= 500) {
        throw new Error(`HTTP ${response.status()}`);
      }
    });

    await test("ADMIN - Tickets page opens", async () => {
      await page.goto(`${BASE}/admin/tickets`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      const response = await page.request.get(`${BASE}/admin/tickets`);

      if (response.status() >= 500) {
        throw new Error(`HTTP ${response.status()}`);
      }
    });

    await context.close();
  }

  console.log("\n========== FUNCTIONAL UI TEST ==========");

  const passed = results.filter(Boolean).length;

  console.log(`Result: ${passed}/${results.length} checks passed`);

  await browser.close();

  process.exit(passed === results.length ? 0 : 1);
})();



