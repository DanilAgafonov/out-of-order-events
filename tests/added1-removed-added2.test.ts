import { describe } from "node:test";
import { scheduler } from "node:timers/promises";
import { generateTests, handleEventWithRetries } from "./test-helpers";
import { AddedEvent } from "../handlers/added-handler";
import { RemovedEvent } from "../handlers/removed-handler";

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

  generateTests([
    {
      name: "Added1 -> Removed -> Added2",
      act: async ({ addedHandler, removedHandler, addedDlq, removedDlq }) => {
        await handleEventWithRetries(addedHandler, added1Event, addedDlq);
        await handleEventWithRetries(removedHandler, removedEvent, removedDlq);
        await handleEventWithRetries(addedHandler, added2Event, addedDlq);
      },
      expectationsForSimpleStorage: {
        description: "should save Added2",
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should save Added2",
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Added1 -> Added2 -> Removed",
      act: async ({ addedHandler, removedHandler, addedDlq, removedDlq }) => {
        await handleEventWithRetries(addedHandler, added1Event, addedDlq);
        const added2Promise = handleEventWithRetries(
          addedHandler,
          added2Event,
          addedDlq,
        );
        await scheduler.wait(100);
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );
        await Promise.all([added2Promise, removedPromise]);
      },
      expectationsForSimpleStorage: {
        description: "should save Added2",
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should save Added2",
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Removed -> Added1 -> Added2",
      act: async ({ addedHandler, removedHandler, addedDlq, removedDlq }) => {
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );
        await scheduler.wait(100);
        await handleEventWithRetries(addedHandler, added1Event, addedDlq);
        const added2Promise = handleEventWithRetries(
          addedHandler,
          added2Event,
          addedDlq,
        );

        await Promise.all([added2Promise, removedPromise]);
      },
      expectationsForSimpleStorage: {
        description: "should save Added2",
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should save Added2",
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Added2 -> Added1 -> Removed",
      act: async ({ addedHandler, removedHandler, addedDlq, removedDlq }) => {
        await handleEventWithRetries(addedHandler, added2Event, addedDlq);
        const added1Promise = handleEventWithRetries(
          addedHandler,
          added1Event,
          addedDlq,
        );
        await scheduler.wait(100);
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );

        await Promise.all([added1Promise, removedPromise]);
      },
      expectationsForSimpleStorage: {
        description:
          'should save "Added2", added1 should end up in DLQ, removed should be discarded',
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [added1Event],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description:
          'should save "Added2", added1 and removed should be discarded',
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Removed -> Added2 -> Added1",
      act: async ({ addedHandler, removedHandler, addedDlq, removedDlq }) => {
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );
        await scheduler.wait(100);

        await handleEventWithRetries(addedHandler, added2Event, addedDlq);
        const added1Promise = handleEventWithRetries(
          addedHandler,
          added1Event,
          addedDlq,
        );

        await Promise.all([added1Promise, removedPromise]);
      },
      expectationsForSimpleStorage: {
        description:
          'should save "Added2", remove will be discarded, added1 will end up in DLQ',
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [added1Event],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description:
          'should save "Added2", remove and added1 will be discarded',
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Added2 -> Removed -> Added1",
      act: async ({ addedHandler, removedHandler, addedDlq, removedDlq }) => {
        await handleEventWithRetries(addedHandler, added2Event, addedDlq);
        const removedPromise = handleEventWithRetries(
          removedHandler,
          removedEvent,
          removedDlq,
        );
        await scheduler.wait(100);

        const added1Promise = handleEventWithRetries(
          addedHandler,
          added1Event,
          addedDlq,
        );

        await Promise.all([added1Promise, removedPromise]);
      },
      expectationsForSimpleStorage: {
        description:
          'should save "Added2", removed event should be discarded, added1 should end up in DLQ',
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [added1Event],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description:
          'should save "Added2", removed, added1 events should be discarded',
        storage: {
          [added2Event.detail.id]: added2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
  ]);
});
