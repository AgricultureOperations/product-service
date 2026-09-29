import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  ProductNotFoundError,
  ProductValidationError,
  SkuAlreadyExistsError,
} from '../../../domain';

/** Error body shared by every endpoint. The frontend reads `message`. */
export interface ErrorBody {
  statusCode: number;
  message: string;
  /** Individual validation messages, present on 400s from the ValidationPipe. */
  errors?: string[];
}

const DOMAIN_STATUS = new Map<Function, HttpStatus>([
  [ProductValidationError, HttpStatus.BAD_REQUEST],
  [ProductNotFoundError, HttpStatus.NOT_FOUND],
  [SkuAlreadyExistsError, HttpStatus.CONFLICT],
]);

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof DomainError) {
      const statusCode = DOMAIN_STATUS.get(exception.constructor) ?? HttpStatus.BAD_REQUEST;
      return { statusCode, message: exception.message };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const raw = typeof payload === 'object' && payload !== null ? (payload as { message?: unknown }).message : payload;
      if (Array.isArray(raw)) {
        return { statusCode, message: raw.join('; '), errors: raw.map(String) };
      }
      return { statusCode, message: typeof raw === 'string' ? raw : exception.message };
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' };
  }
}
