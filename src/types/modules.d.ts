/**
 * Ambient module declarations for non-JS assets imported in app code.
 * The Next.js plugin normally provides these at runtime; this static fallback
 * ensures `tsgo` (which does not load editor plugins) can type-check side-effect
 * CSS imports like `import "./globals.css"`.
 */
declare module "*.css";
declare module "*.svg" {
  const content: string;
  export default content;
}
