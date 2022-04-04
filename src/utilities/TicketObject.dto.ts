import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsInt, IsNumber, Min, IsNotEmpty, ValidateNested, IsNumberString } from 'class-validator';
import * as TICKET_SCHEMA from '../schemas/ticketSchema.json'; // this ts file should still be imported fine

export class Ticket {
    asset_id:string | null = null

    @IsString()
    @IsNotEmpty()
    eventName:string

    @IsString()
    locationName:string

    @IsString()
    originalDateTime:string

    @IsNumber()
    @Min(0)
    originalPrice:number
    
    @IsString()
    categoryName:string

    @IsInt()
    @Min(1)
    numberOfTickets:number

    static getSchemaName(){
        return "ticket"
    }

    static returnTicketSchema(): any{
        return TICKET_SCHEMA
    }
}

/**
 * Uses to validate the tickets in the query, that are passed as an array
 * 
 * Source: https://stackoverflow.com/questions/65025460/nestjs-validating-array-of-objects-using-class-validator
 */
export class TicketsQuery {
    @ApiProperty({ type: Ticket })
    @ValidateNested({ each: true })
    @Type(() => Ticket)
    tickets: Ticket[]
}