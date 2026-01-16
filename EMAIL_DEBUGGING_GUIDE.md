# Email Delivery Debugging Guide for Render.com

## Root Cause Analysis

### Primary Issues Identified:

1. **Silent Environment Variable Failures**
   - Resend client was initialized with `undefined` if `RESEND_API_KEY` was missing
   - No runtime validation or logging of environment variables
   - Production errors were swallowed without detailed logging

2. **Request Lifecycle Issues**
   - Email sending happens AFTER response is sent in some cases
   - Render.com kills background tasks when HTTP response completes
   - Webhook callbacks might return before email completes

3. **Insufficient Error Logging**
   - Generic error messages without context
   - No timing information to detect slow/failed API calls
   - Missing Resend API response details

4. **Domain Verification**
   - Using `onboarding@resend.dev` fallback which may not work in production
   - No validation that FROM_EMAIL is verified in Resend dashboard

5. **Missing Awaits (Potential)**
   - All email calls are properly awaited, but error handling could mask failures

## Fixed Code Changes

### 1. Enhanced Email Service (`utils/emailService.js`)

**Key Improvements:**
- ✅ Environment variable validation on module load
- ✅ Detailed logging for every email attempt
- ✅ Timing information for performance monitoring
- ✅ Structured error logging with stack traces
- ✅ Resend API response logging
- ✅ Graceful fallback for development mode

**What to Look For in Logs:**
```
📧 EMAIL SERVICE ENVIRONMENT CHECK
📧 RESEND_API_KEY: ✅ SET
📧 FROM_EMAIL: ✅ SET (your-email@yourdomain.com)
📧 NODE_ENV: production

📧 [OTP Email] user@example.com - Starting email send...
📧 [OTP Email] user@example.com - Sending email via Resend API...
✅ [OTP Email] user@example.com - Email sent successfully in 234ms
✅ [OTP Email] user@example.com - Resend message ID: re_xxxxx
```

### 2. Enhanced Payment Controller (`controllers/payment.controller.js`)

**Key Improvements:**
- ✅ Email sent BEFORE HTTP response in webhook callbacks
- ✅ Detailed logging with context prefixes
- ✅ Error logging with order IDs for traceability

### 3. Enhanced Auth Controller (`controllers/auth.controller.js`)

**Key Improvements:**
- ✅ Detailed logging for OTP email attempts
- ✅ Better error context in production

## Render.com Deployment Checklist

### ✅ Environment Variables

Verify these are set in Render Dashboard → Your Service → Environment:

1. **RESEND_API_KEY**
   - Format: `re_xxxxxxxxxxxxx`
   - Get from: https://resend.com/api-keys
   - **CRITICAL**: Must start with `re_`

2. **FROM_EMAIL**
   - Format: `noreply@yourdomain.com` or `hello@yourdomain.com`
   - **CRITICAL**: Must be a verified domain in Resend
   - **NOT**: Don't use `onboarding@resend.dev` in production
   - Verify domain in: https://resend.com/domains

3. **NODE_ENV**
   - Set to: `production`
   - This ensures dev mode fallbacks are disabled

4. **ALLOW_DEV_OTP** (Optional)
   - Only set to `true` if you want console OTP logging in production
   - **NOT RECOMMENDED** for production

### ✅ Resend Domain Verification

1. Go to https://resend.com/domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records as instructed:
   - SPF record
   - DKIM records
   - DMARC record (optional but recommended)
4. Wait for verification (usually 5-10 minutes)
5. Use verified domain email in `FROM_EMAIL` env var

**Example:**
- Domain: `earthandharvest.com`
- FROM_EMAIL: `noreply@earthandharvest.com` ✅

### ✅ Render Service Type

**CRITICAL**: Ensure your service is a **Web Service**, not a Background Worker

- Web Service: ✅ Correct (handles HTTP requests)
- Background Worker: ❌ Wrong (only for scheduled tasks)

### ✅ Network & Ports

- ✅ No SMTP port 25 usage (Resend uses HTTPS API)
- ✅ Outbound HTTPS allowed (port 443) - Render allows this by default
- ✅ No firewall restrictions needed

### ✅ Testing in Production

1. **Check Logs After Deployment:**
   ```bash
   # In Render Dashboard → Logs, look for:
   📧 EMAIL SERVICE ENVIRONMENT CHECK
   ```

2. **Test OTP Email:**
   - Trigger login flow
   - Check Render logs for:
     ```
     📧 [Send OTP] Attempting to send OTP email to user@example.com...
     ✅ [Send OTP] OTP email sent successfully
     ```

3. **Test Order Confirmation:**
   - Complete a test payment
   - Check Render logs for:
     ```
     📧 [Order Confirmation] user@example.com - Starting email send...
     ✅ [Order Confirmation] user@example.com - Email sent successfully
     ```

4. **Check Resend Dashboard:**
   - Go to https://resend.com/emails
   - Verify emails are being sent
   - Check for any bounces or failures

