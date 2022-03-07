
import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';

/**
 * This guard verifies that a request has the headers
 *  - nfticket-appwrite-jwt
 * 
 * Then it will verify that the content of that header is a valid JWT and it will append the userId to the request's body
 * 
 * To use this guard in a module, you need to add the AppwriteModule to the list of Imports of the module because this guards uses AppwriteService
 */
@Injectable()
export class AppwriteGuard implements CanActivate {
  constructor(private readonly appwriteService: AppwriteService){ }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if(!request.headers["nfticket-appwrite-jwt"])
      return false;

    const jwt = request.headers['nfticket-appwrite-jwt'];

    const userId = await this.appwriteService.getUserIdFromJwt(jwt);

    if(!userId)
      return false;
    
    request.body['userId'] = userId;
    
    return true;
  }
}
