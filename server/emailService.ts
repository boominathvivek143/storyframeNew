import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'Storyframe <onboarding@resend.dev>';
}

// Falls back to a console log instead of throwing when Resend isn't
// configured yet, so signup still completes end-to-end in local dev before
// the user has wired up a real sending domain.
async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.log(`[emailService] RESEND_API_KEY not set -- would send to ${to}:\n${text}`);
    return;
  }
  const { error } = await resend.emails.send({ from: fromAddress(), to, subject, text, html });
  if (error) {
    console.error('[emailService] Resend send failed:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Failed to send email');
  }
}

export async function sendWelcomeCredentialsEmail(email: string, password: string): Promise<void> {
  const appUrl = process.env.APP_BASE_URL?.trim() || '';
  const text = `Welcome to Storyframe!

Your account is ready with 10 free credits to explore story creation.

Login email: ${email}
Password: ${password}
${appUrl ? `\nSign in here: ${appUrl}` : ''}

You can recharge more credits anytime from inside the studio once these run out.`;

  const html = `
    <div style="font-family:sans-serif;line-height:1.5;color:#1b1408;">
      <h2>Welcome to Storyframe!</h2>
      <p>Your account is ready with <strong>10 free credits</strong> to explore story creation.</p>
      <p>
        <strong>Login email:</strong> ${email}<br/>
        <strong>Password:</strong> <code>${password}</code>
      </p>
      ${appUrl ? `<p><a href="${appUrl}">Sign in to Storyframe</a></p>` : ''}
      <p>You can recharge more credits anytime from inside the studio once these run out.</p>
    </div>
  `;

  await sendMail(email, 'Your Storyframe account is ready', text, html);
}

export async function sendPasswordResetEmail(email: string, password: string): Promise<void> {
  const text = `Your Storyframe password has been reset.

Login email: ${email}
New password: ${password}

Use this to sign back in.`;

  const html = `
    <div style="font-family:sans-serif;line-height:1.5;color:#1b1408;">
      <h2>Your Storyframe password was reset</h2>
      <p>
        <strong>Login email:</strong> ${email}<br/>
        <strong>New password:</strong> <code>${password}</code>
      </p>
      <p>Use this to sign back in.</p>
    </div>
  `;

  await sendMail(email, 'Your Storyframe password was reset', text, html);
}
