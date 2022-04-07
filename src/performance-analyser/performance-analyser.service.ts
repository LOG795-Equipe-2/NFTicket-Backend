import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Logger } from 'tslog';

@Injectable()
export class PerformanceAnalyserService {
    log: Logger = new Logger({ name: "PerformanceAnalyserServiceLogger"})
    isPerformanceLoggingEnabled: boolean
    NS_PER_SEC: number = 1e9;

    constructor(private configService: ConfigService, private appwriteService: AppwriteService){
        this.isPerformanceLoggingEnabled = configService.get<boolean>('performanceTraceEnabled')
    }

    saveTransactionPerformance(hrtimeResult: number[], operationName: string, extraData:any = null){
        let executionTimeNs = hrtimeResult[0] * this.NS_PER_SEC + hrtimeResult[1]
        //convert nanoseconds to milliseconds
        let executionTimeMs = executionTimeNs / 1e6
        if(this.isPerformanceLoggingEnabled){
            try{
                this.log.debug("Saving transaction performance with execution time: " + executionTimeMs + "ms")
                this.appwriteService.createPerformanceLogging(executionTimeMs, operationName, extraData)
            } catch(err){
                this.log.error("Error saving transaction performance: " + err)
            }
        }
    }

    async extractPerformanceDataForOperation(operation:string): Promise<any>{
        return await this.appwriteService.getAllPerformanceLoggingForOperation(operation)
    }

    async calculateDataAverageForOperation(operation:string): Promise<any>{
        let data = await this.extractPerformanceDataForOperation(operation)
        let total = 0
        data.forEach(element => {
            total += element.executionTimeMs
        });
        return {
            value: total / data.length,
            unit: "ms"
        }
    }
}
