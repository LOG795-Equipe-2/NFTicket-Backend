import { IsDate, IsDateString, IsNotEmpty, IsString } from "class-validator";

export class EventSearchQuery {

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsString()
    locationName: string;

    @IsNotEmpty()
    @IsString()
    locationCity: string;
}