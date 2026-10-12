export type SessionType = 'SUPER_ADMIN' | 'TENANT_USER';

export interface LoginResponse {
  token: string;
  type: SessionType;
  roles: string[];
  permissions: string[];
  tenantNom: string | null;
  tenantCode: string | null;
}

export interface Session {
  token: string;
  type: SessionType;
  roles: string[];
  permissions: string[];
  tenantNom: string | null;
  tenantCode: string | null;
}

export interface LoginTenantRequest {
  codeEtablissement: string;
  email: string;
  password: string;
}

export interface LoginSuperAdminRequest {
  email: string;
  password: string;
}
