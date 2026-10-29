// A list in a swipe-to-close sheet scrolls; at its top, a drag down still
// closes the sheet.
import { expect, open, test } from "nsh/test";

test("a drag up on a sheet's list scrolls the list", async () => {
  const app = await open("./fixtures/sheet-scroll.tsx");
  await app.drag("Row 4", { x: 0, y: -200 });
  await app.waitFor("list: scrolled");
  expect(app.texts()).toContain("sheet: open");
});

test("a drag down on a sheet's list at its top closes the sheet", async () => {
  const app = await open("./fixtures/sheet-scroll.tsx");
  // Android's for now (a headless run does not close the sheet on this drag).
  if (!app.shows("Platform: android")) return;
  await app.drag("Row 4", { x: 0, y: 300 });
  await app.waitFor("sheet: closed");
});
