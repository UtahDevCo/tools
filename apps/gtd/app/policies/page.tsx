"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Typography } from "@repo/components";

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to app
            </Link>
          </Button>
        </div>

        <Typography variant="headline" className="mb-8">
          Policies
        </Typography>

        <section className="mb-8">
          <Typography variant="title" className="mb-4">
            Data Use
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            We do not share your data with any third parties.
          </Typography>
          <Typography variant="default" color="primary">
            This app uses Firebase Authentication and Google Tasks API. Your
            task data is stored in your Google account via Google Tasks. We do
            not store your tasks on our servers.
          </Typography>
        </section>

        <section className="mb-8">
          <Typography variant="title" className="mb-4">
            Privacy Policy
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            We store your login user profile, including email and name, through
            Firebase Authentication.
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            We don&apos;t see or store any passwords because we use Firebase
            Authentication. If you think you had a password breach, it&apos;s
            probably not us.
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            Your task data is stored in your Google account via Google Tasks. We
            access it only to display and manage your tasks within this app.
          </Typography>
          <Typography variant="default" color="primary">
            Email{" "}
            <a
              href="mailto:chris@chrisesplin.com"
              className="text-primary underline"
            >
              chris@chrisesplin.com
            </a>{" "}
            for a full account deletion.
          </Typography>
        </section>

        <section className="mb-8">
          <Typography variant="title" className="mb-4">
            Terms of Use
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            This app is free to use. There is no payment required.
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            Please don&apos;t use our products for anything illegal in the
            United States of America.
          </Typography>
          <Typography variant="default" color="primary">
            We follow laws from the USA. That&apos;s where we live and operate.
          </Typography>
        </section>

        <section className="mb-8">
          <Typography variant="title" className="mb-4">
            Data Processors
          </Typography>
          <Typography variant="default" color="primary" className="mb-4">
            We use the following third-party services to process your data:
          </Typography>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Firebase Authentication</strong> – for user login and
                identity management
              </Typography>
            </li>
            <li>
              <Typography variant="default" color="primary" as="span">
                <strong>Google Tasks API</strong> – for storing and managing
                your task data
              </Typography>
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <Typography variant="title" className="mb-4">
            Data Deletion
          </Typography>
          <Typography variant="default" color="primary">
            Email{" "}
            <a
              href="mailto:chris@chrisesplin.com"
              className="text-primary underline"
            >
              chris@chrisesplin.com
            </a>{" "}
            for data deletion. We will happily delete your account and all
            associated data.
          </Typography>
        </section>

        <section className="mb-8">
          <Typography variant="title" className="mb-4">
            Contact
          </Typography>
          <Typography variant="default" color="primary">
            For any questions or concerns, email{" "}
            <a
              href="mailto:chris@chrisesplin.com"
              className="text-primary underline"
            >
              chris@chrisesplin.com
            </a>
            .
          </Typography>
        </section>
      </div>
    </div>
  );
}
