declare module "swagger-ui-dist/swagger-ui-es-bundle.js" {
  const SwaggerUIBundle: (options: {
    url: string;
    domNode: HTMLElement;
  }) => void;
  export default SwaggerUIBundle;
  export { SwaggerUIBundle };
}

declare module "swagger-ui-dist/swagger-ui.css";
