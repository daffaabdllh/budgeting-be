/**
 * Sends an email using the Resend HTTP API.
 * Uses native fetch which is supported out-of-the-box by Cloudflare Workers.
 */
export const sendEmail = async (
    env: { RESEND_API_KEY: string },
    options: {
        to: string;
        subject: string;
        html: string;
        from?: string;
    }
) => {
    // Default sender is Resend's onboarding email.
    // Replace with a verified custom domain sender once set up.
    const from = options.from || "Acme <onboarding@resend.dev>";

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: [options.to],
            subject: options.subject,
            html: options.html,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend email sending failed: ${errorText}`);
    }

    return await response.json();
};
