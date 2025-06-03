/**
 * DebugManager - Advanced debugging utility with Sentry integration capabilities
 *
 * Features:
 * - Multiple log levels
 * - Performance tracking
 * - Error tracking and reporting
 * - Contextual logging
 * - Sentry integration
 * - Conditional logging based on environment
 * - Console styling
 * - Group logging
 * - Stack trace analysis
 */
import * as Sentry from '@sentry/browser';

class DebugManager {
    /**
     * @param {Object} options - Configuration options
     * @param {boolean} [options.enabled=true] - Whether debugging is enabled
     * @param {string} [options.level='info'] - Default log level (error, warn, info, debug, trace)
     * @param {boolean} [options.persistLogs=false] - Whether to persist logs to localStorage
     * @param {boolean} [options.sentryEnabled=false] - Whether Sentry integration is enabled
     * @param {string} [options.sentryDSN=''] - Sentry DSN for error reporting
     * @param {string} [options.environment='development'] - Current environment
     * @param {Object} [options.context={}] - Global context to include with all logs
     * @param {number} [options.maxLogEntries=1000] - Maximum number of logs to keep in memory
     */
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== undefined ? options.enabled : true,
            level: options.level || 'info',
            persistLogs: options.persistLogs || false,
            sentryEnabled: options.sentryEnabled || false,
            sentryDSN: options.sentryDSN || '',
            environment: options.environment || (window.location.hostname === 'localhost' ? 'development' : 'production'),
            context: options.context || {},
            maxLogEntries: options.maxLogEntries || 1000
        };

        // Initialize log levels with numeric values for comparison
        this.logLevels = {
            error: 1,
            warn: 2,
            info: 3,
            debug: 4,
            trace: 5
        };

        // Current log level numeric value
        this.currentLevelValue = this.logLevels[this.options.level] || 3;

        // Storage for logs
        this.logs = [];

        // Performance marks
        this.marks = {};

        // Color schemes for different log types
        this.styles = {
            error: 'background: #FF5252; color: white; padding: 2px 4px; border-radius: 2px;',
            warn: 'background: #FFB300; color: white; padding: 2px 4px; border-radius: 2px;',
            info: 'background: #2196F3; color: white; padding: 2px 4px; border-radius: 2px;',
            debug: 'background: #4CAF50; color: white; padding: 2px 4px; border-radius: 2px;',
            trace: 'background: #9C27B0; color: white; padding: 2px 4px; border-radius: 2px;',
            performance: 'background: #E91E63; color: white; padding: 2px 4px; border-radius: 2px;',
            groupTitle: 'color: #3F51B5; font-weight: bold; font-size: 1.1em;'
        };

        // Initialize Sentry if enabled
        if (this.options.sentryEnabled && this.options.sentryDSN) {
            this._initSentry();
        }

        // Load persisted logs if enabled
        if (this.options.persistLogs) {
            this._loadLogs();
        }

        // Enable debug mode based on localStorage or URL parameter
        this._checkDebugMode();

        // Log initialization
        this.info('DebugManager initialized', {
            options: this.options,
            environment: this.options.environment
        });
    }

    /**
     * Enable or disable the debug manager
     * @param {boolean} enabled - Whether debugging should be enabled
     */
    setEnabled(enabled) {
        this.options.enabled = enabled;
        localStorage.setItem('debug_enabled', enabled.toString());
        this.info(`Debugging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set the current log level
     * @param {string} level - The log level to set
     */
    setLevel(level) {
        if (this.logLevels[level]) {
            this.options.level = level;
            this.currentLevelValue = this.logLevels[level];
            localStorage.setItem('debug_level', level);
            this.info(`Log level set to ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }

    /**
     * Adds a global context property to include with all logs
     * @param {string} key - Context key
     * @param {any} value - Context value
     */
    setContext(key, value) {
        this.options.context[key] = value;
    }

    /**
     * Log an error message
     * @param {string} message - The message to log*
     * @param {Object} [data] - Additional data to include
     * @param {boolean} [report=true] - Whether to report to Sentry
     */
    error(message, data = {}, report = true) {
        if (!this.options.enabled || this.currentLevelValue < this.logLevels.error) return;

        const entry = this._createLogEntry('error', message, data);
        this._outputLog(entry, 'error');

        if (report && this.options.sentryEnabled) {
            this._reportToSentry(message, data);
        }
    }

    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {Object} [data] - Additional data to include
     */
    warn(message, data = {}) {
        if (!this.options.enabled || this.currentLevelValue < this.logLevels.warn) return;

        const entry = this._createLogEntry('warn', message, data);
        this._outputLog(entry, 'warn');
    }

    /**
     * Log an info message
     * @param {string} message - The message to log
     * @param {Object} [data] - Additional data to include
     */
    info(message, data = {}) {
        if (!this.options.enabled || this.currentLevelValue < this.logLevels.info) return;

        const entry = this._createLogEntry('info', message, data);
        this._outputLog(entry, 'info');
    }

    /**
     * Log a debug message
     * @param {string} message - The message to log
     * @param {Object} [data] - Additional data to include
     */
    debug(message, data = {}) {
        if (!this.options.enabled || this.currentLevelValue < this.logLevels.debug) return;

        const entry = this._createLogEntry('debug', message, data);
        this._outputLog(entry, 'debug');
    }

    /**
     * Log a trace message with stack trace
     * @param {string} message - The message to log
     * @param {Object} [data] - Additional data to include
     */
    trace(message, data = {}) {
        if (!this.options.enabled || this.currentLevelValue < this.logLevels.trace) return;

        const stack = new Error().stack;
        const entry = this._createLogEntry('trace', message, {...data, stack});
        this._outputLog(entry, 'trace');
    }

    /**
     * Log an error object with full stack trace
     * @param {Error} error - The error object to log
     * @param {Object} [context] - Additional context for the error
     * @param {boolean} [report=true] - Whether to report to Sentry
     */
    exception(error, context = {}, report = true) {
        if (!this.options.enabled) return;

        const errorData = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            ...context
        };

        const entry = this._createLogEntry('error', `Exception: ${error.message}`, errorData);
        this._outputLog(entry, 'error');

        if (report && this.options.sentryEnabled) {
            this._reportExceptionToSentry(error, context);
        }
    }

    /**
     * Start a performance measurement
     * @param {string} name - Identifier for the performance mark
     * @param {Object} [data] - Additional data to include
     */
    startPerformanceMark(name, data = {}) {
        if (!this.options.enabled) return;

        const start = performance.now();
        this.marks[name] = {start, data};

        if (window.performance && window.performance.mark) {
            window.performance.mark(`${name}-start`);
        }

        this.debug(`⏱️ Performance measurement started: ${name}`, data);
    }

    /**
     * End a performance measurement and log the result
     * @param {string} name - Identifier for the performance mark
     * @param {Object} [data] - Additional data to include
     * @returns {number|null} The duration in milliseconds or null if the mark doesn't exist
     */
    endPerformanceMark(name, data = {}) {
        if (!this.options.enabled) return null;

        if (!this.marks[name]) {
            this.warn(`Performance mark not found: ${name}`);
            return null;
        }

        const end = performance.now();
        const duration = end - this.marks[name].start;
        const combinedData = {...this.marks[name].data, ...data, duration};

        if (window.performance && window.performance.mark && window.performance.measure) {
            window.performance.mark(`${name}-end`);
            window.performance.measure(name, `${name}-start`, `${name}-end`);
        }

        // If Sentry is enabled, add performance data
        if (this.options.sentryEnabled && duration > 500) {
            this._logPerformanceToSentry(name, duration, combinedData);
        }

        const entry = this._createLogEntry('performance',
            `⏱️ ${name}: ${duration.toFixed(2)}ms`, combinedData);

        this._outputLog(entry, 'performance');
        delete this.marks[name];

        return duration;
    }

    /**
     * Create a performance measurement function
     * @param {string} name - Base name for the performance measure
     * @returns {Function} A function that will measure the execution time of the provided function
     */
    measurePerformance(name) {
        return (fn, ...args) => {
            const measureName = `${name}${this.logs.length}`;
            this.startPerformanceMark(measureName);

            try {
                const result = fn(...args);

                // Handle promises
                if (result instanceof Promise) {
                    return result.then(value => {
                        this.endPerformanceMark(measureName);
                        return value;
                    }).catch(error => {
                        this.endPerformanceMark(measureName, {error: error.message});
                        throw error;
                    });
                }

                this.endPerformanceMark(measureName);
                return result;
            } catch (error) {
                this.endPerformanceMark(measureName, {error: error.message});
                throw error;
            }
        };
    }

    /**
     * Start a new logging group
     * @param {string} name - Name of the group
     */
    group(name) {
        if (!this.options.enabled) return;

        console.group(`%c${name}`, this.styles.groupTitle);
        this.debug(`Group started: ${name}`);
    }

    /**
     * End the current logging group
     */
    groupEnd() {
        if (!this.options.enabled) return;

        console.groupEnd();
        this.debug('Group ended');
    }

    /**
     * Log a table of data
     * @param {Array|Object} data - The data to display as a table
     * @param {string} [message] - Optional message to display with the table
     */
    table(data, message) {
        if (!this.options.enabled) return;

        if (message) {
            this.info(message);
        }

        console.table(data);
        this._addLogEntry('info', message || 'Data table', {data});
    }

    /**
     * Clear all logs from memory and console
     */
    clearLogs() {
        this.logs = [];

        if (this.options.persistLogs) {
            localStorage.removeItem('debug_logs');
        }

        console.clear();
        this.info('Logs cleared');
    }

    /**
     * Export all logs as JSON
     * @returns {string} JSON string of all logs
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Download logs as a JSON file
     */
    downloadLogs() {
        const json = this.exportLogs();
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.info('Logs downloaded');
    }

    /**
     * Initialize Sentry integration
     * @private
     */
    _initSentry() {
        // This is a placeholder for actual Sentry initialization
        // In a real implementation, you would import Sentry and initialize it here
        this.info('Sentry integration is ready to be enabled', {
            dsn: this._maskSensitiveData(this.options.sentryDSN),
            environment: this.options.environment
        });

        Sentry.init({
            sendDefaultPii: true,
            dsn: this.options.sentryDSN,
            // Tracing
            tracesSampleRate: 1.0, // Capture 100% of the transactions
            // Session Replay
            replaysSessionSampleRate: 1.0, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
            replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
            environment: this.options.environment
        });
    }

    /**
     * Report an error to Sentry
     * @param {string} message - Error message
     * @param {Object} data - Error data
     * @private
     */
    _reportToSentry(message, data) {
        if (!this.options.sentryEnabled) return;

        // Placeholder for actual Sentry reporting
        this.debug('Would report to Sentry:', {message, data});

        // Example of how an error would be reported to Sentry:
        Sentry.captureMessage(message, {
            level: 'error',
            extra: data
        });
    }

    /**
     * Report an exception to Sentry
     * @param {Error} error - The error object
     * @param {Object} context - Additional context
     * @private
     */
    _reportExceptionToSentry(error, context) {
        if (!this.options.sentryEnabled) return;

        // Placeholder for actual Sentry exception reporting
        this.debug('Would report exception to Sentry:', {error, context});

        // Example of how an exception would be reported to Sentry:
        // Sentry.captureException(error, {
        //     extra: context,
        //     tags: {
        //         module: context.module || 'unknown'
        //     }
        // });
    }

    /**
     * Log performance data to Sentry
     * @param {string} name - Performance mark name
     * @param {number} duration - Duration in milliseconds
     * @param {Object} data - Additional performance data
     * @private
     */
    _logPerformanceToSentry(name, duration, data) {
        // Placeholder for actual Sentry performance reporting
        this.debug('Would log performance to Sentry:', {name, duration, data});

        // Example of how performance would be logged to Sentry:
        const transaction = Sentry.startTransaction({
            name: `performance-${name}`,
            op: 'measure'
        });

        Sentry.configureScope(scope => {
            scope.setSpan(transaction);
        });

        transaction.setData('duration', duration);
        transaction.setData('context', data);
        transaction.finish();
    }

    /**
     * Create a structured log entry
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     * @returns {Object} Structured log entry
     * @private
     */
    _createLogEntry(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: {...data},
            context: {...this.options.context},
            environment: this.options.environment
        };
    }

    /**
     * Add a log entry to the logs array and persist if enabled
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     * @private
     */
    _addLogEntry(level, message, data) {
        const entry = this._createLogEntry(level, message, data);

        this.logs.push(entry);

        // Limit the number of logs kept in memory
        if (this.logs.length > this.options.maxLogEntries) {
            this.logs.shift();
        }

        // Persist logs if enabled
        if (this.options.persistLogs) {
            this._saveLogs();
        }

        return entry;
    }

    /**
     * Output a log entry to the console
     * @param {Object} entry - Log entry
     * @param {string} logMethod - Console method to use
     * @private
     */
    _outputLog(entry, logMethod) {
        this._addLogEntry(entry.level, entry.message, entry.data);

        const method = logMethod === 'performance' ? 'info' : logMethod;
        const style = this.styles[logMethod];

        if (Object.keys(entry.data).length > 0 || Object.keys(entry.context).length > 0) {
            console[method](
                `%c${entry.level.toUpperCase()}%c ${entry.message}`,
                style,
                'color: inherit',
                {...entry.data, context: entry.context}
            );
        } else {
            console[method](
                `%c${entry.level.toUpperCase()}%c ${entry.message}`,
                style,
                'color: inherit'
            );
        }
    }

    /**
     * Save logs to localStorage
     * @private
     */
    _saveLogs() {
        try {
            // localStorage.setItem('debug_logs', JSON.stringify(this.logs.slice(-100)));
        } catch (e) {
            // Handle localStorage errors (e.g., quota exceeded)
            // console.warn('Failed to save logs to localStorage', e);
        }
    }

    /**
     * Load logs from localStorage
     * @private
     */
    _loadLogs() {
        try {
            const savedLogs = localStorage.getItem('debug_logs');
            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
            }
        } catch (e) {
            console.warn('Failed to load logs from localStorage', e);
        }
    }

    /**
     * Check if debug mode should be enabled based on localStorage or URL parameter
     * @private
     */
    _checkDebugMode() {
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');

        if (debugParam !== null) {
            this.setEnabled(debugParam === 'true' || debugParam === '1');

            // Set level if provided in URL
            const levelParam = urlParams.get('debug_level');
            if (levelParam && this.logLevels[levelParam]) {
                this.setLevel(levelParam);
            }
            return;
        }

        // Check localStorage
        const storedDebugEnabled = localStorage.getItem('debug_enabled');
        if (storedDebugEnabled !== null) {
            this.setEnabled(storedDebugEnabled === 'true');
        }

        // Check stored level
        const storedLevel = localStorage.getItem('debug_level');
        if (storedLevel && this.logLevels[storedLevel]) {
            this.setLevel(storedLevel);
        }
    }

    /**
     * Mask sensitive data for logging
     * @param {string} data - The sensitive data to mask
     * @returns {string} Masked data
     * @private
     */
    _maskSensitiveData(data) {
        if (!data) return '';
        if (typeof data !== 'string') return '[masked]';

        // Show first and last 4 characters, mask the rest
        if (data.length <= 8) return '[masked]';
        return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
    }
}

// Create a global instance
const logger = new DebugManager({
    enabled: true,
    level: 'info',
    persistLogs: true,
    sentryEnabled: true, // Set to true when ready to integrate with Sentry
    sentryDSN: 'https://dfc61382bbb4358a8fc26b798799df02@o4509165419626496.ingest.us.sentry.io/4509165421854720', // Add your Sentry DSN when ready
    environment: 'development',
    context: {
        appName: 'CardCollector',
        version: '1.0.0'
    }
});

// Export logger for use in other modules
export default logger;