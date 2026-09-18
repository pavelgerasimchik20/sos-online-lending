import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.parseUrl('/login');
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['roles'] as UserRole[] | undefined;
  if (!auth.isLoggedIn()) return router.parseUrl('/login');
  if (!required || required.length === 0) return true;
  if (required.some((role) => auth.hasRole(role))) return true;
  return router.parseUrl('/');
};
