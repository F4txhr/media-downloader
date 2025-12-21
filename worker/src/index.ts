import Toucan from "toucan-js";

export class RateLimiter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) {
      return new Response("No IP address found.", { status: 400 });
    }

    const key = `requests:${ip}`;
    let count = (await this.state.storage.get<number>(key)) || 0;

    if (count > 10) {
      return new Response("Rate limit exceeded.", { status: 429 });
    }

    count++;
    await this.state.storage.put(key, count, { expirationTtl: 60 });

    return new Response(null, { status: 204 });
  }
}

export default {
  async fetch(request: Request, env: any, context: any): Promise<Response> {
    const Sentry = new Toucan({
      dsn: "https://example.com/sentry", // Replace with your Sentry DSN
      context,
      request,
      allowedHeaders: ["user-agent"],
      allowedSearchParams: /(.*)/,
      release: "1.0.0",
    });

    try {
      const url = new URL(request.url);

      if (url.pathname === "/analyze" && request.method === "POST") {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        let response = await cache.match(cacheKey);

        if (response) {
          return response;
        }

        const id = env.RATE_LIMITER.idFromName(request.headers.get("CF-Connecting-IP"));
        const stub = env.RATE_LIMITER.get(id);
        const rateLimitResponse = await stub.fetch(request);
        if (!rateLimitResponse.ok) {
          return rateLimitResponse;
        }

        const { url: mediaUrl } = await request.json();

        const allowedHosts = ["www.youtube.com", "youtube.com", "youtu.be"];
        const requestUrl = new URL(mediaUrl);

        if (!allowedHosts.includes(requestUrl.hostname)) {
          return new Response(JSON.stringify({ error: "Invalid or unsupported URL." }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${env.SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(mediaUrl)}`;
        const scrapingBeeResponse = await fetch(scrapingBeeUrl);
        if (!scrapingBeeResponse.ok) {
          throw new Error("Failed to fetch metadata from ScrapingBee.");
        }
        const text = await scrapingBeeResponse.text();

        // This is a simplified parsing logic. A more robust solution would use a proper HTML parser.
        const titleMatch = text.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1] : "Unknown Title";

        const thumbnailMatch = text.match(/<meta property="og:image" content="(.*?)"/);
        const thumbnail = thumbnailMatch ? thumbnailMatch[1] : "/placeholder.svg";

        const mediaInfo = {
          thumbnail,
          title,
          duration: "N/A", // ScrapingBee doesn't provide duration directly
        };

        response = new Response(JSON.stringify(mediaInfo), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "s-maxage=60",
          },
        });

        context.waitUntil(cache.put(cacheKey, response.clone()));

        return response;
      }

      return new Response("Not found", {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    } catch (err) {
      Sentry.captureException(err);
      return new Response("Internal Server Error", {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
