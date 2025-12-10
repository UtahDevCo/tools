'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Typography } from '@repo/components';

export default function WhatIsGTDPage() {
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
          What Is the GTD App?
        </Typography>

        <Typography variant="default" color="muted" className="mb-8">
          Getting Things Done (GTD) is a productivity method that helps you organize your life and stay focused.
        </Typography>

        {/* About the App */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Overview
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            The GTD App is a Progressive Web Application (PWA) that brings the Getting Things Done methodology to life using Google Tasks as the backend. It helps you capture, organize, and complete your tasks using the GTD framework, with all your data stored securely in your Google Account.
          </Typography>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Typography variant="default" color="primary" className="font-semibold mb-2">
              What You Get
            </Typography>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>GTD-Organized Task Lists</strong>: Four main lists (Active, Next, Waiting, Someday) that align with GTD principles
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Weekly Calendar View</strong>: See your tasks organized by day of the week
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Offline Access</strong>: Your tasks are available even without an internet connection
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>Google Integration</strong>: Seamlessly syncs with Google Tasks and Google Calendar
                </Typography>
              </li>
              <li>
                <Typography variant="default" color="primary" as="span">
                  <strong>PWA Installation</strong>: Install as an app on your phone, tablet, or desktop
                </Typography>
              </li>
            </ul>
          </div>
        </section>

        {/* The GTD Methodology */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            The GTD Methodology
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            Getting Things Done is a time-management methodology created by David Allen. The system works by capturing all your tasks and organizing them into four key categories:
          </Typography>

          <div className="space-y-4 mb-6">
            <div className="border-l-4 border-green-500 pl-4">
              <Typography variant="subtitle" className="mb-2">
                Active Tasks
              </Typography>
              <Typography variant="default" color="primary">
                Tasks with specific due dates. These appear in your weekly calendar view so you can see exactly what needs to be done and when.
              </Typography>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <Typography variant="subtitle" className="mb-2">
                Next Actions
              </Typography>
              <Typography variant="default" color="primary">
                The concrete next steps you need to take on projects without due dates. These are your most immediately actionable items.
              </Typography>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <Typography variant="subtitle" className="mb-2">
                Waiting For
              </Typography>
              <Typography variant="default" color="primary">
                Tasks you&apos;re waiting on from others or external blockers. Track delegated work and items dependent on someone else&apos;s actions.
              </Typography>
            </div>

            <div className="border-l-4 border-gray-500 pl-4">
              <Typography variant="subtitle" className="mb-2">
                Someday/Maybe
              </Typography>
              <Typography variant="default" color="primary">
                Ideas and possibilities for the future. Keep them organized without cluttering your active task list.
              </Typography>
            </div>
          </div>

          <Typography variant="default" color="primary" className="mb-4">
            <strong>Why GTD Works:</strong> By capturing everything in a trusted system, your brain is freed from trying to remember tasks. You can focus on actually doing the work instead of worrying about what you might have forgotten.
          </Typography>
        </section>

        {/* Key Features */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Key Features
          </Typography>

          <div className="space-y-4">
            <div className="border-b pb-4">
              <Typography variant="subtitle" className="mb-2">
                Weekly Calendar View
              </Typography>
              <Typography variant="default" color="primary">
                See all your tasks organized by day of the week. Your &quot;Active&quot; tasks (those with due dates) appear in the calendar grid so you can visualize your week at a glance.
              </Typography>
            </div>

            <div className="border-b pb-4">
              <Typography variant="subtitle" className="mb-2">
                Real-Time Google Tasks Sync
              </Typography>
              <Typography variant="default" color="primary">
                Everything syncs directly with your Google Tasks account. Create, edit, and complete tasks in the app or in Google Tasks—changes appear everywhere instantly.
              </Typography>
            </div>

            <div className="border-b pb-4">
              <Typography variant="subtitle" className="mb-2">
                Google Calendar Integration
              </Typography>
              <Typography variant="default" color="primary">
                Your calendar events are displayed alongside your tasks so you can see your full schedule in one place (read-only, non-destructive access).
              </Typography>
            </div>

            <div className="border-b pb-4">
              <Typography variant="subtitle" className="mb-2">
                Offline-First Design
              </Typography>
              <Typography variant="default" color="primary">
                Your tasks are cached locally in your browser&apos;s storage so you can access them even without an internet connection. Changes sync automatically when you&apos;re back online.
              </Typography>
            </div>

            <div className="border-b pb-4">
              <Typography variant="subtitle" className="mb-2">
                Multi-Select &amp; Bulk Actions
              </Typography>
              <Typography variant="default" color="primary">
                Select multiple tasks to move them together to different lists or delete them in batch. Great for clearing your inbox after a review session.
              </Typography>
            </div>

            <div className="border-b pb-4">
              <Typography variant="subtitle" className="mb-2">
                Keyboard Shortcuts
              </Typography>
              <Typography variant="default" color="primary">
                Power users can navigate quickly using keyboard shortcuts. Jump to today, navigate weeks, and perform actions without touching the mouse.
              </Typography>
            </div>

            <div>
              <Typography variant="subtitle" className="mb-2">
                Installable PWA
              </Typography>
              <Typography variant="default" color="primary">
                Install the app on your phone, tablet, or desktop. It works just like a native app but runs in the browser—no app store required.
              </Typography>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            How It Works
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            The GTD App uses a simple but powerful workflow:
          </Typography>

          <ol className="list-decimal pl-6 space-y-3 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Capture:</strong> Sign in with your Google Account. The app imports your existing Google Tasks.
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Clarify:</strong> Create tasks and organize them into the four GTD lists (Active, Next, Waiting, Someday).
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Organize:</strong> Use the calendar view to plan your week. Add due dates to your Active tasks.
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Review:</strong> Review your task lists regularly to stay aligned with your goals and priorities.
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Do:</strong> Complete tasks one by one. Check them off and watch your progress.
              </Typography>
            </li>
          </ol>

          <Typography variant="default" color="primary">
            <strong>Everything Syncs Automatically:</strong> Your data is stored in Google Tasks, so you&apos;re never locked into this app. Use it alongside Google Tasks, Google Calendar, and any other tools in your workflow.
          </Typography>
        </section>

        {/* Data & Privacy */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Data &amp; Privacy
          </Typography>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <Typography variant="default" color="primary" className="font-semibold mb-3">
              Your Data Stays Yours
            </Typography>
            <Typography variant="default" color="primary" className="mb-3">
              The GTD App never stores your actual task or calendar data on our servers. All your data lives in your Google Account and is accessed with your explicit permission.
            </Typography>
            <Typography variant="default" color="primary">
              <strong>Browser Cache Only:</strong> Tasks are temporarily cached in your browser&apos;s local storage for offline access and performance. This local cache is automatically cleared when you log out.
            </Typography>
          </div>

          <Typography variant="default" color="primary" className="mb-4">
            <strong>What We Store:</strong>
          </Typography>

          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                Your Google email address and basic profile information
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                Your app settings and preferences (colors, view options, etc.)
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                Authentication tokens to access your Google Tasks and Calendar
              </Typography>
            </li>
          </ul>

          <Typography variant="default" color="primary">
            <strong>What We Don&apos;t Store:</strong> Your task titles, descriptions, due dates, calendar events, or any of your actual work data.
          </Typography>
        </section>

        {/* Getting Started */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Getting Started
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            Getting started with the GTD App is simple:
          </Typography>

          <ol className="list-decimal pl-6 space-y-3 mb-6">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Sign In:</strong> Click the sign-in button and log in with your Google Account
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Grant Permissions:</strong> Authorize the app to access your Google Tasks, Calendar, and profile information
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Review Your Tasks:</strong> Your existing Google Tasks are automatically imported
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Organize with GTD:</strong> Create new task lists or rename existing ones using the GTD structure
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Start Planning:</strong> Add tasks to your calendar and begin your GTD workflow
              </Typography>
            </li>
          </ol>

          <Typography variant="default" color="primary">
            <strong>Pro Tip:</strong> Try the demo mode without signing in first to explore the app and see how the GTD lists and calendar view work.
          </Typography>
        </section>

        {/* Technology */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Built With Modern Technology
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            The GTD App is built on a modern, secure, and reliable technology stack:
          </Typography>

          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Next.js 16 &amp; React 19:</strong> Fast, modern web application framework
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Firebase Auth:</strong> Secure Google OAuth login with encrypted sessions
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Google APIs:</strong> Direct integration with Google Tasks and Calendar
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Offline-First Architecture:</strong> Works seamlessly with or without internet
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Progressive Web App (PWA):</strong> Installable on any device
              </Typography>
            </li>
          </ul>

          <Typography variant="default" color="primary">
            <strong>Secure by Default:</strong> Authentication tokens are stored in secure HTTP-only cookies and never exposed to JavaScript. All API calls happen on the server, not in your browser.
          </Typography>
        </section>

        {/* Free & Open */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Free. No Ads. No Subscriptions.
          </Typography>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Typography variant="default" color="primary" className="mb-3">
              The GTD App is completely free to use. There are no premium tiers, no in-app purchases, no ads, and no data selling.
            </Typography>
            <Typography variant="default" color="primary">
              We believe productivity tools should be accessible to everyone. Use the app as much as you want, forever, at no cost.
            </Typography>
          </div>
        </section>

        {/* Learn More */}
        <section className="mb-10">
          <Typography variant="title" className="mb-4">
            Learn More
          </Typography>

          <Typography variant="default" color="primary" className="mb-4">
            Want to learn more? Check out these resources:
          </Typography>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Privacy Policy:</strong>{" "}
                <Link href="/policies" className="text-blue-600 underline">
                  View our privacy policy
                </Link>{" "}
                to see exactly what data we collect and how we protect it
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Getting Things Done Book:</strong> Learn the full GTD methodology from David Allen
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>GTD Community:</strong> Join thousands of people using GTD to organize their lives
              </Typography>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="mb-10 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Typography variant="title" className="mb-4">
            Ready to Get Things Done?
          </Typography>
          <Typography variant="default" color="primary" className="mb-6">
            Start organizing your tasks today using the GTD methodology.
          </Typography>
          <Button asChild size="lg">
            <Link href="/">Open the App</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
