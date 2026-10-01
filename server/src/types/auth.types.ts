export interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export interface AuthAdmin {
  email: string;
  role: "admin";
}

export interface LoginResponse {
  token: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthAdmin;
    }
  }
}
