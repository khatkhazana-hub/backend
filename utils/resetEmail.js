// utils/templates/resetEmail.js
function escape(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = function resetEmailTemplate({
  appName = "KhatKhazana",
  resetUrl = "#",
  expiresMins = 15,
  supportEmail = "support@example.com",
  logoUrl = "https://www.gstatic.com/images/branding/product/1x/mail_48dp.png", // swap with your logo
  primary = "#1a73e8",       // Google-ish blue
  textColor = "#202124",
  muted = "#5f6368",
  bg = "#f6f9fc",
  cardBg = "#ffffff"
} = {}) {
  const safeApp = escape(appName);
  const safeUrl = resetUrl; // URL can stay raw for href

  return `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your password</title>
    <style>
      /* Client resets */
      body, table, td, a { font-family: Roboto, Arial, Helvetica, sans-serif; }
      img { border: 0; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { margin: 0 !important; padding: 0 !important; background: ${bg}; color: ${textColor}; }
      a { color: ${primary}; text-decoration: none; }

      /* Dark mode (partial support in Gmail) */
      @media (prefers-color-scheme: dark) {
        body { background: #0b0c0f !important; color: #e8eaed !important; }
        .card { background: #17181b !important; }
        .muted { color: #9aa0a6 !important; }
        .btn { background: ${primary} !important; color: #fff !important; }
      }

      /* Mobile */
      @media screen and (max-width: 600px) {
        .container { width: 100% !important; }
        .card { padding: 24px !important; border-radius: 16px !important; }
        h1 { font-size: 22px !important; }
        p { font-size: 14px !important; line-height: 22px !important; }
        .btn { display: block !important; width: 100% !important; text-align: center !important; }
      }
    </style>
  </head>

  <body style="background:${bg};">
    <!-- Preheader (hidden preview text in inbox) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Reset your ${safeApp} password. This link expires in ${expiresMins} minutes.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg}; padding: 32px 0;">
      <tr>
        <td align="center">
          <table class="container" role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:560px; max-width: 560px;">
            
                </table>
              </td>
            </tr>

            <!-- card -->
            <tr>
              <td>
                <table role="presentation" width="100%" class="card" cellspacing="0" cellpadding="0"
                  style="background:${cardBg}; border-radius: 20px; padding: 32px;">
                  <tr>
                    <td>
                      <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; letter-spacing: .2px;">
                        Reset your password
                      </h1>
                      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px;">
                        You requested to reset your ${safeApp} password. Click the button below to create a new one.
                        This link will expire in <strong>${expiresMins} minutes</strong>.
                      </p>

                      <!-- button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                        <tr>
                          <td>
                            <a href="${safeUrl}" class="btn"
                              style="display:inline-block; background:${primary}; color:#ffffff; 
                                     padding: 12px 20px; border-radius: 8px; font-weight: 600; 
                                     font-size: 14px;">
                              Reset password
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- footer -->
            <tr>
              <td align="center" style="padding: 16px 8px 0 8px;">
                <p class="muted" style="font-size: 12px; color:${muted}; margin: 8px 0 0 0;">
                  © ${new Date().getFullYear()} ${safeApp}. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
