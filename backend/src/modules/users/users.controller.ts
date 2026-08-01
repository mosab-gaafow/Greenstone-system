import type { NextFunction, Request, Response } from 'express';
import type { Capability } from '../../generated/prisma/client.js';
import { getRequestContext } from '../../shared/auth/session.middleware.js';
import type { GreenstoneRole } from '../../shared/auth/permissions.js';
import {
  buildPaginationMeta,
  sendCreated,
  sendNoContent,
  sendSuccess,
} from '../../shared/responses/api-response.js';
import { getValidatedQuery } from '../../shared/validation/validate.js';
import * as usersService from './users.service.js';
import type { ListUsersFilters } from './users.types.js';

/**
 * HTTP handling for the users module.
 *
 * Controllers read validated input, call the service, and return the standard
 * envelope. They never call Better Auth, Prisma, or a repository directly.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = getValidatedQuery<ListUsersFilters>(res);
    const result = await usersService.listUsers(filters);

    sendSuccess(
      res,
      result.users,
      buildPaginationMeta(filters.page, filters.pageSize, result.totalRecords),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await usersService.getUser(req.params['id'] as string));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as {
      name: string;
      email: string;
      password: string;
      role: GreenstoneRole;
    };

    sendCreated(res, await usersService.createUser(body, getRequestContext(res)));
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role } = req.body as { role: GreenstoneRole };

    sendSuccess(
      res,
      await usersService.updateUserRole(
        { userId: req.params['id'] as string, role },
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body as { reason?: string };

    sendSuccess(
      res,
      await usersService.deactivateUser(
        { userId: req.params['id'] as string, reason },
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = req.body as { reason?: string };

    sendSuccess(
      res,
      await usersService.activateUser(
        { userId: req.params['id'] as string, reason },
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function revokeSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await usersService.revokeUserSessions(req.params['id'] as string, getRequestContext(res));
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

export async function grantCapability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { capability } = req.body as { capability: Capability };

    sendSuccess(
      res,
      await usersService.grantUserCapability(
        { userId: req.params['id'] as string, capability },
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function revokeCapability(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { capability } = req.body as { capability: Capability };

    sendSuccess(
      res,
      await usersService.revokeUserCapability(
        { userId: req.params['id'] as string, capability },
        getRequestContext(res),
      ),
    );
  } catch (error) {
    next(error);
  }
}
