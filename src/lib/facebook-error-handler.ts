import { NextResponse } from "next/server";

export interface FacebookError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

export interface FacebookErrorResponse {
  error: FacebookError;
}

export interface LogContext {
  userId?: string;
  pageId?: string;
  operation?: string;
  timestamp?: number;
  additional?: Record<string, any>;
}

export class FacebookErrorHandler {
  private static instance: FacebookErrorHandler;

  private constructor() {}

  public static getInstance(): FacebookErrorHandler {
    if (!FacebookErrorHandler.instance) {
      FacebookErrorHandler.instance = new FacebookErrorHandler();
    }
    return FacebookErrorHandler.instance;
  }

  /**
   * Parse Facebook API error response
   */
  public parseFacebookError(error: any): FacebookError | null {
    try {
      // Handle string errors
      if (typeof error === 'string') {
        try {
          const parsed = JSON.parse(error);
          return parsed.error || null;
        } catch {
          return {
            message: error,
            type: 'OAuthException',
            code: 0,
          };
        }
      }

      // Handle object errors
      if (error && typeof error === 'object') {
        if (error.error) {
          return error.error;
        }
        
        // Direct error object
        if (error.message && error.code) {
          return error;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Determine if error is retryable
   */
  public isRetryableError(error: FacebookError): boolean {
    const retryableCodes = [
      1, // API Unknown
      2, // API Service
      4, // API Too Many Calls
      17, // API User Too Many Calls
      341, // Application limit reached
      368, // Temporarily blocked for policies violations
    ];

    const retryableTypes = [
      'OAuthException',
      'GraphMethodException',
    ];

    return retryableCodes.includes(error.code) || 
           retryableTypes.includes(error.type);
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyMessage(error: FacebookError): string {
    if (error.error_user_msg) {
      return error.error_user_msg;
    }

    switch (error.code) {
      case 100:
        return "Invalid parameter. Please check your configuration.";
      case 190:
        return "Access token expired. Please reconnect your Facebook account.";
      case 200:
        return "Permission denied. Please grant the required permissions.";
      case 400:
        return "Application request limit reached. Please try again later.";
      case 506:
        return "Duplicate post detected.";
      case 613:
        return "Rate limit exceeded. Please wait before trying again.";
      default:
        return error.message || "An error occurred while connecting to Facebook.";
    }
  }

  /**
   * Determine error severity
   */
  public getErrorSeverity(error: FacebookError): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCodes = [190, 463, 467, 468]; // Access token issues
    const highCodes = [100, 200, 240, 341, 368]; // Permission/limit issues
    const mediumCodes = [1, 2, 4, 17, 400, 506, 613]; // Retryable issues

    if (criticalCodes.includes(error.code)) return 'critical';
    if (highCodes.includes(error.code)) return 'high';
    if (mediumCodes.includes(error.code)) return 'medium';
    return 'low';
  }

  /**
   * Log error with context
   */
  public logError(
    error: FacebookError,
    context: LogContext = {},
    originalError?: any
  ): void {
    const severity = this.getErrorSeverity(error);
    const timestamp = context.timestamp || Date.now();
    
    const logEntry = {
      timestamp: new Date(timestamp).toISOString(),
      severity,
      facebook_error: {
        code: error.code,
        type: error.type,
        message: error.message,
        subcode: error.error_subcode,
        trace_id: error.fbtrace_id,
      },
      context: {
        user_id: context.userId,
        page_id: context.pageId,
        operation: context.operation,
        ...context.additional,
      },
      original_error: originalError ? {
        message: originalError.message,
        stack: originalError.stack,
      } : undefined,
    };

    // Log based on severity
    switch (severity) {
      case 'critical':
        console.error('🚨 CRITICAL Facebook API Error:', logEntry);
        break;
      case 'high':
        console.error('🔴 HIGH Priority Facebook API Error:', logEntry);
        break;
      case 'medium':
        console.warn('🟡 MEDIUM Priority Facebook API Error:', logEntry);
        break;
      case 'low':
        console.info('🟢 LOW Priority Facebook API Error:', logEntry);
        break;
    }

    // In production, you might want to send this to a monitoring service
    // like Sentry, LogRocket, or your own logging infrastructure
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(logEntry);
    }
  }

  /**
   * Send error to monitoring service (placeholder)
   */
  private sendToMonitoring(logEntry: any): void {
    // TODO: Implement actual monitoring service integration
    // Examples:
    // - Sentry.captureException()
    // - LogRocket.captureException()
    // - Custom webhook/API call
    console.log('📊 Sending to monitoring service:', logEntry);
  }

  /**
   * Handle API response error and return appropriate HTTP response
   */
  public handleApiError(
    error: any,
    context: LogContext = {}
  ): NextResponse {
    const facebookError = this.parseFacebookError(error);
    
    if (facebookError) {
      this.logError(facebookError, context, error);
      
      const severity = this.getErrorSeverity(facebookError);
      const userMessage = this.getUserFriendlyMessage(facebookError);
      
      // Determine HTTP status code based on Facebook error
      let statusCode = 500;
      
      switch (facebookError.code) {
        case 190: // Invalid access token
        case 463: // Invalid session
        case 467: // Invalid access token
        case 468: // Invalid access token
          statusCode = 401;
          break;
        case 200: // Permission denied
        case 240: // Desktop app restriction
          statusCode = 403;
          break;
        case 100: // Invalid parameter
        case 506: // Duplicate post
          statusCode = 400;
          break;
        case 400: // Application limit
        case 613: // Rate limit
          statusCode = 429;
          break;
        default:
          statusCode = 500;
      }

      return NextResponse.json(
        {
          error: userMessage,
          code: facebookError.code,
          type: facebookError.type,
          severity,
          retryable: this.isRetryableError(facebookError),
          trace_id: facebookError.fbtrace_id,
        },
        { status: statusCode }
      );
    }

    // Handle non-Facebook errors
    this.logError(
      {
        message: error.message || 'Unknown error',
        type: 'UnknownError',
        code: 0,
      },
      context,
      error
    );

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        code: 0,
        type: "UnknownError",
        severity: "medium",
        retryable: false,
      },
      { status: 500 }
    );
  }

  /**
   * Validate webhook signature with detailed error reporting
   */
  public validateWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string
  ): { valid: boolean; error?: string; details?: any } {
    try {
      if (!signature) {
        return {
          valid: false,
          error: "Missing signature header",
          details: { expected_header: "x-hub-signature-256 or x-hub-signature" }
        };
      }

      if (!appSecret) {
        return {
          valid: false,
          error: "App secret not configured",
          details: { required_env: "FACEBOOK_APP_SECRET" }
        };
      }

      const crypto = require('crypto');
      let expectedSignature: string;
      let method: string;

      if (signature.startsWith('sha256=')) {
        method = 'sha256';
        expectedSignature = 'sha256=' + crypto
          .createHmac('sha256', appSecret)
          .update(payload, 'utf8')
          .digest('hex');
      } else if (signature.startsWith('sha1=')) {
        method = 'sha1';
        expectedSignature = 'sha1=' + crypto
          .createHmac('sha1', appSecret)
          .update(payload, 'utf8')
          .digest('hex');
      } else {
        return {
          valid: false,
          error: "Invalid signature format",
          details: { 
            received_format: signature.split('=')[0],
            expected_formats: ["sha1", "sha256"]
          }
        };
      }

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      return {
        valid: isValid,
        details: {
          method,
          payload_length: payload.length,
          signature_verified: isValid
        }
      };

    } catch (error) {
      return {
        valid: false,
        error: `Signature validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { exception: error }
      };
    }
  }
}

export const facebookErrorHandler = FacebookErrorHandler.getInstance();