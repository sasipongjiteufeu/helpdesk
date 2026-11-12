import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, throwError } from 'rxjs';
import * as fs from 'fs';
import type { Response } from 'express';

export function detectedType(bytes: Buffer, declared: string): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return 'image/gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (bytes[0] === 80 && bytes[1] === 75 && [[3, 4], [5, 6], [7, 8]].some(([a, b]) => bytes[2] === a && bytes[3] === b)) return 'application/zip';
  if (declared === 'text/plain' && !bytes.includes(0)) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return 'text/plain'; } catch { return null; }
  }
  return null;
}

export function safeFileHeaders(res: Response, mime: string | null, filename: string) {
  const inline = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime || '');
  res.setHeader('Content-Type', inline ? mime! : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox; frame-ancestors 'none'");
}

@Injectable()
export class UploadSafetyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const files: Express.Multer.File[] = context.switchToHttp().getRequest().files || [];
    const cleanup = () => {
      for (const file of files) if (file.path) {
        try { fs.unlinkSync(file.path); } catch { /* Already removed or not persisted. */ }
      }
    };
    try {
      for (const file of files) {
        const bytes = file.buffer || fs.readFileSync(file.path);
        const mime = detectedType(bytes, file.mimetype);
        if (!mime || (file.fieldname === 'pictures' && !mime.startsWith('image/'))) {
          throw new BadRequestException('Unsupported or invalid file content');
        }
        file.mimetype = mime;
      }
    } catch (error) { cleanup(); throw error; }
    return next.handle().pipe(catchError(error => { cleanup(); return throwError(() => error); }));
  }
}
