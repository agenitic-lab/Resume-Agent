## Email Fix Instructions

### Problem: SMTP Authentication Failed (Error 535)

The SMTP configuration is correct but the password is failing authentication.

### Solution: Update Zoho SMTP Password

1. **Login to Zoho Mail Admin**:
   - Go to https://accounts.zoho.com/
   - Login with support@resiko.app credentials

2. **Generate App-Specific Password**:
   - Go to Security → App Specific Passwords
   - Create new password for "SMTP/Email Service"
   - Copy the generated password

3. **Update .env file**:
   - Replace SMTP_PASSWORD=SxwusmvxsGXt 
   - With the new app password

4. **Alternative: Enable Less Secure Apps** (if using regular password):
   - In Zoho Security settings
   - Enable "Less secure app access"

5. **Test the configuration** by running the backend

### Current SMTP Settings:
- Host: smtp.zoho.com ✓
- Port: 465 ✓  
- User: support@resiko.app ✓
- Password: ❌ Authentication Failed

### Expected Result:
- Support emails will be sent to support@resiko.app
- User confirmation emails will be sent to the submitter
- Both emails visible in Zoho inbox