import type { Request, Response, NextFunction } from 'express';
import { API_PREFIX } from '../config/constants';
import { type ApiErrorResponse, API_ERRORS } from '../config/api-error';

export const globalErrorHandler = (
  err: ApiErrorResponse & Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const { status, message } = err;

  console.error(`[${req.method}] ${req.path} — ${message}`);

  if (req.path.startsWith(`${API_PREFIX}/`)) {
    const response = err.code
      ? { status, code: err.code, message }
      : API_ERRORS.internal(message);

    res.status(response.status).json(response);
    return;
  }

  res.status(status).json({ error: { message } });
};
