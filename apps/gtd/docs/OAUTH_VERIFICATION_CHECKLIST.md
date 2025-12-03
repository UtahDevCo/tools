# Google OAuth Verification - Final Checklist

Use this checklist before sending your response to Google.

## Pre-Flight Checks

### ✅ Privacy Policy

Visit https://gtd.chrisesplin.com/policies and verify:

- [ ] **Page loads successfully** (no 404, no errors)
- [ ] **All required sections present**:
  - [ ] 1. Data We Access (with OAuth scope URLs)
  - [ ] 2. How We Use Your Data
  - [ ] 3. Data Sharing with Third Parties
  - [ ] 4. Data Storage and Protection
  - [ ] 5. Data Retention and Deletion
- [ ] **Contact information is correct**
  - [ ] Email: chris@chrisesplin.com (or your preferred email)
  - [ ] Respond within 5 business days statement
- [ ] **All external links work**:
  - [ ] Google privacy policy link
  - [ ] Firebase privacy policy link
  - [ ] Cloudflare privacy policy link
  - [ ] Google Account Permissions link
- [ ] **Mobile responsive**:
  - [ ] Open on phone and verify readability
  - [ ] All sections are accessible
  - [ ] No horizontal scrolling issues
- [ ] **No placeholder text**:
  - [ ] No "TODO", "[INSERT]", "PLACEHOLDER"
  - [ ] All dates/timestamps are correct
  - [ ] Last Updated date is December 3, 2025
- [ ] **Accurate statements**:
  - [ ] Analytics disclosure (if you use analytics)
  - [ ] Error tracking disclosure (if you use error tracking)
  - [ ] All service providers listed
  - [ ] Data retention periods are accurate

### ✅ Demo Video

- [ ] **Video recorded and uploaded**
  - [ ] Upload location: ☐ YouTube (unlisted) ☐ Google Drive (public)
  - [ ] Video link: ___________________________________
