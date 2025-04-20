# Advanced JavaScript Debug Utility

## How to Use This Debug Utility

### Basic Usage

```javascript
// Import the logger
import logger from './debug-manager.js';

// Log at different levels
logger.error('Something went wrong', {userId: 123});
logger.warn('This might be a problem');
logger.info('User logged in', {username: 'john.doe'});
logger.debug('Processing data', {items: data.length});
logger.trace('Function called with arguments', {args});

// Log exceptions
try {
    // Some code that might throw
} catch (error) {
    logger.exception(error, {action: 'processingData'});
}
```

### Performance Measurement

```javascript
// Method 1: Start/end pattern
logger.startPerformanceMark('api-call', {endpoint: '/users'});
await fetchUsers();
logger.endPerformanceMark('api-call', {userCount: users.length});

// Method 2: Measuring a function execution
const result = logger.measurePerformance('database-query')(() => {
    return db.query('SELECT * FROM users');
});

// Method 3: Measuring an async function
const asyncResult = await logger.measurePerformance('heavy-calculation')(async () => {
    const result = await complexCalculation();
    return result;
});
```

### Grouped Logs

```javascript
logger.group('User Authentication Flow');
logger.info('Validating credentials');
logger.debug('Password hash comparison', {method: 'bcrypt'});
logger.info('Authentication successful');
logger.groupEnd();
```

### Data Tables

```javascript
logger.table(users, 'Current users in system');
```

### Managing the Logger

```javascript
// Change log level based on environment
if (process.env.NODE_ENV === 'production') {
    logger.setLevel('error');
} else {
    logger.setLevel('debug');
}

// Add global context
logger.setContext('sessionId', sessionId);
logger.setContext('userId', user.id);

// Export logs for debugging
const logData = logger.exportLogs();
logger.downloadLogs();
```

## Sentry Integration

When you're ready to integrate with Sentry, update the configuration and uncomment the Sentry code in the relevant
methods. First, install Sentry:

```shell script
npm install @sentry/browser @sentry/tracing
```

Then update the initialization:

```javascript
// In your main.js or similar entry point
import logger from './debug-manager.js';

// Configure for production use with Sentry
if (process.env.NODE_ENV === 'production') {
    logger.options.sentryEnabled = true;
    logger.options.sentryDSN = 'your-sentry-dsn';
    logger.options.level = 'error'; // Only report errors in production
}
```

## Benefits of This Debug Utility

1. **Comprehensive**: Handles all logging needs in one utility
2. **Performance-focused**: Built-in performance measurement tools
3. **Integration-ready**: Designed to work with Sentry for production monitoring
4. **User-friendly**: Visually formatted console output
5. **Persistence**: Optionally saves logs for debugging across page refreshes
6. **Environment-aware**: Configurable based on development vs. production
7. **Privacy-conscious**: Includes methods to mask sensitive data
8. **Export capabilities**: Download logs for sharing or further analysis
9. **Contextual**: Automatically includes global context in all logs
10. **Flexible**: Multiple configuration options to adapt to different needs

This debug utility will significantly improve your development workflow and make troubleshooting much easier, while also
preparing your application for production monitoring with Sentry.