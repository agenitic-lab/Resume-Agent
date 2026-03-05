# Gmail SMTP Setup Instructions (Alternative to Zoho)

If Zoho continues to have authentication issues, switch to Gmail:

## Step 1: Generate Gmail App Password
1. Login to Gmail: cinaney@gmail.com
2. Go to Google Account → Security
3. Enable 2-Factor Authentication (if not already)
4. Generate App Password:
   - Select "Mail" as the app
   - Copy the generated 16-character password

## Step 2: Update .env File
Replace the SMTP section with:

```env
# SMTP Configuration for Email - Using Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=cinaney@gmail.com
SMTP_PASSWORD=YOUR_GMAIL_APP_PASSWORD_HERE
SUPPORT_EMAIL=cinaney@gmail.com
```

## Step 3: Test
Run: `cd backend && python test_email_after_fix.py`

## Benefits of Gmail:
- More reliable authentication
- Better deliverability
- Less prone to password expiration
- Same SSL settings (port 465)

Both Zoho and Gmail will work with the existing code - just need to update the credentials.