import { describe } from "node:test";
import { AddedEvent } from "../handlers/added-handler";
import { RemovedEvent } from "../handlers/removed-handler";
import { UpdatedEvent } from "../handlers/updated-handler";
import { generateTests, handleEventWithRetries } from "./test-helpers";
import { scheduler } from "node:timers/promises";

describe("Sent: Added -> Updated -> Removed", () => {
  const addedEvent: AddedEvent = {
    time: new Date("2021-01-01T00:00:00.000Z"),
    detailType: "Added",
    detail: {
      id: "1",
      name: "Added",
    },
  };
  const updatedEvent: UpdatedEvent = {
    time: new Date("2021-01-02T00:00:00.000Z"),
    detailType: "Updated",
    detail: {
      id: "1",
      name: "Updated",
    },
  };
  const removedEvent: RemovedEvent = {
    time: new Date("2021-01-03T00:00:00.000Z"),
    detailType: "Removed",
    detail: {
      id: "1",
    },
  };

  // 6 permutations
  generateTests([
    {
      name: "Added -> Updated -> Removed",
      act: async ({
        addedHandler,
        updatedHandler,
        removedHandler,
        addedDlq,
        updatedDlq,
        removedDlq,
      }) => {
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await handleEventWithRetries(updatedHandler, updatedEvent, updatedDlq);
        await handleEventWithRetries(removedHandler, removedEvent, removedDlq);
      },
      expectationsForSimpleStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Added -> Removed -> Updated",
      act: async ({
        addedHandler,
        updatedHandler,
        removedHandler,
        addedDlq,
        updatedDlq,
        removedDlq,
      }) => {
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await handleEventWithRetries(removedHandler, removedEvent, removedDlq);
        await handleEventWithRetries(updatedHandler, updatedEvent, updatedDlq);
      },
      expectationsForSimpleStorage: {
        description: "should cleanup storage, updated event will end up in DLQ",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [updatedEvent],
      },
      expectationsForAdvancedStorage: {
        description: "should cleanup storage, updated event will end up in DLQ",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [updatedEvent],
      },
    },
    {
      name: "Updated -> Added -> Removed",
      act: async ({
        addedHandler,
        updatedHandler,
        removedHandler,
        addedDlq,
        updatedDlq,
        removedDlq,
      }) => {
        const updatedPromise = handleEventWithRetries(
          updatedHandler,
          updatedEvent,
          updatedDlq,
        );
        await scheduler.wait(100);
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await updatedPromise;
        await handleEventWithRetries(removedHandler, removedEvent, removedDlq);
      },
      expectationsForSimpleStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Updated -> Removed -> Added",
      act: async ({
        addedHandler,
        updatedHandler,
        removedHandler,
        addedDlq,
        updatedDlq,
        removedDlq,
      }) => {
        const updatePromise = handleEventWithRetries(
          updatedHandler,
          updatedEvent,
          updatedDlq,
        );
        await scheduler.wait(100);
        const removePromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
          300,
        );
        await scheduler.wait(100);
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await updatePromise;
        await removePromise;
      },
      expectationsForSimpleStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Removed -> Added -> Updated",
      act: async ({
        addedHandler,
        updatedHandler,
        removedHandler,
        addedDlq,
        updatedDlq,
        removedDlq,
      }) => {
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );
        await scheduler.wait(100);
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await handleEventWithRetries(updatedHandler, updatedEvent, updatedDlq);
        await removedPromise;
      },
      expectationsForSimpleStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should cleanup storage",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Removed -> Updated -> Added",
      act: async ({
        addedHandler,
        updatedHandler,
        removedHandler,
        addedDlq,
        updatedDlq,
        removedDlq,
      }) => {
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );
        await scheduler.wait(100);

        const updatedPromise = handleEventWithRetries(
          updatedHandler,
          updatedEvent,
          updatedDlq,
        );
        await scheduler.wait(100);

        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await removedPromise;
        await updatedPromise;
      },
      expectationsForSimpleStorage: {
        description: "should cleanup storage, updated event will end up in DLQ",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [updatedEvent],
      },
      expectationsForAdvancedStorage: {
        description: "should cleanup storage, updated event will end up in DLQ",
        storage: {},
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [updatedEvent],
      },
    },
  ]);
});
