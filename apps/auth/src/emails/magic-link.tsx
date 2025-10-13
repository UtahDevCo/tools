import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface MagicLinkEmailProps {
  magicLink: string;
  appName: string;
}

export const MagicLinkEmail = ({
  magicLink,
  appName,
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Sign in to {appName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Sign in to {appName}</Heading>
        <Text style={text}>
          Click the button below to sign in to your account. This link will
          expire in 15 minutes.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={magicLink}>
            Sign In
          </Button>
        </Section>
        <Text style={text}>
          If you didn&apos;t request this email, you can safely ignore it.
        </Text>
        <Section style={footer}>
          <Text style={footerText}>
            Or copy and paste this link into your browser:
          </Text>
          <Link href={magicLink} style={link}>
            {magicLink}
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
  padding: '0 48px',
};

const text = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
  margin: '0 0 20px',
};

const buttonContainer = {
  padding: '27px 48px',
};

const button = {
  backgroundColor: '#0066ff',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px 0',
};

const footer = {
  padding: '0 48px',
};

const footerText = {
  color: '#8a8a8a',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px',
};

const link = {
  color: '#0066ff',
  fontSize: '12px',
  lineHeight: '16px',
  wordBreak: 'break-all' as const,
};
