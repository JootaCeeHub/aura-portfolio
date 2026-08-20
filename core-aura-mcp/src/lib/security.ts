export const Security = {
  validateToken(token: string | undefined, allowed: string[]): boolean {
    return !!token && allowed.includes(token as string);
  },

  validateScopes(required: string[], userScopes: string[]) {
    return required.every((s) => userScopes.includes(s));
  },
};

