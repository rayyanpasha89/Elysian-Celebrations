# Clerk webhook setup

To sync users with Supabase and complete webhook setup:

1. Open the [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks** → **Add Endpoint**.
2. **URL:** `https://your-domain.com/api/webhooks/clerk` (use your production domain).
3. **Events:** subscribe to `user.created`, `user.updated`, and `user.deleted`.
4. Copy the **Signing Secret** from the webhook configuration and set `CLERK_WEBHOOK_SECRET` in your environment (e.g. `.env.local` / hosting provider secrets).
5. **Local development:** Clerk cannot reach `localhost` directly. Expose your dev server with a tunnel (e.g. [ngrok](https://ngrok.com/) or a Cloudflare Tunnel) and register that public URL as the webhook endpoint, or use Clerk’s dashboard tools to replay events after testing.
