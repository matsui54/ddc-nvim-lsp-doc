import { assertEquals } from "./deps.ts";
import { trimLines } from "./util.ts";
import { findLabel, getFunctionName } from "./signature.ts";
import Mutex from "./mutex.ts";
import { Config, makeConfig } from "./config.ts";

Deno.test("test findLabel", () => {
  assertEquals(findLabel("ho", "ho", "("), -1);
  assertEquals(findLabel("hoge(", "hoge", "("), 0);
  assertEquals(findLabel("hoge(foo", "hoge", "("), 0);
  assertEquals(findLabel("hoge(foo, abc()", "hoge", "("), 0);
  assertEquals(findLabel("hoge()", "ho", "("), -1);
  assertEquals(findLabel("hoge(1, 2, 3", "hoge", "("), 0);
  assertEquals(findLabel("hoge(1, 2, foo(", "foo", "("), 11);
  assertEquals(findLabel("hoge(1); foo(", "foo", "("), 9);
  assertEquals(findLabel("   Promise<string, ", "Promise", "<"), 3);
  assertEquals(
    findLabel(
      "  assertEquals(findLabel('hoge(1, 2, 3)', 'hoge', '('), -1",
      "assertEquals",
      "(",
    ),
    2,
  );
});

Deno.test("test getFunctionName", () => {
  const triggers = [",", "(", "<"];
  assertEquals(getFunctionName(triggers, "hoge(foo: number, aaa: string)"), [
    "hoge",
    "(",
  ]);
  assertEquals(getFunctionName(triggers, "abc_xyz<T>"), ["abc_xyz", "<"]);
});

Deno.test("test trimLines", () => {
  assertEquals(trimLines(["   ", "foo", "hoge", ""]), ["foo", "hoge"]);
  assertEquals(trimLines(["foo", "hoge", ""]), ["foo", "hoge"]);
  assertEquals(trimLines(["", "foo", "hoge"]), ["foo", "hoge"]);
});

Deno.test({
  name: "test Mutex",
  async fn() {
    const mutex = new Mutex();
    const id1 = await mutex.acquire();
    if (!id1) {
      throw Error("id from acqire() is null");
    }
    setTimeout(() => {
      mutex.release(id1);
    }, 1000);
    const id2 = mutex.acquire();
    const id3 = mutex.acquire();
    Promise.all([id2, id3]).then((values) => {
      assertEquals(values[0], null);
      if (values[1]) {
        mutex.release(values[1]);
      }
    });
  },
  sanitizeOps: false,
});

Deno.test("test makeConfig", () => {
  const userconfig: unknown = {
    documentation: {
      enable: false,
      winblend: 10,
    },
    signature: {
      enable: true,
      border: "double",
      maxWidth: 100,
    },
  };
  assertEquals(makeConfig(userconfig as Config), {
    documentation: {
      enable: false,
      border: "single",
      maxWidth: 80,
      maxHeight: 30,
      supportVsnip: true,
      supportInfo: true,
      delay: 30,
      winblend: 10,
    },
    signature: {
      enable: true,
      border: "double",
      maxWidth: 100,
      maxHeight: 10,
    },
  });
});
