// UIKit's bar keeps the width of a custom view that changes while a page is
// pushed: run this directory with `nsh test --target ios`. The press goes
// through the platform's input, so a view pushed out of the item fails it.
import { open, test } from "nsh/test";

async function pressesMore(button: string, first = 1) {
  const app = await open("./HeaderGrow.tsx");
  await app.press(`id:${button}`);
  await app.wait(1000);
  await app.press("id:more");
  await app.waitFor(`text:presses:${first}`);
  return app;
}

test("a header item that grows while its page is pushed stays whole", async () => {
  await pressesMore("push-grow");
});

test("a header item that grows and shrinks while its page is pushed stays whole", async () => {
  await pressesMore("push-grow-shrink");
});

test("a header item that grows on a page already shown stays whole", async () => {
  const app = await pressesMore("push");
  await app.press("id:later");
  await app.waitFor("text:2/3 48%");
  await app.wait(300);
  await app.press("id:more");
  await app.waitFor("text:presses:2");
});
