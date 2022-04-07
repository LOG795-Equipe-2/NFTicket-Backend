import { Injectable } from "@nestjs/common"

@Injectable()
export class AtomicAssetsQueryServiceTestProvider{
    getSchemas = jest.fn()
    getCollections = jest.fn()
    getTemplates = jest.fn()
    getAssets = jest.fn()
    deserializeData = jest.fn()
}