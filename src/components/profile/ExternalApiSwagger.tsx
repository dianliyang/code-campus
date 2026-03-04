"use client";

import { useEffect, useMemo, useRef } from "react";
import { externalApiOpenApiSpec } from "@/lib/external-api-openapi";import { Card } from "@/components/ui/card";

type SwaggerWindow = Window & {
  SwaggerUIBundle?: (config: Record<string, unknown>) => unknown;
  SwaggerUIStandalonePreset?: unknown;
};

export default function ExternalApiSwagger() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const spec = useMemo(() => externalApiOpenApiSpec, []);

  useEffect(() => {
    const w = window as SwaggerWindow;
    const initSwagger = () => {
      if (!w.SwaggerUIBundle || !rootRef.current) return;
      w.SwaggerUIBundle({
        domNode: rootRef.current,
        spec,
        deepLinking: true,
        defaultModelsExpandDepth: 2,
        docExpansion: "list",
        displayRequestDuration: true
      });
    };

    if (!document.getElementById("swagger-ui-css")) {
      const link = document.createElement("link");
      link.id = "swagger-ui-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);
    }

    if (w.SwaggerUIBundle) {
      initSwagger();
      return;
    }

    let script = document.getElementById("swagger-ui-js") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "swagger-ui-js";
      script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", initSwagger);

    return () => {
      script?.removeEventListener("load", initSwagger);
    };
  }, [spec]);

  return (
    <Card>
      <div className="h-full overflow-auto p-2">
        <div ref={rootRef} className="swagger-ui-host" />
      </div>
    </Card>);

}