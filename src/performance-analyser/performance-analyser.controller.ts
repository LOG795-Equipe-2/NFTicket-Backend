import { Controller, Get, Query, Headers, Param } from '@nestjs/common';
import ApiResponse from 'src/utilities/ApiResponse.dto';
import { PerformanceAnalyserService } from './performance-analyser.service';

@Controller('performance-analyser')
export class PerformanceAnalyserController {
    constructor(private readonly performanceAnalyserService: PerformanceAnalyserService) {}

    @Get(':operationName')
    async getPerformanceDataForOperation(@Param('operationName') operationName: string,
        @Headers('X-nfticket-apikey') nfticketApiKey: string): Promise<ApiResponse> {
        if(nfticketApiKey != "test12345678"){
            return {
                success: false,
                errorMessage: "Invalid API key"
            }
        }
        if(operationName == null || operationName == ""){
            return {
                success: false,
                errorMessage: "operationName is required"
            }
        }

        try{
            return {
                success: true,
                data: await this.performanceAnalyserService.extractPerformanceDataForOperation(operationName)
            };    
        } catch(err){
            return {
                success: false,
                errorMessage: err
            }
        }
    }

    @Get(':operationName/average')
    async getPerformanceDataAverageForOperation(@Param('operationName') operationName: string,
        @Headers('X-nfticket-apikey') nfticketApiKey: string): Promise<ApiResponse> {
        if(nfticketApiKey != "test12345678"){
            return {
                success: false,
                errorMessage: "Invalid API key"
            }
        }
        if(operationName == null || operationName == ""){
            return {
                success: false,
                errorMessage: "operationName is required"
            }
        }

        try{
            return {
                success: true,
                data: await this.performanceAnalyserService.calculateDataAverageForOperation(operationName)
            };    
        } catch(err){
            return {
                success: false,
                errorMessage: err
            }
        }
    }
}
