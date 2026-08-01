import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getLogger } from '../utils/logger.js';

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Assigns a request identifier used in every log line and response envelope.
 *
 * An inbound `x-request-id` is honoured only when it is short and safe, so a
 * client cannot inject arbitrary content into logs or response headers.
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const inbound = req.get(REQUEST_ID_HEADER);
    const id = inbound && SAFE_REQUEST_ID.test(inbound) ? inbound : randomUUID();

    req.id = id;
    res.locals['requestId'] = id;
    req.log = getLogger().child({ requestId: id });

    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  };
}
