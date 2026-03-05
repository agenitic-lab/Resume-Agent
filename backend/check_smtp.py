from config import settings

print('SMTP Configuration:')
print(f'SMTP_HOST: {settings.SMTP_HOST}')
print(f'SMTP_PORT: {settings.SMTP_PORT}')
print(f'SMTP_USER: {settings.SMTP_USER}')
print(f'SUPPORT_EMAIL: {settings.SUPPORT_EMAIL}')
print(f'SMTP_PASSWORD set: {"Yes" if settings.SMTP_PASSWORD else "No"}')