import { scheduler } from "node:timers/promises";
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { AbstractHandler } from "../abstract-handler";
import { AddedEvent, AddedHandler } from "../handlers/added-handler";
import { UpdatedEvent, UpdatedHandler } from "../handlers/updated-handler";
import { RemovedEvent, RemovedHandler } from "../handlers/removed-handler";
import { SimplifiedAsyncStorage } from "../simplified-async-storage";
import { AdvancedAsyncStorage } from "../advanced-async-storage";

type Expectations = {
  description: string;
  storage: Record<
    (AddedEvent | RemovedEvent | UpdatedEvent)["detail"]["id"],
    (AddedEvent | RemovedEvent | UpdatedEvent)["detail"]
  >;
  addedDlq: AddedEvent[];
  removedDlq: RemovedEvent[];
  updatedDlq: UpdatedEvent[];
};
export async function runAsyncWithRetries(
  fn: () => Promise<void>,
  interval = 200,
  retriesLeft = 3,
): Promise<void> {
  try {
    return await fn();
  } catch (error) {
    await scheduler.wait(interval);
    if (retriesLeft === 0) {
      throw error;
    }
    return await runAsyncWithRetries(fn, --retriesLeft, interval);
  }
}

export type Matrix = Array<{
  name: string;
  act: (args: {
    addedHandler: AddedHandler;
    removedHandler: RemovedHandler;
    updatedHandler: UpdatedHandler;
    addedDlq: AddedEvent[];
    removedDlq: RemovedEvent[];
    updatedDlq: UpdatedEvent[];
  }) => Promise<void>;
  expectationsForSimpleStorage: Expectations;
  expectationsForAdvancedStorage: Expectations;
}>;

export async function handleEventWithRetries(
  eventHandler: AbstractHandler,
  event: AddedEvent | UpdatedEvent | RemovedEvent,
  dlq: Array<AddedEvent | UpdatedEvent | RemovedEvent>,
  interval = 200,
) {
  try {
    await runAsyncWithRetries(() => eventHandler.handle(event), interval);
  } catch (error) {
    dlq.push(event);
  }
}

export function generateTests(matrix: Matrix) {
  for (const {
    name,
    act,
    expectationsForSimpleStorage,
    expectationsForAdvancedStorage,
  } of matrix) {
    describe(`Received: ${name}`, () => {
      describe(SimplifiedAsyncStorage.name, () => {
        const asyncStorage = new SimplifiedAsyncStorage();
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);
        const updatedHandler = new UpdatedHandler(asyncStorage);
        const addedDlq: AddedEvent[] = [];
        const removedDlq: RemovedEvent[] = [];
        const updatedDlq: UpdatedEvent[] = [];

        it(expectationsForSimpleStorage.description, async () => {
          await act({
            addedHandler,
            removedHandler,
            updatedHandler,
            addedDlq,
            removedDlq,
            updatedDlq,
          });

          assert.deepEqual(
            asyncStorage.storage,
            expectationsForSimpleStorage.storage,
          );
          assert.deepEqual(addedDlq, expectationsForSimpleStorage.addedDlq);
          assert.deepEqual(removedDlq, expectationsForSimpleStorage.removedDlq);
          assert.deepEqual(updatedDlq, expectationsForSimpleStorage.updatedDlq);
        });
      });

      describe(AdvancedAsyncStorage.name, () => {
        const asyncStorage = new AdvancedAsyncStorage();
        const addedHandler = new AddedHandler(asyncStorage);
        const removedHandler = new RemovedHandler(asyncStorage);
        const updatedHandler = new UpdatedHandler(asyncStorage);
        const addedDlq: AddedEvent[] = [];
        const removedDlq: RemovedEvent[] = [];
        const updatedDlq: UpdatedEvent[] = [];

        it(expectationsForAdvancedStorage.description, async () => {
          await act({
            addedHandler,
            removedHandler,
            updatedHandler,
            addedDlq,
            removedDlq,
            updatedDlq,
          });

          assert.deepEqual(
            asyncStorage.storage,
            expectationsForAdvancedStorage.storage,
          );
          assert.deepEqual(addedDlq, expectationsForAdvancedStorage.addedDlq);
          assert.deepEqual(
            removedDlq,
            expectationsForAdvancedStorage.removedDlq,
          );
          assert.deepEqual(
            updatedDlq,
            expectationsForAdvancedStorage.updatedDlq,
          );
        });
      });
    });
  }
}
