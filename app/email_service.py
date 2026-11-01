import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any, Tuple


def _get_setting(key: str, default: str = "") -> str:
    """Reads from environment variables first, falling back to local .env file if present."""
    val = os.getenv(key, "").strip()
    if val:
        return val
    try:
        if os.path.exists(".env"):
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    if k.strip() == key:
                        return v.strip().strip('"').strip("'")
    except Exception:
        pass
    return default


def send_low_stock_email(
    product_name: str,
    sku: str,
    current_stock: int,
    reorder_level: int,
    warehouse_breakdown: List[Dict[str, Any]],
) -> Tuple[bool, str]:
    """
    Sends a low-stock alert email to the admin using 100% free options:
    1. Standard SMTP (e.g. Gmail with a free Google App Password)
    2. Safe demo fallback: if SMTP credentials are not configured, prints the
       formatted alert to console and returns success without crashing.
    """
    smtp_host = _get_setting("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(_get_setting("SMTP_PORT", "587") or "587")
    smtp_user = _get_setting("SMTP_USER", "")
    smtp_password = _get_setting("SMTP_PASSWORD", "")
    recipient = _get_setting("ALERT_RECIPIENT_EMAIL", smtp_user or "admin@stocksense.local")

    subject = f"[StockSense Alert] Low Stock Warning: {product_name} ({sku})"
    shortage = max(0, reorder_level - current_stock)

    # Build warehouse breakdown HTML rows
    rows_html = ""
    for wh in warehouse_breakdown:
        wh_name = wh.get("warehouse_name", "Unknown Warehouse")
        qty = wh.get("total_quantity", 0)
        nearest = wh.get("nearest_expiry") or "N/A"
        rows_html += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">{wh_name}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: right; font-weight: bold;">{qty}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: right; color: #64748b;">{nearest}</td>
        </tr>
        """

    if not rows_html:
        rows_html = '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #94a3b8;">No warehouse batch details recorded yet.</td></tr>'

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>StockSense Low Stock Alert</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="background-color: #d97706; padding: 16px 24px; color: #ffffff;">
                <h1 style="margin: 0; font-size: 18px; font-weight: 600;">⚠️ StockSense Low Stock Warning</h1>
            </div>
            <div style="padding: 24px;">
                <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">
                    The inventory level for <strong>{product_name}</strong> (SKU: <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{sku}</code>) has dropped to or below its minimum threshold.
                </p>

                <div style="display: flex; gap: 16px; margin: 20px 0; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 16px;">
                    <div>
                        <div style="font-size: 12px; text-transform: uppercase; color: #92400e; font-weight: 600;">Current Stock</div>
                        <div style="font-size: 24px; font-weight: bold; color: #b45309;">{current_stock}</div>
                    </div>
                    <div style="margin-left: 32px;">
                        <div style="font-size: 12px; text-transform: uppercase; color: #92400e; font-weight: 600;">Reorder Level</div>
                        <div style="font-size: 24px; font-weight: bold; color: #475569;">{reorder_level}</div>
                    </div>
                    <div style="margin-left: 32px;">
                        <div style="font-size: 12px; text-transform: uppercase; color: #92400e; font-weight: 600;">Deficit</div>
                        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">-{shortage}</div>
                    </div>
                </div>

                <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Warehouse Distribution & Batches</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 8px 12px; font-size: 12px; color: #475569;">Warehouse</th>
                            <th style="padding: 8px 12px; font-size: 12px; color: #475569; text-align: right;">Quantity</th>
                            <th style="padding: 8px 12px; font-size: 12px; color: #475569; text-align: right;">Earliest Expiry</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                </table>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="https://prod-inventory-management.vercel.app/stock-adjustment" style="display: inline-block; background-color: #4a6fa5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">Open StockSense Dashboard</a>
                </div>
            </div>
            <div style="background-color: #f8fafc; padding: 12px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                Automated alert generated by StockSense Inventory Management
            </div>
        </div>
    </body>
    </html>
    """

    # If no SMTP credentials provided, run in safe demo mode (log and return True)
    if not smtp_user or not smtp_password:
        print(f"[StockSense Email] [DEMO MODE - No SMTP credentials configured]")
        print(f" -> Subject: {subject}")
        print(f" -> Recipient: {recipient}")
        print(f" -> Product: {product_name} | Stock: {current_stock}/{reorder_level} units")
        return (
            True,
            f"Alert triggered for {product_name} (Logged in Demo Mode - configure SMTP_USER/SMTP_PASSWORD for live emails)",
        )

    # Attempt live SMTP dispatch
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = recipient

        text_part = MIMEText(
            f"StockSense Alert: {product_name} ({sku}) is low on stock ({current_stock}/{reorder_level} units remaining).",
            "plain",
        )
        html_part = MIMEText(html_body, "html")

        msg.attach(text_part)
        msg.attach(html_part)

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [recipient], msg.as_string())

        return True, f"Low-stock alert email sent successfully to {recipient}"
    except Exception as exc:
        print(f"[StockSense Email Error] Failed to send email: {exc}")
        return False, f"Failed to deliver email: {str(exc)}"

