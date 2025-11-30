# Monitoring Setup Instructions

This guide walks you through completing the monitoring setup for the GTD app using Firebase and GCP.

## ✅ What's Already Done

The following have been implemented in code:

- ✅ Firebase Analytics module ([lib/firebase/analytics.ts](../lib/firebase/analytics.ts))
- ✅ Cloud Logging utility ([lib/cloud-logging.ts](../lib/cloud-logging.ts))
- ✅ Error tracking integrated into error-logger.ts
- ✅ Event tracking in auth provider (login, logout, token refresh)
- ✅ Offline/online status tracking
- ✅ Analytics initialization in app providers

## 🔧 Required Setup Steps

### 1. Enable Firebase Analytics (5 minutes)

Firebase Analytics needs to be enabled in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **quiver-tools**
3. In the left sidebar, click **Analytics** → **Dashboard**
4. If not already enabled, click **Enable Google Analytics**
5. Follow the setup wizard:
   - Link to existing Google Analytics property OR create new one
   - Accept terms of service
   - Click **Enable Analytics**

**Verification:**
- Once enabled, you should see the Analytics dashboard
- The dashboard will show "No data yet" until the app starts logging events

---

### 2. Add Firebase Measurement ID (Optional - for GA4)

If you linked Google Analytics, you may need to add a measurement ID:

1. In Firebase Console → **Project Settings** → **General**
2. Scroll to **Your apps** section
3. Find your web app (1:533544956312:web:a28839ad89b7dd39d1fbed)
4. Look for **Measurement ID** (starts with `G-`)
5. If present, add to your `.env` file:

```bash
# In apps/gtd/.env (create if it doesn't exist)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

6. Update [lib/firebase/config.ts](../lib/firebase/config.ts) to include measurementId:

```typescript
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Add this
};
```

**Note:** This is optional. Analytics will work without it, but GA4 integration requires it.

---

### 3. Set Up GCP Cloud Logging (10 minutes)

Cloud Logging is automatically available for Cloud Run deployments, but you should configure log viewing and alerts:

#### View Logs:

1. Go to [GCP Console](httpsI I'm console.cloud.google.com)
2. Select project: **quiver-tools** (ID: quiver-tools)
3. Navigate to **Logging** → **Logs Explorer**
4. Use these filters to view your app logs:

```
resource.type="cloud_run_revision"
resource.labels.service_name="gtd"
```

5. Save this as a **Saved Query** for easy access:
   - Click **Save query** at the top
   - Name it "GTD App Logs"

#### Create Error Log Filter:

Create a filter to see only errors:

```
resource.type="cloud_run_revision"
resource.labels.service_name="gtd"
severity>=ERROR
```

Save as "GTD Errors Only"

---

### 4. Set Up Log-Based Alerts (15 minutes)

Configure alerts to notify you of errors:

#### Alert for High Error Rate:

1. In GCP Console → **Logging** → **Logs-based Alerts**
2. Click **Create Alert**
3. Configure:

**Log query:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="gtd"
severity>=ERROR
```

**Alert Details:**
- Alert name: `GTD High Error Rate`
- Description: `More than 10 errors in 5 minutes`

**Metric configuration:**
- Type: **Log-based metric**
- Log query: (use the query above)
- Time series: **Rate**

**Configure alert condition:**
- Condition type: **Threshold**
- Threshold position: **Above threshold**
- Threshold value: `10`
- For: `5 minutes`

**Notifications:**
- Click **Add notification channel**
- Choose **Email**
- Enter your email: chris@christopheresplin.com
- Click **Add**

**Documentation (optional):**
```
The GTD app is experiencing a high error rate.

Check logs: https://console.cloud.google.com/logs/query?project=quiver-tools

Dashboard: https://console.firebase.google.com/project/quiver-tools/analytics
```

4. Click **Save**

#### Alert for App Crashes:

Repeat the above process with:

**Log query:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="gtd"
jsonPayload.severity="CRITICAL"
```

**Alert Details:**
- Alert name: `GTD Critical Error`
- Threshold value: `1`
- For: `1 minute`

---

### 5. Set Up Uptime Monitoring (10 minutes)

Monitor if your app is accessible:

1. In GCP Console → **Monitoring** → **Uptime checks**
2. Click **Create Uptime Check**

**Configure check:**
- Protocol: **HTTPS**
- Resource Type: **URL**
- Hostname: Your production URL (e.g., `quiver-gtd.web.app` or custom domain)
- Path: `/` (or `/api/health` if you create a health endpoint)
- Check frequency: **5 minutes**

**Response Validation (optional):**
- Response timeout: **10 seconds**
- Check for: **Status code** → **200**

**Alert & Notification:**
- Create alert: **Yes**
- Alert name: `GTD App Down`
- Duration: **2 minutes** (alerts after 2 consecutive failures)
- Notification channels: Select your email

**Regions to check from:**
- Select 2-3 regions near your users (e.g., USA, Europe, Asia)

3. Click **Test** to verify the check works
4. Click **Create**

---

### 6. Create a Monitoring Dashboard (15 minutes)

Create a centralized dashboard for monitoring:

1. In GCP Console → **Monitoring** → **Dashboards**
2. Click **Create Dashboard**
3. Name it: `GTD App Monitoring`

#### Add Charts:

**Chart 1: Request Count**
- Click **Add Chart**
- Chart type: **Line**
- Resource type: `Cloud Run Revision`
- Metric: `Request count`
- Filter: `service_name = "gtd"`
- Aggregation: **Sum**

**Chart 2: Error Rate**
- Add another chart
- Chart type: **Line**
- Query:
```
resource.type="cloud_run_revision"
resource.labels.service_name="gtd"
severity>=ERROR
```
- Display: **Rate**

**Chart 3: Response Latency**
- Add another chart
- Resource type: `Cloud Run Revision`
- Metric: `Request latencies`
- Filter: `service_name = "gtd"`
- Aggregation: **95th percentile**

**Chart 4: Uptime Check Status**
- Add another chart
- Resource type: `Uptime Check`
- Metric: `Check passed`
- Filter: Your uptime check name

4. Click **Save Dashboard**

---

### 7. Test the Monitoring Setup (5 minutes)

Verify everything is working:

#### Test Firebase Analytics:

1. Run the app locally:
```bash
cd apps/gtd
bun dev
```

2. Open http://localhost:3000 in your browser
3. Perform these actions:
   - Sign in with Google
   - Complete a task
   - Go offline (turn off network in DevTools)
   - Go back online
   - Sign out

4. Check Firebase Console → **Analytics** → **Events**
   - You should see: `login_success`, `task_completed`, `offline_mode_detected`, etc.
   - Note: Events may take 10-30 minutes to appear in the console

#### Test Error Logging:

1. Add a test button to force an error (temporary):

```typescript
// In your app somewhere visible
<button onClick={() => {
  import('@/lib/error-logger').then(m => 
    m.logError(new Error('Test error'), { action: 'test_monitoring' })
  );
}}>
  Test Error
