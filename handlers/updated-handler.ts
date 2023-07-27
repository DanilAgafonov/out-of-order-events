import { AbstractHandler } from "../abstract-handler";

export type UpdatedEvent = {
  time: Date;
  detailType: "Updated";
  detail: {
    id: string;
    name: string;
  };
};

export class UpdatedHandler extends AbstractHandler {
  public async handle(event: UpdatedEvent) {
    await this.asyncStorage.update(event.detail.id, event.detail, event.time);
  }
}
