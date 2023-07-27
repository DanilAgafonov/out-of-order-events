import { describe, it, beforeEach } from "node:test";
import { scheduler } from "node:timers/promises";
import * as assert from "node:assert/strict";
import { runAsyncWithRetries } from "./test-helpers";
import { AddedEvent, AddedHandler } from "../handlers/added-handler";
import { SimplifiedAsyncStorage } from "../simplified-async-storage";
import { RemovedEvent, RemovedHandler } from "../handlers/removed-handler";
import { AdvancedAsyncStorage } from "../advanced-async-storage";

describe("Sent: Added1 -> Removed -> Added2", () => {
  const added1Event: AddedEvent = {
    time: new Date("2021-01-01T00:00:00.000Z"),
    detailType: "Added",
    detail: {
      id: "1",
      name: "Added1",
    },
  };
  const removedEvent: RemovedEvent = {
    time: new Date("2021-01-02T00:00:00.000Z"),
    detailType: "Removed",
    detail: {
      id: "1",
    },
  };
  const added2Event: AddedEvent = {
    time: new Date("2021-01-03T00:00:00.000Z"),
    detailType: "Added",
    detail: {
      id: "1",
      name: "Added2",
    },
  };

  // Possible arrival order:
  // 1. Added1 -> Removed -> Added2
  // 2. Added1 -> Added2 -> Removed
  // 3. Removed -> Added1 -> Added2
  // 4. Added2 -> Added1 -> Removed
  // 5. Removed -> Added2 -> Added1
  // 6. Added2 -> Removed -> Added1

  describe(SimplifiedAsyncStorage.name, () => {
    let asyncStorage: SimplifiedAsyncStorage;

    beforeEach(() => {
      asyncStorage = new SimplifiedAsyncStorage();
    });

    describe("Received: Added1 -> Removed -> Added2", () => {
      it('should save "Added2"', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added1Event));
        await runAsyncWithRetries(() => removedHandler.handle(removedEvent));
        await runAsyncWithRetries(() => addedHandler.handle(added2Event));

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Added1 -> Added2 -> Removed", () => {
      it('should save "Added2"', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added1Event));
        const added2Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added2Event),
        );

        await scheduler.wait(100);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );

        await Promise.all([added2Promise, removedPromise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Removed -> Added1 -> Added2", () => {
      it('should save "Added2"', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );
        await scheduler.wait(100);

        const added1Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added1Event),
        );

        const added2Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added2Event),
        );

        await Promise.all([added2Promise, removedPromise, added1Promise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Added2 -> Added1 -> Removed", () => {
      it('should save "Added2", added1 should end up in DLQ, removed should be discarded', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added2Event));

        const added1Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added1Event),
        );

        await scheduler.wait(100);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );

        await assert.rejects(Promise.all([added1Promise, removedPromise]), {
          message: "Item with id 1 already exists",
        });

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Removed -> Added2 -> Added1", () => {
      it('should save "Added2", remove will be discarded, added1 will end up in DLQ', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );

        const added2Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added2Event),
        );

        await scheduler.wait(100);

        const added1Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added1Event),
        );

        await assert.rejects(added1Promise, {
          message: "Item with id 1 already exists",
        });

        await Promise.all([added2Promise, removedPromise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Added2 -> Removed -> Added1", () => {
      it('should save "Added2", removed event should be discarded, added1 should end up in DLQ', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added2Event));
        await runAsyncWithRetries(() => removedHandler.handle(removedEvent));

        await assert.rejects(
          runAsyncWithRetries(() => addedHandler.handle(added1Event)),
          {
            message: "Item with id 1 already exists",
          },
        );

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });
  });

  describe(AdvancedAsyncStorage.name, () => {
    let asyncStorage: AdvancedAsyncStorage;

    beforeEach(() => {
      asyncStorage = new AdvancedAsyncStorage();
    });

    describe("Received: Added1 -> Removed -> Added2", () => {
      it('should save "Added2"', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added1Event));
        await runAsyncWithRetries(() => removedHandler.handle(removedEvent));
        await runAsyncWithRetries(() => addedHandler.handle(added2Event));

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Added1 -> Added2 -> Removed", () => {
      it('should save "Added2"', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added1Event));
        const added2Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added2Event),
        );

        await scheduler.wait(100);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );

        await Promise.all([added2Promise, removedPromise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Removed -> Added1 -> Added2", () => {
      it('should save "Added2"', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );
        await scheduler.wait(100);

        const added1Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added1Event),
        );

        const added2Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added2Event),
        );

        await Promise.all([added2Promise, removedPromise, added1Promise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Added2 -> Added1 -> Removed", () => {
      it('should save "Added2", added1 and removed should be discarded', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added2Event));

        const added1Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added1Event),
        );

        await scheduler.wait(100);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );

        await Promise.all([added1Promise, removedPromise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Removed -> Added2 -> Added1", () => {
      it('should save "Added2", remove and added1 will be discarded', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        const removedPromise = runAsyncWithRetries(() =>
          removedHandler.handle(removedEvent),
        );

        const added2Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added2Event),
        );

        await scheduler.wait(100);

        const added1Promise = runAsyncWithRetries(() =>
          addedHandler.handle(added1Event),
        );

        await Promise.all([added1Promise, added2Promise, removedPromise]);

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });

    describe("Received: Added2 -> Removed -> Added1", () => {
      it('should save "Added2", removed, added1 events should be discarded', async () => {
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);

        await runAsyncWithRetries(() => addedHandler.handle(added2Event));
        await runAsyncWithRetries(() => removedHandler.handle(removedEvent));
        await runAsyncWithRetries(() => addedHandler.handle(added1Event));

        assert.strictEqual(
          asyncStorage.storage[added2Event.detail.id],
          added2Event.detail,
        );
      });
    });
  });
});
