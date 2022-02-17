import { Controller, Get, HttpException, HttpStatus, Param } from '@nestjs/common';
import { EosService } from './eos.service';

@Controller('eos')
export class EosController {
    constructor(private eosService: EosService) {}

    @Get("account-details/:account_name")
    async getAccountDetails(@Param("account_name") accountName: string): Promise<any> {
        try {
            return await this.eosService.getAccountInfo(accountName);
        } catch (error) {
            let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;

            if (error.name === EosService.UNKNOWN_KEY_ERROR) {
                statusCode = HttpStatus.BAD_REQUEST;
            }

            throw new HttpException({message: error.message}, statusCode);
        }
    }
}
