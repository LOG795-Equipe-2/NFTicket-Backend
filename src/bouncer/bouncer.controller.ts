import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AppwriteGuard } from '../appwrite/appwrite.guard';
import ApiResponse from '../utilities/ApiResponse.dto';
import { BouncerGuard } from './bouncer.guard';
import { BouncerService } from './bouncer.service';

@Controller('bouncer')
export class BouncerController {
  constructor(private readonly bouncerService: BouncerService) {}

  @ApiOperation({summary: "creates a list of bouncer id"})
  @ApiParam({name: "eventId"})
  @ApiBody({description: "needs amount parameter (more than 0)"})
  @UseGuards(AppwriteGuard)
  @Post("/:eventId/createBouncers")
  async createEventBouncer(@Param() params: { eventId: string }, @Body() b: any): Promise<ApiResponse> {

    const userId = b['userId'];
    const isUserOwner = await this.bouncerService.checkIsOwner(params.eventId, userId)
    console.log(isUserOwner)
    if(!isUserOwner) {
      return {
        success: false,
        errorMessage: "Invalid Event Id"
      }
    }

    if(!b['amount'] || b['amount'] <= 0) {
      return {
        success: false,
        errorMessage: "invalid amount"
      }
    }

    const bouncers = await this.bouncerService.createNewBouncer(params.eventId, b['amount'])

    if(bouncers.length === 0) {
      return {
        success: false,
        errorMessage: "There was an error while creating bouncers"
      }
    }

    return {
      success: true,
      data: bouncers
    }
  }

  @ApiOperation({summary: "list all bouncers for an event", description: "returns the list of id for each bouncer"})
  @ApiParam({name: "enventId"})
  @UseGuards(AppwriteGuard)
  @Post("/:eventId/listBouncers")
  async listBouncers(@Param() params: { eventId: string }, @Body() b): Promise<ApiResponse> {
    if(!this.bouncerService.checkIsOwner(params.eventId, b["userId"])) {
      return { success: false };
    }

    const bouncers = await this.bouncerService.getBouncers(params.eventId);

    if(!bouncers)
      return {
        success: false,
        errorMessage: "There was an error while fetching bouncers"
      }

    return {
      success: true,
      data: bouncers
    }
  }

  @ApiOperation({summary: "deletes a bouncer", description: "removes a bouncer if from the list of available bouncer ids"})
  @ApiParam({name: "enventId"})
  @ApiBody({description: "needs bouncer field"})
  @UseGuards(AppwriteGuard)
  @Post("/:eventId/deleteBouncer")
  async deleteBouncer(@Param() params: { eventId: string }, @Body() b: any): Promise<ApiResponse> {
    if(!this.bouncerService.checkIsOwner(params.eventId, b["userId"])) {
      return { success: false };
    }
    
    const success = await this.bouncerService.deleteBouncer(params.eventId, b['bouncer'])

    return {
      success
    }
  }
}
