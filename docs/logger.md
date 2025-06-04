# Logger Documentation - DebugManager

## Overview

The DebugManager is an advanced debugging utility with Sentry integration capabilities designed for web applications. It
provides comprehensive logging, performance tracking, error reporting, and debugging features.

## Features

- ✅ Multiple log levels (error, warn, info, debug, trace)
- ✅ Performance tracking and measurement
- ✅ Error tracking and reporting
- ✅ Contextual logging with global context
- ✅ Sentry integration for production error monitoring
- ✅ Conditional logging based on environment
- ✅ Console styling with color-coded output
- ✅ Group logging for organized output
- ✅ Stack trace analysis
- ✅ Log persistence to localStorage
- ✅ Log export and download functionality

## Installation and Setup

The logger is already instantiated globally and can be imported:

```
import logger from './debug-manager.js';
```

## Configuration Options

The DebugManager constructor accepts the following options:

| Option          | Type    | Default         | Description                                         |
|-----------------|---------|-----------------|-----------------------------------------------------|
| `enabled`       | boolean | `true`          | Whether debugging is enabled                        |
| `level`         | string  | `'info'`        | Default log level (error, warn, info, debug, trace) |
| `persistLogs`   | boolean | `false`         | Whether to persist logs to localStorage             |
| `sentryEnabled` | boolean | `false`         | Whether Sentry integration is enabled               |
| `sentryDSN`     | string  | `''`            | Sentry DSN for error reporting                      |
| `environment`   | string  | `'development'` | Current environment                                 |
| `context`       | object  | `{}`            | Global context to include with all logs             |
| `maxLogEntries` | number  | `1000`          | Maximum number of logs to keep in memory            |

## Log Levels

The logger supports 5 log levels with numeric priorities:

1. **error** (1) - Critical errors that need immediate attention
2. **warn** (2) - Warning messages for potential issues
3. **info** (3) - General informational messages
4. **debug** (4) - Detailed debugging information
5. **trace** (5) - Most verbose level with stack traces

## Basic Logging Methods

### Error Logging

```
// Basic error
logger.error('Something went wrong');

// Error with additional data
logger.error('API call failed', { 
    endpoint: '/api/users', 
    status: 500 
});

// Error without Sentry reporting
logger.error('Local error', {}, false);
```

### Warning Logging

```
logger.warn('Deprecated function used');
logger.warn('Low memory', { availableMemory: '128MB' });
```

### Info Logging

```

logger.info('User logged in', { userId: 123 });
logger.info('Application started');
```

### Debug Logging

```

logger.debug('Processing data', { itemCount: 50 });
logger.debug('Function called', { functionName: 'processData' });
```

### Trace Logging

```

// Includes automatic stack trace
logger.trace('Detailed execution path', { step: 'validation' });
```

### Exception Logging

```

try {
    // Some code that might throw
} catch (error) {
    // Log with context and Sentry reporting
    logger.exception(error, { 
        module: 'userService',
        operation: 'createUser' 
    });
    
    // Log without Sentry reporting
    logger.exception(error, { module: 'localOperation' }, false);
}
```

## Performance Tracking

### Basic Performance Measurement

```

// Start timing
logger.startPerformanceMark('dataProcessing', { 
    dataSize: 1000 
});

// Your code here...

// End timing and log result
const duration = logger.endPerformanceMark('dataProcessing', { 
    processed: 1000 
});
console.log(`Processing took ${duration}ms`);
```

### Function Performance Measurement

```

// Create a performance wrapper
const measureDataProcessing = logger.measurePerformance('dataProcessing');

// Use it to measure any function
const result = measureDataProcessing(() => {
    // Your expensive operation
    return processLargeDataset(data);
});

// Works with async functions too
const asyncResult = await measureDataProcessing(async () => {
    return await fetchUserData();
});
```

## Configuration and Control

### Enable/Disable Logging

```

// Enable debugging
logger.setEnabled(true);

// Disable debugging
logger.setEnabled(false);
```

### Set Log Level

```

// Only show errors and warnings
logger.setLevel('warn');

// Show all logs
logger.setLevel('trace');

// Show info and above
logger.setLevel('info');
```

### Global Context

```

// Add global context that appears in all logs
logger.setContext('userId', 123);
logger.setContext('sessionId', 'abc123');
logger.setContext('module', 'userManagement');

// Now all logs will include this context automatically
logger.info('Action performed'); // Will include userId, sessionId, module
```

## Advanced Features

### Group Logging

```

logger.group('User Registration Process');
logger.info('Validating email');
logger.debug('Email format valid');
logger.info('Creating user record');
logger.debug('User saved to database');
logger.groupEnd();
```

### Table Logging

```

const users = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
];

logger.table(users, 'Current users in system');
```

### Log Management

```

// Clear all logs
logger.clearLogs();

// Export logs as JSON string
const logsJson = logger.exportLogs();

// Download logs as file
logger.downloadLogs(); // Downloads logs-[timestamp].json
```