</button>
```

2. Click the button
3. Check console - should see error logged
4. Deploy to production and check GCP Logs Explorer
5. Remove the test button after verification

---

## 📊 What You're Now Tracking

### Firebase Analytics Events:

✅ User Authentication:
- `login_success`
- `logout_success`
- `token_refresh_failed`

✅ Task Operations:
- `task_completed`
- `task_created`
- `task_deleted`
- `task_moved`

✅ App Status:
- `offline_mode_detected`
- `online_mode_restored`

✅ Feature Usage:
- `multi_select_used`
- `gtd_list_viewed`
- `gtd_list_created`

✅ Errors:
- `error_occurred` (with error details)

### GCP Cloud Logging:

✅ Structured logs with severity levels
✅ Performance metrics
✅ API call logging (when implemented)
✅ Error stack traces

---

## 🎯 Next Steps (Optional)

### Add More Event Tracking:

You can track additional events by importing from [lib/firebase/analytics.ts](../lib/firebase/analytics.ts):

```typescript
import { 
  trackTaskCompleted,
  trackMultiSelectUsed,
  trackGtdListViewed 
} from '@/lib/firebase/analytics';

// In your components:
trackTaskCompleted(task.id, 'next');
trackMultiSelectUsed(selectedTasks.length, 'delete');
trackGtdListViewed('waiting');
```

### Create a Health Check Endpoint:

Add a simple health check for uptime monitoring:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString() 
  });
}
```

Update uptime check to monitor `/api/health` instead of `/`.

### Set Up Performance Monitoring:

Firebase also offers Performance Monitoring:

1. Enable in Firebase Console → **Performance**
2. Install: `npm install firebase/performance`
3. Add to analytics initialization

---

## 💰 Cost Estimate

With your current scale (~10-100 daily active users):

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|----------------|------|
| Firebase Analytics | Unlimited | All events | **$0** |
| GCP Cloud Logging | 50 GB/month | ~1-2 GB/month | **$0** |
| GCP Monitoring | 1M API calls/month | ~50k/month | **$0** |
| Uptime Checks | 100 checks/month | ~8,640/month | **$0** |
| **TOTAL** | | | **$0/month** |

You won't pay anything until you exceed:
- 50 GB of logs per month (~500k users)
- 1M monitoring API calls per month

---

## 🆘 Troubleshooting

### Analytics events not showing up:

- Events can take 10-30 minutes to appear in Firebase Console
- Check browser console for "[Analytics] Initialized successfully"
- Verify Firebase config is correct in `.env`
- Make sure Analytics is enabled in Firebase Console

### Cloud Logging not capturing logs:

- Logs only appear in GCP after deploying to Cloud Run
- Local development logs only show in console
- Check that your Cloud Run service is deployed
- Verify you're viewing logs for the correct project/service

### Alerts not triggering:

- Test alerts by forcing errors or downtime
- Check notification channels are verified (email confirmation)
- Review alert conditions - they may be too strict
- Check GCP → Monitoring → Alerting to see alert status

---

## 📚 Resources

- [Firebase Analytics Docs](https://firebase.google.com/docs/analytics)
- [GCP Cloud Logging](https://cloud.google.com/logging/docs)
- [GCP Monitoring](https://cloud.google.com/monitoring/docs)
- [Firebase Console](https://console.firebase.google.com/project/quiver-tools)
- [GCP Console](https://console.cloud.google.com/logs/query?project=quiver-tools)

---

## ✅ Monitoring Checklist

After completing this guide, verify:

- [ ] Firebase Analytics enabled in console
- [ ] Analytics events appearing in Firebase Console (after 30 min)
- [ ] GCP Cloud Logging dashboard accessible
- [ ] Error log filter saved
- [ ] High error rate alert configured
- [ ] Critical error alert configured
- [ ] Uptime check created and passing
- [ ] Monitoring dashboard created
- [ ] Email notifications working (test with forced error)
- [ ] Test error tracking (force error, check logs)

**Total setup time: ~1 hour**

Your monitoring is now production-ready! 🎉
