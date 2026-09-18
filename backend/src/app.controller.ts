import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return { service: 'СОЗ API', status: 'ok', time: new Date().toISOString() };
  }
}