## URL Parameters and localStorage

The logger automatically responds to URL parameters and localStorage settings:

### URL Parameters

```

# Enable debugging via URL
https://yourapp.com?debug=true

# Set debug level via URL
https://yourapp.com?debug=true&debug_level=debug
```

### localStorage Settings

The logger persists settings in localStorage:

- `debug_enabled`: 'true' or 'false'
- `debug_level`: 'error', 'warn', 'info', 'debug', or 'trace'
- `debug_logs`: Persisted logs (if `persistLogs` is enabled)

## Sentry Integration

When Sentry is enabled, the logger automatically:

- Reports errors and exceptions to Sentry
- Includes contextual information
- Filters out noisy errors in development
- Tracks performance for operations > 500ms
- Provides session replay for debugging

### Sentry Features

- Automatic error reporting
- Performance monitoring
- Session replay
- Environment-based configuration
- Error filtering

## Environment Detection

The logger automatically detects the environment:

- `localhost` → 'development'
- Other domains → 'production'

This affects:

- Sentry sampling rates
- Error filtering
- Default log levels

## Best Practices

### 1. Use Appropriate Log Levels

```

// Good
logger.error('Payment processing failed', { orderId, error });
logger.warn('API response slow', { duration: 2000 });
logger.info('User action completed', { action: 'profile_update' });
logger.debug('Validation step', { field: 'email', valid: true });

// Avoid
logger.error('User clicked button'); // Not an error
logger.debug('Critical system failure'); // Should be error level
```

### 2. Include Relevant Context

```

// Good
logger.error('Database connection failed', {
    database: 'users',
    host: 'db.example.com',
    timeout: 5000,
    retryAttempt: 3
});

// Less helpful
logger.error('Connection failed');
```

### 3. Use Performance Tracking for Critical Operations

```

// Track important operations
logger.startPerformanceMark('checkout');
await processCheckout();
logger.endPerformanceMark('checkout', { items: cartItems.length });

// Use measurement wrapper for reusable functions
const measureApiCall = logger.measurePerformance('apiCall');
const result = await measureApiCall(() => api.fetchUser(id));
```

### 4. Set Global Context Early

```
// In your app initialization
logger.setContext('appVersion', '1.2.3');
logger.setContext('userId', getCurrentUserId());
logger.setContext('feature', 'beta-checkout');
```

```


### 5. Group Related Operations
```

logger.group('Form Validation');
logger.debug('Validating email field');
logger.debug('Validating password field');
logger.info('Validation completed', { isValid: true });
logger.groupEnd();

```


## Common Use Cases

### API Error Handling
```

async function fetchUserData(userId) {
try {
logger.debug('Fetching user data', { userId });

        const response = await api.get(`/users/${userId}`);
        
        logger.info('User data fetched successfully', { 
            userId, 
            responseTime: response.timing 
        });
        
        return response.data;
    } catch (error) {
        logger.error('Failed to fetch user data', {
            userId,
            error: error.message,
            status: error.status
        });
        throw error;
    }

}

```


### Form Validation
```

function validateForm(formData) {
logger.group('Form Validation');

    const errors = [];
    
    if (!formData.email) {
        logger.warn('Email field is empty');
        errors.push('Email required');
    } else if (!isValidEmail(formData.email)) {
        logger.warn('Invalid email format', { email: formData.email });
        errors.push('Invalid email');
    } else {
        logger.debug('Email validation passed');
    }
    
    if (errors.length > 0) {
        logger.error('Form validation failed', { errors });
    } else {
        logger.info('Form validation successful');
    }
    
    logger.groupEnd();
    return errors;

}

```


### Performance Monitoring
```

async function processLargeDataset(data) {
const measureProcessing = logger.measurePerformance('dataProcessing');

    return measureProcessing(async () => {
        logger.info('Starting data processing', { recordCount: data.length });
        
        const results = [];
        for (let i = 0; i < data.length; i++) {
            if (i % 1000 === 0) {
                logger.debug('Processing progress', { 
                    processed: i, 
                    total: data.length 
                });
            }
            
            results.push(await processRecord(data[i]));
        }
        
        logger.info('Data processing completed', { 
            processedCount: results.length 
        });
        
        return results;
    });

}

```


## Troubleshooting

### Logger Not Working
1. Check if debugging is enabled: `logger.setEnabled(true)`
2. Verify log level: `logger.setLevel('debug')`
3. Check browser console for any initialization errors

### Sentry Not Reporting
1. Verify `sentryEnabled` is true
2. Check that `sentryDSN` is correctly configured
3. Ensure errors aren't being filtered out by the `beforeSend` function

### Performance Issues
1. Reduce log level in production: `logger.setLevel('warn')`
2. Disable log persistence: Set `persistLogs: false`
3. Reduce `maxLogEntries` if memory is a concern