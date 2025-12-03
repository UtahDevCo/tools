# OAuth Demo Video Guide

## What Google Needs to See

Google requires a demo video showing the complete OAuth consent screen workflow. This is to verify that users are properly informed about what data your app accesses.

## Video Requirements

- **Format**: MP4, WebM, or MOV
- **Length**: 2-5 minutes is sufficient
- **Quality**: 720p or higher (screen recording quality)
- **Audio**: Not required, but helpful if you want to narrate
- **Upload**: YouTube (unlisted or public) or Google Drive with public link

## What to Record

### 1. Starting State (15 seconds)
- Show your app's homepage at https://gtd.chrisesplin.com/
- App should be in logged-out state
- Show the sign-in button clearly visible

### 2. Initiate OAuth Flow (30 seconds)
- Click the "Sign In" or "Login with Google" button
- **CRITICAL**: Capture the OAuth consent screen that appears
- The consent screen must show:
  - Your app name: "GTD App" or "Quiver Tools"
  - Google's branding
  - The scopes being requested with their descriptions:
    - "View and manage your tasks" (Google Tasks)
    - "View your calendar events" (Google Calendar - read only)
    - "See your primary Google Account email address"
    - "See your personal info, including any personal info you've made publicly available"

### 3. Grant Permission (30 seconds)
- Scroll through the consent screen to show all requested permissions
- Click "Allow" or "Continue" button
- Show the loading/redirect back to your app

### 4. Post-Authentication State (1-2 minutes)
- Show that you're now logged in (user avatar should appear)
- Demonstrate accessing your Google Tasks:
  - Show task lists loading
  - Show at least one task being displayed
  - Optional: Complete or edit a task to show write access
- Demonstrate accessing Google Calendar (if implemented):
  - Show calendar events loading in the weekly view
  - Show read-only access (no editing)

### 5. Multi-Account Support (Optional, 30 seconds)
- If you want to show multi-account support:
  - Click "Add Account" or equivalent
  - Show the OAuth flow again for a second account
  - Show both accounts' tasks/calendars

## Recording Tools

### macOS
- **QuickTime Player**: File → New Screen Recording
- **Built-in**: Cmd+Shift+5 → Record Entire Screen

### Windows
- **Xbox Game Bar**: Win+G → Capture
- **OBS Studio**: Free, professional-grade

### Linux
- **SimpleScreenRecorder**: Most popular
- **OBS Studio**: Cross-platform

### Chrome Extension
- **Loom**: Easy browser-based recording
- **Screencastify**: Good for browser-only recording

## Step-by-Step Recording Script

```
1. Open browser to https://gtd.chrisesplin.com/
2. Say: "I'm starting at the GTD app homepage"
3. Click Sign In button
4. Wait for OAuth consent screen to fully load
5. Say: "Here's the Google OAuth consent screen showing all requested permissions"
6. Scroll down to show all scopes
7. Click Allow/Continue
8. Wait for redirect back to app
9. Say: "Now I'm logged in and can see my Google Tasks"
10. Click around to show task lists and calendar events
11. Say: "The app successfully accesses my Google Tasks and Calendar data"
12. End recording
```

## Common Issues to Avoid

### ❌ Don't Do This
- Recording with OAuth consent screen closed too quickly
- Not showing the actual scope descriptions
- Recording in incognito mode (if you've already approved, it won't show consent screen)
- Having slow internet that times out the flow
- Recording at very low resolution

### ✅ Do This
- Clear your OAuth approvals first (see below)
- Record in normal browser mode
- Take your time showing each screen
- Use a test Google account if possible
- Record in good lighting if using webcam

## How to Force OAuth Consent Screen to Appear

If you've already approved the app, the consent screen won't show again. To force it:

1. Go to https://myaccount.google.com/permissions
2. Find "GTD App" or "Quiver Tools"
3. Click "Remove Access"
4. Now when you sign in again, the consent screen will appear

## Uploading Your Video

### Option 1: YouTube (Recommended)
1. Upload to YouTube
2. Set as "Unlisted" (not private, not public)
3. Copy the YouTube link
4. Include in your email to Google

### Option 2: Google Drive
1. Upload video to Google Drive
2. Right-click → Share → "Anyone with the link can view"
3. Copy the link
4. Include in your email to Google

### Option 3: Direct Upload
- Some verification portals allow direct video upload
- Check the Google Cloud Console verification center

## Example Email Text

```
Hello Google Trust and Safety Team,

Thank you for your review. I have created a demo video showing the complete 
OAuth consent screen workflow:

Video Link: [YOUR_YOUTUBE_OR_DRIVE_LINK]

The video demonstrates:
- User initiating sign-in
- Google OAuth consent screen displaying all requested scopes
- User granting permission
- Successful authentication and data access

Please let me know if you need any additional information.

Best regards,
[Your Name]
```

## Testing Checklist

Before recording your final video, test:

- [ ] OAuth consent screen shows app name correctly
- [ ] All 4 scopes are visible:
  - tasks (Google Tasks)
  - calendar.readonly (Google Calendar)
  - userinfo.email
  - userinfo.profile
- [ ] Sign-in completes successfully
- [ ] Tasks load after authentication
- [ ] Calendar events load (if implemented)
- [ ] No error messages appear
- [ ] App is accessible at production URL

## Need Help?

If you encounter issues:
1. Test the OAuth flow manually first
2. Clear browser cache and cookies
3. Try a different browser
4. Use a fresh Google account for testing
5. Check browser console for JavaScript errors

## Timeline

Once you submit the video:
- Google typically responds within 3-7 business days
- They may request changes or additional footage
- Keep the video link active for at least 30 days
