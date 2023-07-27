import { AbstractHandler } from "../abstract-handler";

export type AddedEvent = {
  time: Date;
  detailType: "Added";
  detail: {
    id: string;
    name: string;
  };
};

export class AddedHandler extends AbstractHandler {
  public async handle(event: AddedEvent) {
    await this.asyncStorage.create(event.detail.id, event.detail, event.time);
  }
}
