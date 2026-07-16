// Transactional email via Resend's plain REST API — no SDK dependency needed,
// it's a single authenticated POST. Per docs/SPEC.md section 10, these are the
// essential emails (request sent/accepted/declined/expired/cancelled) that must
// always send regardless of a user's non-essential-email opt-in toggle.
// No-ops silently if RESEND_API_KEY isn't configured, so local dev/testing never
// requires a real email provider.
export async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Campus Travel <onboarding@resend.dev>",
        to,
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error("email send failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("email send failed", err);
  }
}
