# {{Service/Project}} Go-Live Checklist

*Complete pre-launch verification for production deployment*

---

## Overview

This checklist ensures your integration is production-ready, secure, and optimized. Complete all items before enabling live transactions.

**Estimated Completion Time:** 2-3 hours

---

## ✅ Pre-Launch Verification

### 1. Account & Credentials

- [ ] **Account approved** and verified
- [ ] **Live API keys** obtained (prefix: `{{live_prefix}}`)
- [ ] **Test API keys** removed from production environment
- [ ] **Webhook secret** configured for production
- [ ] **API keys stored securely** in environment variables (not in code)
- [ ] **Key rotation schedule** established (recommend 90 days)

**Verification:**
```bash
# Verify live keys configured
grep "{{SERVICE}}_KEY={{live_prefix}}" .env

# Verify no test keys in production
! grep "{{test_prefix}}" .env
```

---

### 2. Integration Configuration

- [ ] **Production API base URL** configured
- [ ] **Webhook endpoint** accessible via HTTPS
- [ ] **Success/cancel URLs** use production domain
- [ ] **All URLs use HTTPS** (not HTTP)
- [ ] **Timeout settings** appropriate for your use case
- [ ] **Rate limiting** understood and accommodated

**Configuration Validation:**
<!-- Code example in the project's language; the stack add-on's skill has samples. -->

---

### 3. Flow Testing

- [ ] **End-to-end test** completed in sandbox
- [ ] **Success flow** tested and verified
- [ ] **Failure flow** tested (invalid data, errors)
- [ ] **Cancellation flow** tested
- [ ] **Timeout/expiration** handling tested
- [ ] **Return URL handling** tested (success, cancel, error)
- [ ] **Edge cases** tested (duplicates, race conditions)

**Test Scenarios:**
```
1. User completes flow → Success state → Follow-up triggered
2. User cancels flow → Cancelled state → No follow-up
3. Flow expires → Timeout state → Cleanup triggered
4. Error occurs → Error state → User notified
5. Network error → Retry logic → Eventually resolves
```

---

### 4. Webhook Integration

- [ ] **Signature verification** implemented with timing-safe comparison
- [ ] **Endpoint returns 200** within 5 seconds
- [ ] **Idempotency implemented** (duplicate event handling)
- [ ] **Event logging** configured
- [ ] **Retry handling** tested
- [ ] **All event types handled**:
  - [ ] `{{entity}}.created`
  - [ ] `{{entity}}.succeeded`
  - [ ] `{{entity}}.failed`
  - [ ] `{{entity}}.canceled`
- [ ] **Background job processing** configured
- [ ] **Dead letter queue** for failed webhook processing

---

### 5. Security Implementation

- [ ] **API keys never exposed** in client-side code
- [ ] **Environment variables** used for all secrets
- [ ] **HTTPS enforced** for all communication
- [ ] **Webhook signatures verified** for every event
- [ ] **CSRF protection** enabled
- [ ] **Rate limiting** implemented
- [ ] **Input validation** for all data
- [ ] **SQL injection prevention** (parameterized queries)
- [ ] **XSS protection** enabled
- [ ] **Session security** configured
- [ ] **TLS 1.2+** enforced
- [ ] **Error messages sanitized** (no sensitive data leakage)

**Security Audit:**
```bash
# Check for exposed secrets
! grep -r "{{live_prefix}}" app/ public/ resources/

# Verify HTTPS enforcement
grep "FORCE_HTTPS=true" .env
```

---

### 6. Error Handling

- [ ] **Try-catch blocks** around all API calls
- [ ] **Graceful degradation** for API outages
- [ ] **User-friendly error messages** (no technical details)
- [ ] **Error logging** to monitoring service
- [ ] **Admin notifications** for critical errors
- [ ] **Timeout handling** implemented
- [ ] **Network error retries** with exponential backoff

---

### 7. Database & Data Integrity

- [ ] **Records stored** before API call
- [ ] **Transaction IDs** saved for reconciliation
- [ ] **Status updated** from webhook events
- [ ] **Idempotency keys** stored
- [ ] **Audit trail** maintained
- [ ] **Database transactions** used for related updates
- [ ] **Rollback logic** for failed operations
- [ ] **Database backups** scheduled and tested

---

