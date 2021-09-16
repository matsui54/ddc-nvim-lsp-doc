type Resolver = (id: string | null) => void;

/**
 * mutex like class
 * This is besed on https://deno.land/x/await_mutex@v1.0.1
 */
export default class Mutex {
  private acquired: boolean = false;
  private waitingResolver: Resolver = () => {};
  private isWaiting: boolean = false;
  private currentLockHolderId: string | null = null;

  /**
   * Acquires the lock, waiting if necessary for it to become free if it is already locked. The
   * returned promise is fulfilled once the lock is acquired.
   *
   * After acquiring the lock, you **must** call `release` when you are done with it.
   */
  acquire(): Promise<string | null> {
    if (!this.acquired) {
      this.acquired = true;
      this.currentLockHolderId = crypto.randomUUID();
      return Promise.resolve(this.currentLockHolderId);
    }

    return new Promise((resolve) => {
      if (this.isWaiting) {
        const resolver = this.waitingResolver;
        resolver(null);
      }
      this.isWaiting = true;
      this.waitingResolver = resolve;
    });
  }

  /**
   * Releases the lock and gives it to the waiting acquirer
   */
  release(id: string): void {
    if (!this.acquired) {
      throw new Error(`Cannot release an unacquired lock`);
    }
    if (id !== this.currentLockHolderId) {
      throw new Error(`Release ID doesn't match current lock ID`);
    }

    if (this.isWaiting) {
      this.isWaiting = false;
      const resolve = this.waitingResolver;
      this.currentLockHolderId = crypto.randomUUID();
      resolve(this.currentLockHolderId);
    } else {
      this.acquired = false;
      this.currentLockHolderId = null;
    }
  }
}
