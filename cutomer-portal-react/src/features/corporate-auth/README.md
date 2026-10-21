# Corporate authentication

Open `/corporate/login` in the frontend development server. All Corporate APIs use
`http://localhost:8080/api/corporate`; the browser must also be able to reach the backend.
Use `localhost:5173` for the frontend to match the backend CORS configuration.

Only the Corporate-owned success screen is integrated; a teammate's Dashboard remains
pending. Corporate protected routes enforce five minutes of inactivity using persisted,
session-bound activity timestamps. Missing activity timestamps fail closed (sessions
created before this update must log in again). Real interactions send Corporate
keep-alive at most once per minute, with no polling or concurrent duplicate operations. The session-bound request
reservation survives reloads; untrusted synthetic activity is ignored.
Reloads and tab sleep do not reset activity. The backend keep-alive endpoint runs
through the existing Corporate JWT/session filter; it never extends absolute expiry.
The client enforces the returned refresh JWT expiry as an upper bound. Backend checks
remain authoritative for signature validity, revocation, idle expiry and absolute expiry.
Client-side JWT claim inspection is a routing check, not cryptographic authentication.

The ten-minute setup timer begins conservatively when OTP verification is requested;
the backend independently uses OTP consumption time. Failed completion requests can be
retried without repeating password/PIN setup. Failed logout always clears Corporate
local state, but cannot guarantee server-side revocation if the backend was unreachable.
Passwords, PINs and OTPs are never persisted. Corporate storage, refresh locks and
generation state are independent of Individual authentication.

## Focused tests

These tests use real React DOM, React Router and Axios, with jsdom and an in-process
mock backend adapter. They do not contact a backend or validate actual JWT signatures.
No project dependency or lockfile change is needed for the isolated test prerequisite:

```sh
npm install --prefix /tmp/minibank-corporate-test-tools --no-audit --no-fund jsdom
CORPORATE_TEST_JSDOM=/tmp/minibank-corporate-test-tools/node_modules/jsdom \
  node --test src/features/corporate-auth/__tests__/*.test.cjs
npx --no-install eslint src/features/corporate-auth src/app/router/RouterProvider.tsx
npm run build
```

The repository's existing missing `Account` export in
`src/features/customer-account/data/mockData.tsx` may block the full build independently
of these Corporate files. Never modify that teammate-owned file for these tests.


Corporate access validation reuses the existing no-activity-write ACCESS validator.
The Corporate-only activity repository then locks the row, samples the existing
application clock after waiting, rechecks expiry/revocation, and updates only
activity/audit metadata. It never merges the validated entity or writes token hashes.

`CusCorporateSessionActivityConcurrencyTest` exercises this SQL against a separate
throwaway MySQL 8.4 database. It is skipped without an explicit
`corporate.test.jdbcUrl` matching the isolated loopback test database. Never point
it at the application database. The HTTP/filter tests use mocked persistence;
they do not replace the independent MySQL concurrency tests.
