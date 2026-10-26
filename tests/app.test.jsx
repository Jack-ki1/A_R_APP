import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import BreakoutRadarMVP from "../src/App.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const byText = (sel, txt) => $$(sel).find((e) => e.textContent.trim().startsWith(txt));
const setValue = (el, value) => {
  const proto = el instanceof window.HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new window.Event(el instanceof window.HTMLSelectElement ? "change" : "input", { bubbles: true }));
};
const rankedRows = () => $$(".card").find((c) => c.textContent.includes("Today's breakouts") && c.querySelector("table")).querySelectorAll("tbody tr").length;
const clean = () => !/NaN|undefined|Infinity/.test(document.body.textContent);

let root, host;
beforeEach(async () => {
  window.localStorage.clear();
  host = document.createElement("div"); document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<BreakoutRadarMVP />); });
});
afterEach(async () => { await act(async () => { root.unmount(); }); host.remove(); });

describe("Discovery", () => {
  it("opens dark by default with the hero, six tiles, signals, movers, map, plot and gauge", () => {
    expect(document.querySelector(".br").getAttribute("data-theme")).toBe("dark");
    expect(document.querySelector(".hero svg.art")).toBeTruthy();
    expect($$(".tile")).toHaveLength(6);
    expect($$(".sigcard").length).toBeGreaterThanOrEqual(4);
    expect($$(".mm").length).toBeGreaterThanOrEqual(4);
    expect($$("svg[aria-label^='Map of Africa'] g[role=button]").length).toBeGreaterThanOrEqual(9);
    expect(document.querySelector("svg[aria-label='Breakout index against audience size']")).toBeTruthy();
    expect(document.querySelector("svg[aria-label='Integrity mix of tracked artists']")).toBeTruthy();
    expect(rankedRows()).toBe(9);
    expect(clean()).toBe(true);
  });
  it("shows only three sidebar sections", () => {
    expect($$(".br-navbtn").map((b) => b.textContent.replace(/\d+$/, "").trim())).toEqual(["Discovery", "Analyse", "Recommendations"]);
  });
  it("runs the sweep and reveals three new prospects", async () => {
    await act(async () => { byText("button", "Run sweep").click(); });
    for (let i = 0; i < 10; i++) await act(async () => { await sleep(120); });
    expect(document.body.textContent).toContain("3 new prospects added");
    expect(rankedRows()).toBe(12);
    expect(clean()).toBe(true);
  });
  it("filters by country and by the search box", async () => {
    await act(async () => { byText("button.pill", "UG").click(); });
    expect(rankedRows()).toBeLessThan(9);
    await act(async () => { byText("button", "Clear filters").click(); });
    await act(async () => { setValue(document.querySelector(".searchbox input"), "amapiano"); });
    expect(rankedRows()).toBe(1);
  });
  it("adds to the shortlist and degrades gracefully when identity lookup is blocked", async () => {
    await act(async () => { byText("button.linkbtn", "Pwani Static").click(); });
    await act(async () => { byText("button", "Add to shortlist").click(); });
    expect(document.body.textContent).toContain("Remove from shortlist");
    globalThis.fetch = async () => { throw new Error("blocked"); };
    await act(async () => { setValue(document.getElementById("mbq"), "test"); });
    await act(async () => { byText("button", "Search").click(); await sleep(30); });
    expect(document.body.textContent).toContain("Live lookup is not available");
  });
});

describe("Analyse", () => {
  const goAnalyse = async () => { await act(async () => { byText("button.br-navbtn", "Analyse").click(); }); };
  it("renders the weekly review visuals without bad numbers", async () => {
    await goAnalyse();
    expect($$(".scorechip")).toHaveLength(5);
    expect(document.querySelector("svg[aria-label='Total audience across platforms']")).toBeTruthy();
    expect(document.querySelector("svg[aria-label='Net new audience per week']")).toBeTruthy();
    expect($$("svg[aria-label^='Audience by country']")).toHaveLength(2);
    expect(document.querySelector("svg[aria-label$='weekly growth by platform']")).toBeTruthy();
    for (const t of ["Artistic quality", "Trail", "This week"]) {
      await act(async () => { byText("button[role=tab]", t).click(); });
      expect(clean(), t).toBe(true);
    }
  });
  it("saves a complete review, then holds Faida in Recommendations despite the praise", async () => {
    await goAnalyse();
    await act(async () => { byText("button.listbtn", "Faida").click(); });
    await act(async () => { byText("button[role=tab]", "Artistic quality").click(); });
    const save = () => byText("button", "Save ");
    expect(save().disabled).toBe(true);
    for (const d of ["song", "voc", "key", "prod", "orig", "live", "cat", "auth"]) await act(async () => { document.getElementById(`KE-0166-grace-${d}-5`).click(); });
    expect(save().disabled).toBe(false);
    await act(async () => { save().click(); });
    expect(document.body.textContent).toMatch(/of 100, 1 reviewer/);
    await act(async () => { byText("button.br-navbtn", "Recommendations").click(); });
    expect(document.body.textContent).toContain("Hold: integrity");
  });
  it("steps back a week with point-in-time data", async () => {
    await goAnalyse();
    await act(async () => { document.querySelector("button[aria-label='Previous week']").click(); });
    expect(document.body.textContent).toContain("Viewing a past week");
    expect(clean()).toBe(true);
  });
});

describe("Recommendations", () => {
  const goRecs = async () => { await act(async () => { byText("button.br-navbtn", "Recommendations").click(); }); };
  it("shows the pipeline, verdict mix and a Pursue verdict", async () => {
    await goRecs();
    expect($$(".funnel .st")).toHaveLength(5);
    expect(document.querySelector("svg[aria-label='Verdicts across the shortlist']")).toBeTruthy();
    expect(document.body.textContent).toContain("Pursue now");
    expect(clean()).toBe(true);
  });
  it("answers grounded questions and respects the slot capacity", async () => {
    await goRecs();
    for (let i = 0; i < 4; i++) {
      await act(async () => { $$(".suggest button")[i].click(); });
      expect($$(".chat .bubble li").length).toBeGreaterThanOrEqual(2);
      expect(document.querySelector(".chat").textContent).not.toMatch(/NaN|undefined/);
    }
    await act(async () => { setValue(document.getElementById("cap"), "1"); });
    expect(document.body.textContent).toMatch(/1 of 1 slot/);
  });
  it("logs an accepted decision and demands a reason for an override", async () => {
    await goRecs();
    await act(async () => { $$("button").find((b) => b.textContent === "Accept").click(); });
    expect(document.body.textContent).toMatch(/Accepted:/);
    await act(async () => { $$("button").find((b) => b.textContent === "Override").click(); });
    expect(byText("button", "Log override").disabled).toBe(true);
  });
  it("lists blocked sources in the ledger and toggles the theme", async () => {
    await act(async () => { byText("button", "Source ledger").click(); });
    expect(document.body.textContent).toContain("Blocked from scoring");
    await act(async () => { byText("button", "Close").click(); });
    await act(async () => { document.querySelector("button[aria-label*='theme']").click(); });
    expect(document.querySelector(".br").getAttribute("data-theme")).toBe("light");
  });
});
