type Resolver = (id: string | null) => void;

/**
 * A mutex lock for coordination across async functions
 * This is based off of https://github.com/ide/await-lock/blob/master/src/AwaitLock.ts
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
   * Releases the lock and gives it to the next waiting acquirer, if there is
   * one. Each acquirer must release the lock exactly once.
   */
  release(id: string): void {
    if (!this.acquired) {
      throw new Error(`Cannot release an unacquired lock`);
    }
    if (id !== this.currentLockHolderId) {
      throw new Error(`Release ID doesn't match current lock ID`);
    }

    if (this.isWaiting) {
      const resolve = this.waitingResolver;
      this.currentLockHolderId = crypto.randomUUID();
      resolve(this.currentLockHolderId);
    } else {
      this.acquired = false;
      this.currentLockHolderId = null;
    }
  }
}
