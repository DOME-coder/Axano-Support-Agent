// Re-export every schema table so drizzle-kit picks them all up
// from a single entry point. Knowledge tables arrive in sprint 3.

export * from './tenants';
export * from './avatar-configs';
export * from './conversations';
export * from './messages';
