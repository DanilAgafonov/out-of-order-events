import { describe } from "node:test";
import { AddedEvent } from "../handlers/added-handler";
import { UpdatedEvent } from "../handlers/updated-handler";
import { generateTests, handleEventWithRetries } from "./test-helpers";

describe("Sent: Added -> Updated1 -> Updated2", () => {
  const addedEvent: AddedEvent = {
    time: new Date("2021-01-01T00:00:00.000Z"),
    detailType: "Added",
    detail: {
      id: "1",
      name: "Added",
    },
  };
  const updated1Event: UpdatedEvent = {
    time: new Date("2021-01-02T00:00:00.000Z"),
    detailType: "Updated",
    detail: {
      id: "1",
      name: "Updated1",
    },
  };
  const updated2Event: UpdatedEvent = {
    time: new Date("2021-01-03T00:00:00.000Z"),
    detailType: "Updated",
    detail: {
      id: "1",
      name: "Updated2",
    },
  };

  generateTests([
    {
      name: "Added -> Updated1 -> Updated2",
      act: async ({ addedHandler, updatedHandler, addedDlq, updatedDlq }) => {
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await handleEventWithRetries(updatedHandler, updated1Event, updatedDlq);
        await handleEventWithRetries(updatedHandler, updated2Event, updatedDlq);
      },
      expectationsForSimpleStorage: {
        description: "should be updated with Updated2",
        storage: {
          [addedEvent.detail.id]: updated2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description: "should be updated with Updated2",
        storage: {
          [addedEvent.detail.id]: updated2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
    {
      name: "Added -> Updated2 -> Updated1",
      act: async ({ addedHandler, updatedHandler, addedDlq, updatedDlq }) => {
        await handleEventWithRetries(addedHandler, addedEvent, addedDlq);
        await handleEventWithRetries(updatedHandler, updated2Event, updatedDlq);
        await handleEventWithRetries(updatedHandler, updated1Event, updatedDlq);
      },
      expectationsForSimpleStorage: {
        description:
          "should be updated with Updated2, updated1 will be discarded",
        storage: {
          [addedEvent.detail.id]: updated2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
      expectationsForAdvancedStorage: {
        description:
          "should be updated with Updated2, updated1 will be discarded",
        storage: {
          [addedEvent.detail.id]: updated2Event.detail,
        },
        addedDlq: [],
        removedDlq: [],
        updatedDlq: [],
      },
    },
  ]);
});