### 8. Monitoring & Logging

- [ ] **Application logging** configured
- [ ] **Error tracking** service integrated (Sentry, Bugsnag)
- [ ] **Success rate** monitoring
- [ ] **Webhook delivery** monitoring
- [ ] **API response time** tracking
- [ ] **Critical error notifications** configured
- [ ] **Dashboard** for real-time monitoring
- [ ] **Log retention** policy (minimum 90 days)

**Key Metrics:**
```
- Success rate: Target >98%
- Webhook delivery: Target >99%
- API response time: Target <200ms P95
- Error rate: Alert if >5%
```

---

### 9. Performance Optimization

- [ ] **Database indexes** for key queries
- [ ] **Caching** implemented where appropriate
- [ ] **Connection pooling** configured
- [ ] **Queue workers** scaled
- [ ] **N+1 queries** prevented
- [ ] **Load testing** completed
- [ ] **Auto-scaling** configured (if applicable)

---

### 10. User Experience

- [ ] **Action buttons** visible and accessible
- [ ] **Loading indicators** shown during processing
- [ ] **Success messages** clear and helpful
- [ ] **Error messages** actionable
- [ ] **Mobile responsiveness** tested
- [ ] **Accessibility** standards met (WCAG 2.1 AA)
- [ ] **Confirmation emails** configured

---

### 11. Compliance & Legal

- [ ] **Terms of Service** updated
- [ ] **Privacy Policy** updated
- [ ] **Cookie consent** implemented (if needed)
- [ ] **GDPR compliance** verified (if EU users)
- [ ] **Data retention** policy established

---

### 12. Documentation & Training

- [ ] **Internal documentation** created
- [ ] **Team training** completed
- [ ] **Runbook** for common issues
- [ ] **Incident response plan** documented
- [ ] **Support team** trained

---

## 🚀 Go-Live Procedure

### Pre-Launch (1 week before)

**Day -7:**
- [ ] Complete all checklist items
- [ ] Schedule go-live date (low-traffic period)
- [ ] Prepare rollback plan

**Day -3:**
- [ ] Final testing with live-like data
- [ ] Review monitoring dashboards
- [ ] Confirm on-call coverage

**Day -1:**
- [ ] Final security audit
- [ ] Database backup verification
- [ ] Code freeze
- [ ] Pre-launch team meeting

### Launch Day

1. [ ] **Switch API keys** to live
2. [ ] **Deploy** using safe deployment strategy
3. [ ] **Verify** with smoke tests
4. [ ] **Test** with small real transaction
5. [ ] **Monitor** for 2 hours
6. [ ] **Enable** for all users
7. [ ] **Announce** (optional)

### Post-Launch (First 24 Hours)

**Hour 1:**
- [ ] Monitor success rate (target >98%)
- [ ] Verify webhook delivery
- [ ] Check error logs

**Hour 6:**
- [ ] Review volume and patterns
- [ ] Verify processing working correctly
- [ ] Check support tickets

**Hour 24:**
- [ ] Generate first daily report
- [ ] Review any failures
- [ ] Schedule retrospective

---

## 🔄 Rollback Plan

### Trigger Conditions
- Success rate < 80%
- Webhook failure rate > 10%
- Critical security vulnerability
- Data corruption

### Rollback Steps
1. **Disable** new transactions immediately
2. **Enable** maintenance mode
3. **Revert** to previous version
4. **Switch back** to test keys (if needed)
5. **Notify** support team
6. **Analyze** root cause

---

## 📊 Success Metrics

### Week 1 Targets
- **Success Rate**: > 98%
- **Webhook Delivery**: > 99%
- **API Response Time**: < 200ms P95
- **Error Rate**: < 2%
- **User Complaints**: < 1% of transactions

---

## ✅ Final Verification

Before marking go-live complete:

- [ ] All checklist items completed
- [ ] Test transaction processed successfully
- [ ] Real transactions working
- [ ] Webhooks delivering correctly
- [ ] Monitoring operational
- [ ] Team ready for support
- [ ] Rollback plan tested

**Sign-Off:**
```
Go-Live Approval:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Engineering Lead: _________________ Date: __________
Security Lead: _________________ Date: __________
Product Manager: _________________ Date: __________
```

---

*Last Updated: {{Date}}*
*Version: 1.0*
