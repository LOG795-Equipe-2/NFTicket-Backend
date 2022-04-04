import { Controller, Get, Post, Req, Param } from '@nestjs/common';
import { AtomicAssetsQueryService } from './atomic-assets-query.service';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import ApiResponse from '../utilities/ApiResponse.dto'

@ApiTags('atomic-assets')
@Controller('atomic-assets')
export class AtomicAssetsQueryController {
    constructor(private readonly atomicAssetsQueryService: AtomicAssetsQueryService) {}

    @Get('/assets/:userName')
    async getAssets(@Param() params): Promise<ApiResponse> {
        let assets = await this.atomicAssetsQueryService.getAssets(params.userName);
        return {
            success: true,
            data: assets
        }
    }

    @Get('/collections/:collName')
    async getCollection(@Param() params): Promise<ApiResponse> {
        let collections = await this.atomicAssetsQueryService.getCollections(params.collName);
        return {
            success: true,
            data: collections
        } 
    }

    @Get('/templates/:coll_name/:template_id')
    async getTemplate(@Param() params): Promise<ApiResponse> {
        let templates = await this.atomicAssetsQueryService.getTemplates(params.coll_name, params.template_id, 1);
        return {
            success: true,
            data: templates
        } 
    }
}
