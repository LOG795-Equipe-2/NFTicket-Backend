
import { Injectable, CanActivate, ExecutionContext, Inject, HttpException } from '@nestjs/common';
import { BouncerService } from './bouncer.service';

@Injectable()
export class BouncerGuard implements CanActivate {

  private readonly BOUNCER_HEADER = "x-nfticket-bouncer";
  private readonly EVENT_ID_HEADER = "x-nfticket-event-id";

  constructor(private readonly bouncerService: BouncerService){ }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if(!request.headers[this.BOUNCER_HEADER])
      throw new HttpException("Missing x-nfticket-bouncer header", 403);

    if(!request.headers[this.EVENT_ID_HEADER])
        throw new HttpException("Missing x-nfticket-event-id header", 403);
    
    return await this.bouncerService.checkIsBouncer(request.headers[this.EVENT_ID_HEADER], request.headers[this.BOUNCER_HEADER]);
  }
}
