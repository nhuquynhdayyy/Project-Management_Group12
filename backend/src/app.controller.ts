import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: 'Urban Tree Management Backend Running 🚀',
    };
  }
}