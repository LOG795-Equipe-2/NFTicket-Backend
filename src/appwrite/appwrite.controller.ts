import { Controller, Delete, Query } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';

@Controller('appwrite')
export class AppwriteController {
  constructor(private readonly appwriteService: AppwriteService) {}

  /**
   * THIS DELETES ALL APPWRITE DATA!! USER WITH CAUTION AND ONLY IN DEBUGGING
   * //TODO remove this endpoint when no longer needed or make it only usable in dev environment
   * @param q boolean, needs to be true to confirm the deletion
   * @returns string saying if the deletion was made or aborted
   */
  @Delete("/deleteAllEventsData")
  deleteAllEvents(@Query() q: any) {
    if(q.confirm === "true") {
        this.appwriteService.deleteAllEvents();
        return "deletion completed";
    } else {
        return "this action is permanent, you need to confirm"
    }
  }
}
