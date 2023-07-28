import { IAsyncStorage } from "./async-storage-interface";

export class AdvancedAsyncStorage implements IAsyncStorage {
  #storage: Record<string, { readonly id: string; readonly name: string }> = {};
  #lastEventTimeById: Record<string, Date> = {};

  get storage(): Readonly<
    Record<string, { readonly id: string; readonly name: string }>
  > {
    return this.#storage;
  }

  async create(
    id: string,
    data: { id: string; name: string },
    eventTime: Date,
  ) {
    if (this.#storage[id]) {
      const lastEventTime = this.#lastEventTimeById[id]!;
      if (eventTime <= lastEventTime) {
        return;
      }
      throw new Error(
        `Item with id ${id} already exists and eventTime > lastEventTime`,
      );
    } else {
      this.#storage[id] = data;
      this.#lastEventTimeById[id] = eventTime;
    }
  }

  async update(
    id: string,
    data: { id: string; name: string },
    eventTime: Date,
  ) {
    if (!this.#storage[id]) {
      throw new Error(`Item with id ${id} already exists`);
    }

    const lastEventTime = this.#lastEventTimeById[id]!;

    if (eventTime > lastEventTime) {
      this.#storage[id] = data;
      this.#lastEventTimeById[id] = eventTime;
    } else {
      return;
    }
  }

  async remove(id: string, eventTime: Date) {
    if (!this.#storage[id]) {
      throw new Error(`Item with id ${id} does not exist`);
    }

    const lastEventTime = this.#lastEventTimeById[id]!;

    if (eventTime > lastEventTime) {
      delete this.#storage[id];
      delete this.#lastEventTimeById[id];
    } else {
      // eventTime <= lastEventTime
      return;
    }
  }
}
