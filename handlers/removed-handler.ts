import { AbstractHandler } from "../abstract-handler";

export type RemovedEvent = {
  time: Date;
  detailType: "Removed";
  detail: {
    id: string;
  };
};

export class RemovedHandler extends AbstractHandler {
  public async handle(event: RemovedEvent) {
    await this.asyncStorage.remove(event.detail.id, event.time);
  }
}
