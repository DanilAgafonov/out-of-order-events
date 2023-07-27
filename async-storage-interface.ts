export interface IAsyncStorage {
  get storage(): Readonly<
    Record<
      string,
      {
        readonly id: string;
        readonly name: string;
      }
    >
  >;
  create(id: string, data: unknown, eventTime: Date): Promise<void>;
  update(id: string, data: unknown, eventTime: Date): Promise<void>;
  remove(id: string, eventTime: Date): Promise<void>;
}
