export default {

    async fetch(request, env) {

        const origin = request.headers.get("Origin") || "";

        const headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        };

        // Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers
            });
        }

        // POST ONLY
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers
            });
        }

        // Allowed domains
        const allowed = env.ALLOWED_ORIGINS
            .split(",")
            .map(x => x.trim());

        if (!allowed.includes(origin)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Origin not allowed"
                }),
                {
                    status: 403,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // JSON required
        if (!request.headers.get("content-type")?.includes("application/json")) {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Content-Type must be application/json"
                }),
                {
                    status: 400,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        let body;

        try {
            body = await request.json();
        }
        catch {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid JSON"
                }),
                {
                    status: 400,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!body.file) {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Missing file"
                }),
                {
                    status: 400,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (body.data === undefined) {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Missing data"
                }),
                {
                    status: 400,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // Protection against ../
        if (
            body.file.includes("..") ||
            body.file.startsWith("/") ||
            body.file.startsWith("\\")
        ) {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid filename"
                }),
                {
                    status: 400,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        try {

            await env.BUCKET.put(
                body.file,
                JSON.stringify(body.data, null, 2),
                {
                    httpMetadata: {
                        contentType: "application/json"
                    }
                }
            );

            return new Response(
                JSON.stringify({
                    success: true,
                    file: body.file
                }),
                {
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );

        }
        catch (err) {

            return new Response(
                JSON.stringify({
                    success: false,
                    error: err.message
                }),
                {
                    status: 500,
                    headers: {
                        ...headers,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

    }

}