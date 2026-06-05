import { AuthUser } from "./auth";

declare global {
  namespace Express {
    // Passport populates `req.user` with the deserialized session user.
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthUser {}
  }
}

// passport-line-auth ships no type definitions; treat it as `any`.
declare module "passport-line-auth";

export {};
