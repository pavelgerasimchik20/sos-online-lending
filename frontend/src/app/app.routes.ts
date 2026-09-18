import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/models';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'kyc',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/kyc.component').then((m) => m.KycComponent),
  },
  {
    path: 'borrower',
    canActivate: [roleGuard],
    data: { roles: [UserRole.BORROWER] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/borrower/borrower-dashboard.component').then((m) => m.BorrowerDashboardComponent),
      },
      {
        path: 'apply',
        loadComponent: () => import('./features/borrower/apply.component').then((m) => m.ApplyComponent),
      },
      {
        path: 'applications/:id',
        loadComponent: () =>
          import('./features/borrower/application-detail.component').then((m) => m.ApplicationDetailComponent),
      },
      {
        path: 'loans/:id',
        loadComponent: () => import('./features/borrower/loan-detail.component').then((m) => m.LoanDetailComponent),
      },
    ],
  },
  {
    path: 'lender',
    canActivate: [roleGuard],
    data: { roles: [UserRole.LENDER] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/lender/lender-dashboard.component').then((m) => m.LenderDashboardComponent),
      },
      {
        path: 'marketplace',
        loadComponent: () => import('./features/lender/marketplace.component').then((m) => m.MarketplaceComponent),
      },
      {
        path: 'loans/:id',
        loadComponent: () =>
          import('./features/lender/lender-loan-view.component').then((m) => m.LenderLoanViewComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { roles: [UserRole.ADMIN] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