- [ ] **OAuth consent screen clearly shown**:
  - [ ] Google branding visible
  - [ ] App name visible
  - [ ] All 4 scopes visible:
    - [ ] Google Tasks (https://www.googleapis.com/auth/tasks)
    - [ ] Calendar Read-only (https://www.googleapis.com/auth/calendar.readonly)
    - [ ] Email (https://www.googleapis.com/auth/userinfo.email)
    - [ ] Profile (https://www.googleapis.com/auth/userinfo.profile)
- [ ] **User grants permission**:
  - [ ] Shows clicking "Allow" or "Continue" button
  - [ ] Shows loading/redirect
- [ ] **Successful authentication**:
  - [ ] Shows logged-in state (user avatar visible)
  - [ ] Shows tasks loading from Google Tasks API
  - [ ] Shows calendar events (if implemented)
- [ ] **Video quality**:
  - [ ] Resolution 720p or higher
  - [ ] No audio issues (if narrated)
  - [ ] Clear and easy to follow
  - [ ] 2-5 minutes length
- [ ] **Video accessibility**:
  - [ ] Tested link in incognito mode (works without login)
  - [ ] Link doesn't expire (YouTube/Drive links should be permanent)

### ✅ Email Response

- [ ] **Original Google email**:
  - [ ] You're replying to the original thread (not starting new)
  - [ ] Subject includes: Project 533544956312
- [ ] **Email content complete**:
  - [ ] Acknowledges both issues (privacy policy + demo video)
  - [ ] Privacy policy link included: https://gtd.chrisesplin.com/policies
  - [ ] Demo video link included: ___________________________________
  - [ ] Your full name at bottom
  - [ ] Your contact email at bottom
- [ ] **Accuracy check**:
  - [ ] Project ID correct: 533544956312
  - [ ] App name correct: GTD App (or Quiver Tools)
  - [ ] Production URL correct: https://gtd.chrisesplin.com/
  - [ ] All 4 OAuth scopes listed correctly
- [ ] **Tone check**:
  - [ ] Professional and respectful
  - [ ] Not defensive
  - [ ] Clear and concise
  - [ ] No typos or grammatical errors

### ✅ Application Verification

- [ ] **App is live and working**:
  - [ ] Visit https://gtd.chrisesplin.com/
  - [ ] Homepage loads
  - [ ] Sign-in button visible
- [ ] **OAuth flow works**:
  - [ ] Clear your app's permission: https://myaccount.google.com/permissions
  - [ ] Click sign-in on your app
  - [ ] OAuth consent screen appears
  - [ ] After approving, successfully logs in
  - [ ] Tasks load from Google Tasks API
  - [ ] Calendar events load (if implemented)
- [ ] **No console errors**:
  - [ ] Open browser DevTools (F12)
  - [ ] Check Console tab for JavaScript errors
  - [ ] Check Network tab for failed API calls

## Questions Answered

Have you provided answers to these questions?

- [ ] **Analytics**: Do you use any analytics services?
  - Answer: ___________________________________
- [ ] **Error Tracking**: Do you use Sentry or similar?
  - Answer: ___________________________________
- [ ] **Legal Name**: What legal entity name should appear?
  - Answer: ___________________________________
- [ ] **Physical Address**: Do you want to include a business address?
  - Answer: ___________________________________
- [ ] **Data Retention**: Confirm OAuth tokens kept indefinitely until deletion
  - Answer: ☐ Correct ☐ Needs update
- [ ] **AI/ML Training**: Confirm you do NOT use data for AI training
  - Answer: ☐ Correct (we don't) ☐ We do (update privacy policy)

## Documentation Review

Have you read these documents?

- [ ] **Summary**: `apps/gtd/docs/OAUTH_VERIFICATION_SUMMARY.md`
- [ ] **Video Guide**: `apps/gtd/docs/OAUTH_DEMO_VIDEO_GUIDE.md`
- [ ] **Response Template**: `apps/gtd/docs/GOOGLE_OAUTH_RESPONSE_TEMPLATE.md`
- [ ] **Data Audit**: `apps/gtd/docs/DATA_STORAGE_AUDIT.md`

## Final Verification

Before clicking "Send":

- [ ] **Double-check video link**:
  - [ ] Copy link into incognito browser
  - [ ] Verify it opens without login
  - [ ] Watch 30 seconds to ensure it's the right video
- [ ] **Double-check privacy policy**:
  - [ ] Open https://gtd.chrisesplin.com/policies in incognito
  - [ ] Scroll through all sections
  - [ ] Verify no broken formatting
- [ ] **Spell check email**:
  - [ ] No typos in OAuth scope URLs
  - [ ] No typos in your name/email
  - [ ] No placeholder text left in template
- [ ] **Save a copy**:
  - [ ] Copy your email text to a local file
  - [ ] Note the date/time sent
  - [ ] Keep for your records

## After Sending

- [ ] **Confirmation received**:
  - [ ] You should get an automated response from Google
  - [ ] If no response in 24 hours, check spam folder
- [ ] **Keep video live**:
  - [ ] Don't delete the video for at least 30 days
  - [ ] Don't change privacy settings
- [ ] **Keep privacy policy unchanged**:
  - [ ] Don't modify the privacy policy during review
  - [ ] Wait for Google's response before making changes
- [ ] **Monitor your email**:
  - [ ] Check daily for Google's response
  - [ ] Respond promptly if they ask follow-up questions

## Expected Timeline

| Day | What Happens |
|-----|--------------|
| Day 0 | You send response email |
| Day 0 | Automated confirmation from Google (within 24 hrs) |
| Day 1-7 | Google reviews your submission |
| Day 3-7 | Google responds with approval or requests changes |

## If You Need to Make Changes

If you realize something is wrong after sending:

1. **Don't panic** - You can send a follow-up email
2. **Reply to the same thread** - Don't start a new email
3. **Explain the change clearly**:
   ```
   Hi Google Team,
   
   I realized I need to update [what changed]. 
   
   Updated [privacy policy section / video]:
   [new link or explanation]
   
   Please let me know if you need anything else.
   
   Thank you,
   [Your Name]
   ```

## Common Last-Minute Issues

### Video Won't Upload
- **YouTube**: Check file size (max 256 GB), format (MP4, MOV, WebM)
- **Google Drive**: Right-click → Share → "Anyone with the link can view"
- **Alternative**: Use Vimeo, Loom, or direct file hosting

### Privacy Policy Not Loading
- Check your deployment: Did you run `bun run build`?
- Check your hosting: Is Cloudflare Workers/Pages deployed?
- Check DNS: Is gtd.chrisesplin.com pointing to the right server?

### OAuth Consent Screen Not Showing
- Clear your app approval: https://myaccount.google.com/permissions
- Use a different Google account for testing
- Try incognito mode with a test account

### Can't Find Original Google Email
- Search inbox for: "project 533544956312"
- Check spam/junk folders
- Look for sender: "Google" or "Third Party Data Safety"

## Emergency Contact

If you encounter a major blocker:

1. Check the error message carefully
2. Google the error if technical
3. Review the relevant documentation
4. Take screenshots for reference

## Completion

Once all checkboxes are marked:

✅ **You're ready to send your response to Google!**

Click "Send" and note the date/time: ___________________________________

## Post-Submission Checklist

After Google approves (or if they request changes):

- [ ] **If Approved**:
  - [ ] Save approval email for records
  - [ ] Note the verification date
  - [ ] Keep privacy policy and video archived
  
- [ ] **If Changes Requested**:
  - [ ] Read their feedback carefully
  - [ ] Make requested changes
  - [ ] Test again using this checklist
  - [ ] Reply to their email with updates
  
- [ ] **For Future Reference**:
  - [ ] Document any lessons learned
  - [ ] Update internal documentation
  - [ ] Set calendar reminder to review privacy policy annually

---

**Good luck!** You've done thorough preparation and should be in great shape for approval.
