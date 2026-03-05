## Alternative: Switch to Gmail SMTP (Backup Option)

If Zoho continues to have issues, you can switch to Gmail SMTP:

### Gmail Setup:
1. **Enable 2-Factor Authentication** on Gmail account
2. **Generate App Password**:
   - Google Account → Security → App passwords
   - Generate password for "Mail"
3. **Update .env with Gmail settings**:

```env
# SMTP Configuration for Email - Using Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=cinaney@gmail.com
SMTP_PASSWORD=YOUR_GMAIL_APP_PASSWORD_HERE
SUPPORT_EMAIL=cinaney@gmail.com
```

### Then run test:
```bash
cd backend
python test_email_after_fix.py
```

### Zoho vs Gmail SMTP Settings:

**Zoho (Current):**
- Host: smtp.zoho.com
- Port: 465 
- SSL: Yes

**Gmail (Alternative):**
- Host: smtp.gmail.com  
- Port: 465
- SSL: Yes

Both use the same port and SSL settings, so the current email service code will work with either provider.