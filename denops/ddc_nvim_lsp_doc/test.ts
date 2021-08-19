import {
  assertEquals,
} from "./deps.ts";
import { findParen, trimLines } from "./hover.ts";

Deno.test("findParen", () => {
  assertEquals(findParen("ho"), -1);
  assertEquals(findParen("hoge("), 4);
  assertEquals(findParen("hoge(foo"), 4);
  assertEquals(findParen("hoge(foo, abc()"), 4);
  assertEquals(findParen("hoge()"), -1);
  assertEquals(findParen("hoge(1, 2, 3)"), -1);
  assertEquals(findParen("hoge(1, 2, foo())"), -1);
  assertEquals(findParen("hoge(1); foo("), 12);
  assertEquals(findParen("hoge(1); foo()"), -1);

  assertEquals(trimLines(['   ', 'foo', 'hoge', '']), ['foo', 'hoge'])
  assertEquals(trimLines(['foo', 'hoge', '']), ['foo', 'hoge'])
  assertEquals(trimLines(['', 'foo', 'hoge']), ['foo', 'hoge'])
});
