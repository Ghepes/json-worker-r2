export default {

    async fetch(request, env) {

        const origin = request.headers.get("Origin") || "";

        const headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        };

        // CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers
            });
        }

        // POST ONLY - secretly - through worker, otherwise it doesn't work
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers
            });
        }

        // Allowed domains - what we want
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

        // And we demand JSON because it has no escape
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

        // Protection against whoever wants it ../
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
            let contentToPut;
            let contentType = "application/json";

            // We check if the file is an image, if aliens - you don't understand
            if (body.file.startsWith("img/")) {
                // Clean the Base64 header as Mastari sef
                const base64Data = body.data.replace(/^data:image\/\w+;base64,/, "");
                
                // Convert Base64 -> Binary like the 90s.
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                contentToPut = bytes.buffer;

                // We set the correct Content-Type so that not downloads it
                const ext = body.file.split('.').pop().toLowerCase();
                if (ext === 'png') contentType = "image/png";
                else if (ext === 'webp') contentType = "image/webp";
                else if (ext === 'gif') contentType = "image/gif";
                else contentType = "image/jpeg"; 

            } else {
                // If it's the reports.json file
                contentToPut = JSON.stringify(body.data, null, 2);
            }

            // We write in R2 as masterchef
            await env.BUCKET.put(
                body.file,
                contentToPut,
                {
                    httpMetadata: {
                        contentType: contentType
                    }
                }
            );
            // Response as ox and return cow
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
        // Here We catch suckers
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