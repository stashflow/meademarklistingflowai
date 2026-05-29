# ListingFlow AI Supabase Auth Email Templates

Copy each HTML file into the matching Supabase Auth email template:

- `confirm-signup.html` -> Confirm sign up
- `invite-user.html` -> Invite user
- `magic-link.html` -> Magic link or OTP
- `change-email.html` -> Change email address
- `reset-password.html` -> Reset password
- `reauthentication.html` -> Reauthentication

Recommended sender:

```text
ListingFlow AI <no-reply@auth.meademarklabs.com>
```

Use custom SMTP with SPF, DKIM, and DMARC before sending production auth emails.
