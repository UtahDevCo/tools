"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Typography } from "@repo/components";

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to app
            </Link>
          </Button>
        </div>

        <Typography variant="headline" className="mb-4">
          Privacy Policy
        </Typography>
        
        <Typography variant="default" color="muted" className="mb-8">
          Last Updated: December 3, 2025
        </Typography>

        <Typography variant="default" color="primary" className="mb-8">
          This Privacy Policy explains how the GTD App (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) 
          collects, uses, stores, and protects your personal information when you use 
          our task management application. By using this app, you agree to the 
          collection and use of information in accordance with this policy.
        </Typography>

        {/* Data Accessed */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            1. Data We Access
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            Our app requests access to the following types of Google user data:
          </Typography>
          
          <div className="mb-6">
            <Typography variant="subtitle" className="mb-2">
              1.1 Google Profile Information
            </Typography>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Email address</strong> - Used for account identification and authentication
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Display name</strong> - Shown in the user interface
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Profile photo</strong> - Displayed in the user avatar
                </Typography>
              </li>
            </ul>
            <Typography variant="default" color="muted" className="text-sm italic">
              OAuth Scopes: https://www.googleapis.com/auth/userinfo.email, 
              https://www.googleapis.com/auth/userinfo.profile
            </Typography>
          </div>

          <div className="mb-6">
            <Typography variant="subtitle" className="mb-2">
              1.2 Google Tasks Data
            </Typography>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Task lists and tasks</strong> - Full read and write access to create, 
                  view, edit, complete, and delete tasks
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Task metadata</strong> - Due dates, completion status, notes, and parent-child relationships
                </Typography>
              </li>
            </ul>
            <Typography variant="default" color="muted" className="text-sm italic">
              OAuth Scope: https://www.googleapis.com/auth/tasks
            </Typography>
          </div>

          <div className="mb-6">
            <Typography variant="subtitle" className="mb-2">
              1.3 Google Calendar Data (Read-Only)
            </Typography>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Calendar events</strong> - Read-only access to view your calendar events 
                  alongside your tasks
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Calendar metadata</strong> - Event titles, times, descriptions, and attendees
                </Typography>
              </li>
            </ul>
            <Typography variant="default" color="muted" className="text-sm italic">
              OAuth Scope: https://www.googleapis.com/auth/calendar.readonly
            </Typography>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Typography variant="default" color="primary" className="font-semibold mb-2">
              Important: Your task and calendar data NEVER touches our servers
            </Typography>
            <Typography variant="default" color="primary" className="mb-3">
              We do not store copies of your Google Tasks or Calendar data on our servers. 
              All task and calendar information is fetched directly from your Google account 
              and displayed to you in real-time.
            </Typography>
            <Typography variant="default" color="primary">
              <strong>Data Storage:</strong> Your tasks and calendar events are only cached 
              temporarily in your browser&apos;s local storage (IndexedDB) for offline access and 
              performance. This data never leaves your device and is automatically cleared when 
              you log out or clear your browser data.
            </Typography>
          </div>
        </section>

        {/* Data Usage */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            2. How We Use Your Data
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            We use the accessed data solely for the following purposes:
          </Typography>
          
          <ul className="list-disc pl-6 space-y-3 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Authentication and Identity</strong> - Your email, name, and profile 
                photo are used to identify you within the app and provide a personalized experience
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Task Management</strong> - We access your Google Tasks to display them 
                in our Getting Things Done (GTD) interface, allowing you to organize tasks into 
                categories (Active, Next, Waiting, Someday)
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Calendar Integration</strong> - We display your calendar events 
                alongside your tasks in a weekly view to help you plan your day
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Multi-Account Support</strong> - If you connect multiple Google accounts, 
                we use OAuth tokens to access each account&apos;s tasks and calendar independently
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Offline Functionality</strong> - We temporarily cache your tasks and 
                calendar events in your browser&apos;s IndexedDB storage so you can view them offline
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Analytics and Performance Monitoring</strong> - We collect anonymous usage 
                statistics (page views, user sessions, browser type) through Firebase Analytics 
                and Google Analytics to improve app performance and user experience. This data is 
                not linked to your email address or any other personally identifiable information.
              </Typography>
            </li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            3. Data Sharing with Third Parties
          </Typography>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <Typography variant="default" color="primary" className="font-semibold mb-2">
              We do NOT sell, trade, or share your personal data with third parties
            </Typography>
            <Typography variant="default" color="primary">
              Your Google Tasks, Calendar data, and profile information are never shared with 
              advertisers, marketers, or any other third-party services.
            </Typography>
          </div>

          <Typography variant="subtitle" className="mb-3">
            Service Providers We Use
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            We rely on the following trusted service providers to operate the app. 
            These providers process data on our behalf under strict agreements:
          </Typography>

          <div className="space-y-4">
            <div className="border-l-4 border-gray-300 pl-4">
              <Typography variant="default" color="primary" className="font-semibold mb-1">
                Google LLC
              </Typography>
              <Typography variant="default" color="muted" className="mb-2">
                Purpose: Authentication (Firebase Auth), task storage (Google Tasks API), 
                calendar access (Google Calendar API)
              </Typography>
              <Typography variant="default" color="primary" className="mb-1">
                Data Shared: Email, name, profile photo, OAuth access/refresh tokens
              </Typography>
              <Typography variant="default" color="muted" className="text-sm">
                Privacy Policy: <a href="https://policies.google.com/privacy" 
                className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                https://policies.google.com/privacy</a>
              </Typography>
            </div>

            <div className="border-l-4 border-gray-300 pl-4">
              <Typography variant="default" color="primary" className="font-semibold mb-1">
                Google Firebase
              </Typography>
              <Typography variant="default" color="muted" className="mb-2">
                Purpose: User authentication, application settings storage, OAuth token management
              </Typography>
              <Typography variant="default" color="primary" className="mb-1">
                Data Shared: User ID, email, name, OAuth tokens, app preferences
              </Typography>
              <Typography variant="default" color="muted" className="text-sm">
                Privacy Policy: <a href="https://firebase.google.com/support/privacy" 
                className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                https://firebase.google.com/support/privacy</a>
              </Typography>
            </div>

            <div className="border-l-4 border-gray-300 pl-4">
              <Typography variant="default" color="primary" className="font-semibold mb-1">
                Firebase Analytics & Google Analytics
              </Typography>
              <Typography variant="default" color="muted" className="mb-2">
                Purpose: Anonymous usage analytics (page views, user sessions) for improving app performance
              </Typography>
              <Typography variant="default" color="primary" className="mb-1">
                Data Shared: Anonymous usage statistics (page views, session duration, browser type). 
                No personally identifiable information such as email addresses is included.
              </Typography>
              <Typography variant="default" color="muted" className="text-sm">
                Privacy Policy: <a href="https://firebase.google.com/support/privacy" 
                className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                https://firebase.google.com/support/privacy</a>
              </Typography>
            </div>

            <div className="border-l-4 border-gray-300 pl-4">
              <Typography variant="default" color="primary" className="font-semibold mb-1">
                Google Cloud Platform (GCP Log Explorer)
              </Typography>
              <Typography variant="default" color="muted" className="mb-2">
                Purpose: Server-side error logging and system monitoring for debugging and reliability
              </Typography>
              <Typography variant="default" color="primary" className="mb-1">
                Data Shared: Request logs, error messages, system metrics. No user-identifiable 
                information (such as email addresses or OAuth tokens) is logged.
              </Typography>
              <Typography variant="default" color="muted" className="text-sm">
                Privacy Policy: <a href="https://cloud.google.com/terms/cloud-privacy-notice" 
                className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                https://cloud.google.com/terms/cloud-privacy-notice</a>
              </Typography>
            </div>

            <div className="border-l-4 border-gray-300 pl-4">
              <Typography variant="default" color="primary" className="font-semibold mb-1">
                Cloudflare, Inc.
              </Typography>
              <Typography variant="default" color="muted" className="mb-2">
                Purpose: Hosting infrastructure and content delivery network (CDN)
              </Typography>
              <Typography variant="default" color="primary" className="mb-1">
                Data Shared: IP addresses, request logs (for security and performance)
              </Typography>
              <Typography variant="default" color="muted" className="text-sm">
                Privacy Policy: <a href="https://www.cloudflare.com/privacypolicy/" 
                className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                https://www.cloudflare.com/privacypolicy/</a>
              </Typography>
            </div>
          </div>

          <Typography variant="default" color="primary" className="mt-6">
            <strong>Legal Disclosure:</strong> We may disclose your information if required 
            by law, court order, or government regulation, or if necessary to protect our 
            rights, property, or safety.
          </Typography>
        </section>

        {/* Data Storage & Protection */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            4. Data Storage and Protection
          </Typography>
          
          <Typography variant="subtitle" className="mb-3">
            4.1 What We Store
          </Typography>

          <div className="mb-6">
            <Typography variant="default" color="primary" className="mb-3 font-semibold">
              Server-Side Storage (Firebase Firestore)
            </Typography>
            <Typography variant="default" color="primary" className="mb-3">
              We store only authentication and settings data on our servers. Your actual 
              task and calendar content is NEVER stored on our servers.
            </Typography>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>User Profile:</strong> Email, display name, profile photo URL
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>OAuth Tokens:</strong> Google OAuth access tokens and refresh tokens 
                  (encrypted and secured by Firebase). These tokens are used to access your 
                  Google Tasks and Calendar on your behalf.
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Application Settings:</strong> Your preferences such as calendar 
                  visibility, selected calendars, default task list, display options
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Connected Accounts:</strong> Information about multiple Google accounts 
                  you&apos;ve connected (up to 3 accounts)
                </Typography>
              </li>
            </ul>
            <Typography variant="default" color="muted" className="text-sm italic">
              Storage Period: OAuth tokens are retained until you disconnect your account or log out. 
            </Typography>
          </div>

          <div className="mb-6">
            <Typography variant="default" color="primary" className="mb-3 font-semibold">
              Client-Side Storage (Your Browser Only - NEVER Sent to Our Servers)
            </Typography>
            <Typography variant="default" color="primary" className="mb-3">
              The following data is cached only in your browser&apos;s local storage and never 
              transmitted to our servers:
            </Typography>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Cached Tasks:</strong> Temporary copies of your Google Tasks for 
                  offline access and faster loading (stored in IndexedDB)
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Cached Calendar Events:</strong> Temporary copies of your calendar 
                  events for offline viewing (stored in IndexedDB)
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>User Preferences:</strong> Local copy of settings for immediate UI updates
                </Typography>
              </li>
            </ul>
            <Typography variant="default" color="muted" className="text-sm italic">
              Note: Client-side data is stored only on your device, never sent to our servers, 
              and can be cleared by clearing your browser data or logging out.
            </Typography>
          </div>

          <Typography variant="subtitle" className="mb-3 mt-6">
            4.2 Security Measures
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            We implement industry-standard security practices to protect your data:
          </Typography>

          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>HTTPS Encryption:</strong> All data transmitted between your browser 
                and our servers is encrypted using TLS/SSL
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>HTTP-Only Cookies:</strong> OAuth tokens are stored in secure, 
                HTTP-only cookies that cannot be accessed by JavaScript
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Firebase Security Rules:</strong> Access to Firestore data is 
                restricted to authenticated users and their own data only
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Token Refresh:</strong> OAuth access tokens expire after 1 hour 
                and are automatically refreshed using secure refresh tokens
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>No Password Storage:</strong> We never see or store your Google 
                password - authentication is handled entirely by Google
              </Typography>
            </li>
          </ul>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <Typography variant="default" color="primary">
              <strong>Important:</strong> While we implement strong security measures, 
              no system is 100% secure. We cannot guarantee the absolute security of data 
              transmitted over the internet. You use this app at your own risk.
            </Typography>
          </div>
        </section>

        {/* Data Retention & Deletion */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            5. Data Retention and Deletion
          </Typography>
          
          <Typography variant="subtitle" className="mb-3">
            5.1 How Long We Keep Your Data
          </Typography>

          <ul className="list-disc pl-6 space-y-3 mb-6">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>OAuth Tokens:</strong> Stored until you disconnect your account or log out. 
                Access tokens expire after 7 days and are automatically refreshed while you remain 
                active. When you log out or disconnect an account, all associated tokens are 
                immediately deleted from our servers.
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>User Settings:</strong> Kept until you delete your account or request data 
                deletion. This allows your preferences to persist across login sessions.
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Browser Cache:</strong> Tasks and calendar events cached in your browser 
                are automatically cleared when you log out or clear your browser data. This data 
                is never sent to our servers.
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Analytics Data:</strong> Anonymous usage statistics (page views, sessions) 
                are retained by Firebase Analytics according to their standard retention policies. 
                This data is not linked to your email or any personally identifiable information.
              </Typography>
            </li>
          </ul>

          <Typography variant="subtitle" className="mb-3">
            5.2 How to Delete Your Data
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            You have full control over your data and can request deletion at any time. 
            We provide multiple options:
          </Typography>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Typography variant="default" color="primary" className="font-semibold mb-3">
              Complete Account Deletion
            </Typography>
            <Typography variant="default" color="primary" className="mb-2">
              To permanently delete all your data from our systems:
            </Typography>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <Typography variant="default" color="primary" as="span">
                  Email us at <a href="mailto:chris@chrisesplin.com" 
                  className="text-blue-600 underline">chris@chrisesplin.com</a> with the 
                  subject &quot;Account Deletion Request&quot;
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  Include the email address associated with your account
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  We will delete all your data within 30 days and send you a confirmation email
                </Typography>
              </li>
            </ol>
          </div>

          <Typography variant="default" color="primary" className="mb-4">
            <strong>What Gets Deleted:</strong> Your user profile, OAuth tokens, application 
            settings, and all connected account information stored in our database.
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            <strong>What Is NOT Deleted:</strong> Your Google Tasks and Calendar data, which 
            remain in your Google account. To delete those, use Google&apos;s own data management tools.
          </Typography>

          <div className="border-l-4 border-blue-500 pl-4 mb-4">
            <Typography variant="default" color="primary" className="font-semibold mb-2">
              Revoke App Access Without Deleting Data
            </Typography>
            <Typography variant="default" color="primary">
              You can revoke our app&apos;s access to your Google account at any time without 
              requesting full deletion by visiting your{" "}
              <a href="https://myaccount.google.com/permissions" 
              className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              Google Account Permissions</a> page. This will prevent the app from accessing 
              your data, but your settings will remain in our system unless you request deletion.
            </Typography>
          </div>
        </section>

        {/* User Rights */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            6. Your Rights and Choices
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            You have the following rights regarding your personal data:
          </Typography>

          <ul className="list-disc pl-6 space-y-3 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Right to Access:</strong> You can request a copy of all data we 
                store about you
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Right to Correction:</strong> You can update your profile information 
                through your Google account settings
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Right to Deletion:</strong> You can request complete deletion of 
                your data as described in Section 5
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Right to Revoke Access:</strong> You can disconnect your Google 
                account at any time through Google&apos;s permission settings
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Right to Data Portability:</strong> Your tasks and calendar data 
                remain in your Google account and can be exported using Google Takeout
              </Typography>
            </li>
          </ul>

          <Typography variant="default" color="primary">
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:chris@chrisesplin.com" 
            className="text-blue-600 underline">chris@chrisesplin.com</a>.
          </Typography>
        </section>

        {/* Children's Privacy */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            7. Children&apos;s Privacy
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            Our app is not intended for use by children under the age of 13. We do not 
            knowingly collect personal information from children under 13. If you are a 
            parent or guardian and believe your child has provided us with personal data, 
            please contact us immediately, and we will delete that information.
          </Typography>
        </section>

        {/* Changes to Policy */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            8. Changes to This Privacy Policy
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our 
            practices or for legal, operational, or regulatory reasons. When we make changes:
          </Typography>

          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                We will update the &quot;Last Updated&quot; date at the top of this page
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                For significant changes, we may notify you via email or an in-app notification
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                Continued use of the app after changes constitutes acceptance of the updated policy
              </Typography>
            </li>
          </ul>

          <Typography variant="default" color="primary">
            We encourage you to review this policy periodically to stay informed about how 
            we protect your data.
          </Typography>
        </section>

        {/* Contact Information */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            9. Contact Us
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            If you have any questions, concerns, or requests regarding this Privacy Policy 
            or our data practices, please contact us:
          </Typography>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <Typography variant="default" color="primary" className="mb-2">
              <strong>Email:</strong>{" "}
              <a href="mailto:chris@chrisesplin.com" 
              className="text-blue-600 underline">chris@chrisesplin.com</a>
            </Typography>
            <Typography variant="default" color="primary">
              <strong>Response Time:</strong> We aim to respond to all inquiries within 
              5 business days
            </Typography>
          </div>
        </section>

        {/* Compliance */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            10. Compliance with Google API Services
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            This app complies with the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" 
            className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy</a>, including the Limited Use requirements. 
            Specifically:
          </Typography>

          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                We only request the minimum scopes necessary for the app&apos;s core functionality
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                We do not use Google user data for advertising or marketing purposes
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                We do not use Google user data to train machine learning or AI models
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                We do not transfer Google user data to third parties except as described 
                in Section 3
              </Typography>
            </li>
          </ul>

          <Typography variant="default" color="primary">
            We are committed to maintaining user trust and protecting your privacy in 
            accordance with Google&apos;s policies and industry best practices.
          </Typography>
        </section>

        {/* Terms of Use */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Terms of Use
          </Typography>
          
          <Typography variant="default" color="primary" className="mb-4">
            <strong>Free Service:</strong> This app is provided free of charge with no 
            payment or subscription required.
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            <strong>Acceptable Use:</strong> You agree not to use this app for any illegal 
            purposes or in violation of any laws in the United States of America.
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            <strong>No Warranty:</strong> This app is provided &quot;as is&quot; without warranty of 
            any kind. We do not guarantee uninterrupted or error-free operation.
          </Typography>

          <Typography variant="default" color="primary">
            <strong>Jurisdiction:</strong> These terms are governed by the laws of the 
            United States of America.
          </Typography>
        </section>
      </div>
    </div>
  );
}
