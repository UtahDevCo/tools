# Monitoring & Observability Recommendations

## For Shoestring Budget (Free/Low Cost)

Since you're using Firebase and want to minimize costs, here's the recommended monitoring stack:

---

## **1. Firebase Crashlytics (FREE - RECOMMENDED)**

**Best choice for your use case.** It's free, integrates seamlessly with Firebase, and gives you everything you need.

### Setup (5 minutes):

```bash
# Install Firebase SDK
bun add firebase

# Already have Firebase installed, just enable Crashlytics in console
```

### Implementation:

```typescript
// lib/firebase/crashlytics.ts
import { getApp } from "firebase/app";
import { 
  initializeAnalytics, 
  logEvent as firebaseLogEvent 
} from "firebase/analytics";

let analytics: ReturnType<typeof initializeAnalytics> | null = null;

export function initializeMonitoring() {
  if (typeof window === 'undefined') return;
  
  try {
    const app = getApp();
    analytics = initializeAnalytics(app);
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
  }
}

export function logEvent(eventName: string, params?: Record<string, unknown>) {
  if (!analytics) return;
  firebaseLogEvent(analytics, eventName, params);
}

export function logError(error: unknown, context: Record<string, unknown> = {}) {
  console.error('[Error]', error, context);
  
  // Log as custom event
  logEvent('error_occurred', {
    error_message: error instanceof Error ? error.message : String(error),
    ...context,
  });
}
```

### What you get:
- ✅ Crash reports with stack traces
- ✅ User analytics (how many active users)
- ✅ Custom event tracking (task completed, etc.)
- ✅ Performance monitoring
- ✅ **100% FREE for your scale**

### Enable in Firebase Console:
1. Go to Firebase Console → Your Project
2. Click "Crashlytics" in left sidebar
3. Click "Enable Crashlytics"
4. Add to your app initialization

---

## **2. Google Cloud Logging (FREE TIER)**

Since you're already on Firebase (which is GCP), you automatically get:

- **Free quota**: 50 GB/month of logs
- View logs in GCP Console → Logging
- Set up alerts for errors

### Implementation:

```typescript
// lib/cloud-logging.ts
export function logToCloud(
  severity: 'INFO' | 'WARNING' | 'ERROR',
  message: string,
  data?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${severity}]`, message, data);
    return;
  }

  // Cloud Logging automatically captures console.log from Cloud Run/Functions
  const logEntry = {
    severity,
    message,
    ...data,
    timestamp: new Date().toISOString(),
  };

  // Console logs are automatically sent to Cloud Logging when deployed
  console.log(JSON.stringify(logEntry));
}
```

### Setup Alerts:
1. GCP Console → Logging → Logs Explorer
2. Create filters (e.g., `severity="ERROR"`)
3. Create alert policy → Email you on errors

**Cost**: FREE for first 50GB/month (plenty for your scale)

---

## **3. Uptime Monitoring (FREE)**

### Option A: Google Cloud Monitoring (Recommended)
- **Free**: 1 million API calls/month
- **Setup**: 5 minutes in GCP Console
- **What you get**: Uptime checks, latency monitoring, alerts

**Setup Steps:**
1. GCP Console → Monitoring → Uptime Checks
2. Create check for `https://your-app.com`
3. Set alert channel (email)
4. Done!

### Option B: UptimeRobot (Alternative)
- **Free tier**: 50 monitors, 5-minute checks
- `https://uptimerobot.com`
- Email/SMS alerts on downtime

---

## **Implementation Plan (Minimal Effort, Maximum Value)**

### Week 1: Add Firebase Analytics + Crashlytics

```typescript
// Update lib/error-logger.ts
import { logEvent, logError as logToFirebase } from './firebase/analytics';

export function logError(error: unknown, context: Record<string, unknown> = {}) {
  // Log to console
  console.error('[Error]', error, context);
  
  // Log to Firebase
  logToFirebase(error, context);
}

// Track important events
export function trackTaskCompleted(taskId: string) {
  logEvent('task_completed', { taskId });
}

export function trackTokenRefreshFailed(error: string) {
  logEvent('token_refresh_failed', { error });
}
```

### Week 2: Set Up GCP Uptime Monitoring
1. Go to GCP Console
2. Monitoring → Uptime Checks
3. Add your app URL
4. Set email alert

### Week 3: Add Custom Events
```typescript
// Track user behavior
trackEvent('multi_select_used', { count: selectedTasks.length });
trackEvent('offline_mode_detected');
trackEvent('gtd_list_created', { listType: 'next' });
```

---

## **Cost Breakdown**

| Service | Free Tier | Your Expected Usage | Cost |
|---------|-----------|---------------------|------|
| Firebase Crashlytics | Unlimited | N/A | **$0** |
| Firebase Analytics | Unlimited events | ~10k/day | **$0** |
| GCP Logging | 50 GB/month | ~1 GB/month | **$0** |
| GCP Monitoring | 1M API calls | ~50k/month | **$0** |
| **TOTAL** | | | **$0/month** |

---

## **What NOT to Use (Too Expensive)**

❌ Sentry (starts at $26/month)  
❌ Datadog (starts at $15/month)  
❌ New Relic (starts at $25/month)  
❌ LogRocket (starts at $99/month)  

These are enterprise tools. You don't need them yet.

---

## **Key Metrics to Track**

### Essential (Track Now):
1. **Error rate**: How many errors per user session
2. **Token refresh failures**: Critical for auth flow
3. **Offline usage**: How often users go offline
4. **Task operations**: Completions, deletions, moves
5. **App crashes**: Any unhandled exceptions

### Nice to Have (Later):
6. Page load time
7. API response times
8. Popular features
9. User retention

---

## **Alerts to Set Up**

### Critical (Email immediately):
1. Error rate > 5% of requests
2. App is down (uptime check fails)
3. Token refresh failure rate > 10%

### Warning (Daily digest):
4. Unusual spike in errors
5. Slow API responses (>3s)
6. High cache miss rate

---

## **Dashboard Recommendations**

Create a simple dashboard in GCP Console:

**Metrics to display:**
- Active users (last 7 days)
- Error count (last 24 hours)
- Uptime percentage (last 30 days)
- Most common errors

**Access**: GCP Console → Monitoring → Dashboards → Create Dashboard

---

## **Testing Your Monitoring**

After setup, test by:

```typescript
// Force an error to test Crashlytics
function testMonitoring() {
  logError(new Error('Test error from monitoring'), {
    action: 'test_monitoring',
    environment: 'development',
  });
}
```

Check Firebase Console → Analytics/Crashlytics to see if it appears.

---

## **Quarterly Review**

Every 3 months, review:
1. Are you still within free tiers? (Yes, you should be)
2. What are the top 3 errors?
3. Is uptime acceptable? (>99.5%)
4. Are users experiencing issues you don't see in logs?

If you grow significantly (10k+ daily active users), revisit this plan.

---

## **Summary: Your Monitoring Stack**

```
┌─────────────────────────────────────────┐
│     Firebase Crashlytics (FREE)         │  ← Errors & crashes
├─────────────────────────────────────────┤
│     Firebase Analytics (FREE)           │  ← User behavior
├─────────────────────────────────────────┤
│     GCP Cloud Logging (FREE)            │  ← Server logs
├─────────────────────────────────────────┤
│     GCP Uptime Monitoring (FREE)        │  ← Availability
└─────────────────────────────────────────┘

Total Cost: $0/month for first year
Setup Time: 2-3 hours total
Maintenance: 30 minutes/month
```

**Start with Firebase Crashlytics TODAY. It's the best bang for your zero bucks.**