## Common Issues & Solutions

### Issue: "Email service not configured"

**Symptoms:**
```
⚠️  RESEND_API_KEY is not set. Email functionality will be disabled.
```

**Solution:**
1. Go to Render Dashboard → Environment
2. Add `RESEND_API_KEY` with your Resend API key
3. Redeploy service

### Issue: "FROM_EMAIL not set"

**Symptoms:**
```
⚠️  FROM_EMAIL not set. Using fallback: onboarding@resend.dev
```

**Solution:**
1. Verify domain in Resend dashboard
2. Set `FROM_EMAIL` env var to verified domain email
3. Redeploy service

### Issue: "Resend API error"

**Symptoms:**
```
❌ [OTP Email] Resend API error: Invalid API key
```

**Solutions:**
1. Verify `RESEND_API_KEY` is correct (starts with `re_`)
2. Check API key hasn't been revoked in Resend dashboard
3. Regenerate API key if needed

### Issue: "Email sent but not received"

**Possible Causes:**
1. **Spam Folder**: Check recipient's spam folder
2. **Domain Not Verified**: FROM_EMAIL domain must be verified
3. **Invalid Recipient**: Email address format might be wrong
4. **Rate Limiting**: Check Resend dashboard for rate limits

**Debug Steps:**
1. Check Resend dashboard → Emails for delivery status
2. Check Render logs for Resend message ID
3. Verify recipient email in logs matches actual email

### Issue: "Emails work locally but not in production"

**Common Causes:**
1. Environment variables not set in Render
2. Different `NODE_ENV` values
3. Domain not verified in Resend
4. Render service type incorrect

**Solution:**
1. Compare local `.env` with Render environment variables
2. Ensure all required vars are set
3. Verify domain in Resend
4. Check Render service type is "Web Service"

## Expected Log Output (Success)

### On Service Start:
```
📧 ============================================
📧 EMAIL SERVICE ENVIRONMENT CHECK
📧 ============================================
📧 RESEND_API_KEY: ✅ SET
📧 FROM_EMAIL: ✅ SET (noreply@yourdomain.com)
📧 NODE_ENV: production
📧 ============================================
✅ Resend client initialized successfully
```

### On OTP Send:
```
📧 [Send OTP] Attempting to send OTP email to user@example.com...
📧 [OTP Email] user@example.com - Starting email send...
📧 [OTP Email] user@example.com - Timestamp: 2024-01-15T10:30:00.000Z
📧 [OTP Email] user@example.com - Building email content...
📧 [OTP Email] user@example.com - Sending email via Resend API...
📧 [OTP Email] user@example.com - From: noreply@yourdomain.com
📧 [OTP Email] user@example.com - To: user@example.com
📧 [OTP Email] user@example.com - Payload prepared (subject: "Your One-Time Password for Earth & Harvest")
✅ [OTP Email] user@example.com - Email sent successfully in 234ms
✅ [OTP Email] user@example.com - Resend message ID: re_abc123xyz
✅ [Send OTP] OTP email sent successfully { messageId: 're_abc123xyz', duration: '234ms' }
```

### On Order Confirmation:
```
📧 [Payment Callback] Attempting to send order confirmation email...
📧 [Order Confirmation] user@example.com - Starting email send...
📧 [Order Confirmation] user@example.com - Order ID: 507f1f77bcf86cd799439011
📧 [Order Confirmation] user@example.com - Timestamp: 2024-01-15T10:35:00.000Z
📧 [Order Confirmation] user@example.com - Building email content...
📧 [Order Confirmation] user@example.com - Sending email via Resend API...
✅ [Order Confirmation] user@example.com - Email sent successfully in 312ms
✅ [Order Confirmation] user@example.com - Resend message ID: re_def456uvw
✅ [Payment Callback] Order confirmation email sent to user@example.com { messageId: 're_def456uvw', duration: '312ms' }
```

## Monitoring & Alerts

### Set Up Monitoring:

1. **Render Logs**: Monitor for error patterns
   - Look for `❌` in logs
   - Set up alerts for repeated failures

2. **Resend Dashboard**: 
   - Monitor email delivery rates
   - Check bounce rates
   - Review API usage

3. **Application Metrics**:
   - Track email send success rate
   - Monitor email send duration
   - Alert on high failure rates

## Support Resources

- **Resend Docs**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **Render Docs**: https://render.com/docs
- **Render Support**: support@render.com

## Quick Verification Script

After deployment, you can verify email service is working by:

1. **Check Environment Variables:**
   - Look for "EMAIL SERVICE ENVIRONMENT CHECK" in logs
   - Verify all show "✅ SET"

2. **Test OTP Flow:**
   - Trigger login
   - Check logs for successful email send
   - Verify email received

3. **Test Order Flow:**
   - Complete test payment
   - Check logs for order confirmation email
   - Verify email received

---

**Last Updated**: 2024-01-15
**Version**: 2.0 (Production-Safe with Enhanced Logging)

