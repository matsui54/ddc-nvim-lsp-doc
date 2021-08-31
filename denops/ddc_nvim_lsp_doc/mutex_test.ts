import Mutex from "./mutex.ts";
import { assertEquals } from "./deps.ts";

Deno.test("mutex", async () => {
  const mutex = new Mutex();
  const id1 = await mutex.acquire();
  console.log(id1);
  setTimeout(() => {
    mutex.release(id1);
    console.log("released");
  }, 1000);
  const id2 = mutex.acquire();
  const id3 = mutex.acquire();
  Promise.all([id2, id3]).then((values) => {
    assertEquals(values[0], "-1");
    mutex.release(values[1]);
  });
});
