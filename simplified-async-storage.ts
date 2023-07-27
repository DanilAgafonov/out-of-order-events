import { IAsyncStorage } from "./async-storage-interface";

export class SimplifiedAsyncStorage implements IAsyncStorage {
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
      throw new Error(`Item with id ${id} already exists`);
    }

    this.#storage[id] = data;
    this.#lastEventTimeById[id] = eventTime;
  }

  async update(
    id: string,
    data: { id: string; name: string },
    eventTime: Date,
  ) {
    this.#storage[id] = data;
    this.#lastEventTimeById[id] = eventTime;
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
