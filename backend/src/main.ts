import './config/pg-type-parsers';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe, ValidationError } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const flatten = (errs: ValidationError[]): string[] =>
          errs.flatMap((e) => [
            ...Object.values(e.constraints ?? {}),
            ...(e.children?.length ? flatten(e.children) : []),
          ]);
        return new BadRequestException(flatten(errors).join('; '));
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('СОЗ API')
    .setDescription(
      'Сервис онлайн-заимствования (демонстрационный проект). Ставки/лимиты — иллюстративные, см. legal-rules.config.ts.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`СОЗ backend запущен: http://localhost:${port} (Swagger: /api/docs)`);
}

void bootstrap();
