import { Body, Controller, Param, Post, Query, UseGuards, Headers, Get } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Logger } from 'tslog';
import { AppwriteGuard } from '../appwrite/appwrite.guard';
import ApiResponse from '../utilities/ApiResponse.dto';
import { BouncerGuard } from './bouncer.guard';
import { BouncerService } from './bouncer.service';

@Controller('bouncer')
export class BouncerController {
  log: Logger = new Logger({ name: "BouncerControllerLogger"})

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

  @ApiOperation({summary: "deletes a bouncer", description: "removes a bouncer if from the list of available bouncer ids"})
  @ApiParam({name: "enventId"})
  @ApiBody({description: "needs bouncer field"})
  @UseGuards(BouncerGuard)
  @Post("/controlTicket")
  async postControlTicket(@Headers('x-nfticket-event-id') eventId, @Query('assetId') assetId: string, @Query('userName') userName): Promise<ApiResponse> {
    if(typeof assetId === "undefined" || assetId == "" ||
      typeof userName === "undefined" || userName == "") {
        return {
          success: false,
          errorMessage: "assetID and userName are required"
        }
      }
    
    // Check that the bouncer can check event id, based on the assetId.
    let checkBouncer = await this.bouncerService.validateAssetIsForEvent(eventId, assetId);
    if(!checkBouncer){
      return {
        success: false,
        errorMessage: "Bouncer does not have the rights to control this ticket"
      }
    }

    //Check if assetid is valid (asset is returned by atomic asset)
    //Check if the ticket is signed.
    let asset = await this.bouncerService.getAssetAndCheckIfSigned(assetId, userName)
    if(!asset) {
      return {
        success: false,
        errorMessage: "The ticket is invalid or is not signed."
      }
    }

    try{
      await this.bouncerService.setTicketAsUsed(assetId, userName)      
    } catch(err){
      this.log.error(err)
      return {
        success: false,
        errorMessage: "There was an error while controlling the ticket. Ticket is valid, but could not be set as used."
      }
    }

    return {
      success: true,
      data: "Ticket was validated and set as used"
    }
  }

  @ApiOperation({summary: "Validates a bouncer"})
  @Get("/validate")
  @UseGuards(BouncerGuard)
  async validateBouncer(): Promise<ApiResponse> {
    return {
      success: true
    }
  }
}
