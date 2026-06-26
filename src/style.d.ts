// Type declarations for CSS modules
declare module "*.css" {
  const classes: Record<string, string>;
  export default classes;
}
