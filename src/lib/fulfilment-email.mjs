import { FULFILMENT_TYPES } from "./fulfilment.mjs";

const FROM_EMAIL = "TGD LettingDesk <orders@tgd.trades-go-digital.co.uk>";
const REPLY_TO = "support@trades-go-digital.co.uk";
const SITE_URL = "https://trades-go-digital.co.uk";

export function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

export function formatGbp(amountTotal) {
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: "GBP",
	}).format(Number(amountTotal || 0) / 100);
}

export function buildFulfilmentUrl(sessionId) {
	return `${SITE_URL}/fulfilment/complete?session_id=${encodeURIComponent(sessionId)}`;
}

export function buildBuyerEmail(order) {
	const link = buildFulfilmentUrl(order.sessionId);
	const isLicence = order.fulfilmentType === FULFILMENT_TYPES.LICENCE;
	const heading = isLicence
		? "Your TGD LettingDesk download is ready"
		: "Complete your TGD LettingDesk installation form";
	const action = isLicence ? "Open secure download" : "Complete installation form";
	const explanation = isLicence
		? "Your secure source-code download is available for 7 days and permits up to three downloads."
		: "Please provide the information needed for branding, configuration, deployment and acceptance testing.";

	return {
		subject: heading,
		html: `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#101a2e">
  <div style="max-width:620px;margin:0 auto;padding:32px 18px">
    <div style="background:#101a2e;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0">
      <strong style="font-size:20px">Trades Go Digital</strong>
    </div>
    <div style="background:#fff;padding:30px 26px;border-radius:0 0 16px 16px">
      <h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(heading)}</h1>
      <p>Hello ${escapeHtml(order.customerName || "there")},</p>
      <p>Thank you for purchasing TGD LettingDesk. ${escapeHtml(explanation)}</p>
      <p style="margin:26px 0">
        <a href="${escapeHtml(link)}" style="background:#f97316;color:#fff;text-decoration:none;font-weight:bold;padding:14px 20px;border-radius:10px;display:inline-block">${escapeHtml(action)}</a>
      </p>
      <p><strong>Order total:</strong> ${escapeHtml(formatGbp(order.amountTotal))}</p>
      <p style="font-size:13px;color:#526075">Keep this email private because its link provides access to your order. If you need help, reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
	};
}

export function buildSellerEmail(order) {
	const type =
		order.fulfilmentType === FULFILMENT_TYPES.LICENCE
			? "Licence-only — automatic download"
			: "Licence + managed installation";
	return {
		subject: `New TGD LettingDesk sale — ${formatGbp(order.amountTotal)}`,
		html: `<!doctype html>
<html lang="en">
<body style="font-family:Arial,sans-serif;color:#101a2e">
  <h1>New TGD LettingDesk sale</h1>
  <p><strong>Customer:</strong> ${escapeHtml(order.customerName || "Not supplied")}</p>
  <p><strong>Email:</strong> ${escapeHtml(order.customerEmail)}</p>
  <p><strong>Business:</strong> ${escapeHtml(order.businessName || "Not supplied")}</p>
  <p><strong>Order:</strong> ${escapeHtml(type)}</p>
  <p><strong>Total:</strong> ${escapeHtml(formatGbp(order.amountTotal))}</p>
  <p><strong>Stripe session:</strong> ${escapeHtml(order.sessionId)}</p>
</body>
</html>`,
	};
}

async function sendResendEmail(apiKey, { to, subject, html }) {
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: FROM_EMAIL,
			to: [to],
			reply_to: REPLY_TO,
			subject,
			html,
		}),
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(result?.message || `Resend returned HTTP ${response.status}`);
	}
	return result.id;
}

async function recordDelivery(db, order, messageKind, recipient, send) {
	const createdAt = new Date().toISOString();
	try {
		const providerMessageId = await send();
		await db
			.prepare(
				`INSERT OR REPLACE INTO fulfilment_email_log
			 (session_id, message_kind, recipient, provider_message_id, status, error, created_at)
			 VALUES (?, ?, ?, ?, 'sent', NULL, ?)`,
			)
			.bind(order.sessionId, messageKind, recipient, providerMessageId || null, createdAt)
			.run();
	} catch (error) {
		const message = String(error instanceof Error ? error.message : error).slice(0, 1000);
		console.error(`Fulfilment email failed (${messageKind})`, order.sessionId, message);
		await db
			.prepare(
				`INSERT OR REPLACE INTO fulfilment_email_log
			 (session_id, message_kind, recipient, provider_message_id, status, error, created_at)
			 VALUES (?, ?, ?, NULL, 'failed', ?, ?)`,
			)
			.bind(order.sessionId, messageKind, recipient, message, createdAt)
			.run();
	}
}

export async function sendOrderEmails(env, order) {
	if (!env.RESEND_API_KEY) {
		console.error("RESEND_API_KEY is not configured; fulfilment emails were skipped.");
		return;
	}
	const buyerEmail = buildBuyerEmail(order);
	const tasks = [
		recordDelivery(env.FULFILMENT_DB, order, "buyer_fulfilment", order.customerEmail, () =>
			sendResendEmail(env.RESEND_API_KEY, {
				to: order.customerEmail,
				...buyerEmail,
			}),
		),
	];

	if (env.ORDER_NOTIFICATION_EMAIL) {
		const sellerEmail = buildSellerEmail(order);
		tasks.push(
			recordDelivery(
				env.FULFILMENT_DB,
				order,
				"seller_notification",
				env.ORDER_NOTIFICATION_EMAIL,
				() =>
					sendResendEmail(env.RESEND_API_KEY, {
						to: env.ORDER_NOTIFICATION_EMAIL,
						...sellerEmail,
					}),
			),
		);
	}
	await Promise.all(tasks);
}
