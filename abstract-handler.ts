import { IAsyncStorage } from "./async-storage-interface";

export abstract class AbstractHandler {
  constructor(protected asyncStorage: IAsyncStorage) {}

  public abstract handle(event: unknown): Promise<void>;
}
