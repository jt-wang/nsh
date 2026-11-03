// What a layout animation removes fades out, also when the app released it in the same update: run this directory with
// `nsh test --target ios` and `--target android`. The red block is a child of what is removed, so it must stay on screen
// with its parent. Nothing else changes, so two pictures differ only while it fades. A press waits about two seconds
// for the app to settle, so the fade takes eight.
import { expect, open, test } from "nsh/test";

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

test("a removed view and its children stay on screen while they fade out", async () => {
  const app = await open("./App.tsx");
  await app.press("id:swap");
  const fading = await app.screenshot();
  await app.wait(8000);
  const gone = await app.screenshot();
  await app.wait(300);
  const stillGone = await app.screenshot();
  expect(same(gone, stillGone)).toBe(true); // the check can say yes
  expect(same(fading, gone)).toBe(false);
});
