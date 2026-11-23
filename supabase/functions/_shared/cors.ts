export const corsHeaders = {
  // Review R004 (23/11/2026): only the agency dashboard may call the functions from a browser.
  "Access-Control-Allow-Origin": "https://puntoassicurativo.github.io",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, PATCH, DELETE",
};

/**
 * Handle OPTIONS requests for CORS preflight.
 */
export function OptionsMiddleware(
  req: Request,
  next: (req: Request) => Promise<Response>,
) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return next(req);
}
