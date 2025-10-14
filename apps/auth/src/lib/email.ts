import { Resend } from "resend";
import { render } from "@react-email/components";
import type { Env } from "../types/env";
import { MagicLinkEmail } from "../emails/magic-link";

const APP_NAMES: Record<string, string> = {
  gtd: "GTD Task Tracker",
  // Add more apps as needed
};

export async function sendMagicLinkEmail(
  env: Env,
  to: string,
  magicLink: string,
  appId?: string
): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);
  const appName = appId ? APP_NAMES[appId] || "Our App" : "Our App";

  // Render the React Email component to HTML
  const html = await render(MagicLinkEmail({ magicLink, appName }));

  console.info('📧', { magicLink });

  // Generate plain text version
  const text = `
Sign in to ${appName}

Click the link below to sign in to your account. This link will expire in 15 minutes.

${magicLink}

If you didn't request this email, you can safely ignore it.
  `.trim();

  await resend.emails.send({
    from: "noreply@email.chrisesplin.com",
    to,
    subject: `Sign in to ${appName}`,
    html,
    text,
  });
}
