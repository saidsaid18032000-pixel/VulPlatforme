import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = (route.data?.['roles'] as string[]) || [];

  if (!expectedRoles.length || authService.hasAnyRole(expectedRoles)) {
    return true;
  }

  // User does not have the required role, redirect to dashboard
  router.navigate(['/dashboard']);
  return false;
};
