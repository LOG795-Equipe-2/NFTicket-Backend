import { Controller, Get, Post, Req, Param } from '@nestjs/common';
import { AtomicAssetsQueryService } from './atomic-assets-query.service';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('atomic-assets')
@Controller('atomic-assets')
export class AtomicAssetsQueryController {
    constructor(private readonly atomicAssetsQueryService: AtomicAssetsQueryService) {}

    @Get()
    getHello(): string {
        return this.atomicAssetsQueryService.getHello();
    }  

    @Get('/assets/:userName')
    getAssets(@Param() params){
        return this.atomicAssetsQueryService.getAssets(params.userName)
    }

    @Get('/collections/:collName')
    getCollection(@Param() params){
        return this.atomicAssetsQueryService.getCollections(params.collName)
    }

    @Get('/templates/:coll_name/:template_id')
    getTemplate(@Param() params){
        return this.atomicAssetsQueryService.getTemplates(params.coll_name, params.template_id, 1)
    }
}
