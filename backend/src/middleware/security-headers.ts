import helmet from 'helmet';
import type { RequestHandler, Application } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// API-only CSP: no scripts, styles, or images needed
const cspDirectives = {
  defaultSrc: ['\'none\''],
  scriptSrc: ['\'none\''],
  styleSrc: ['\'none\''],
  imgSrc: ['\'none\''],
  fontSrc: ['\'none\''],
  connectSrc: ['\'none\''],
  frameAncestors: ['\'none\''],
  objectSrc: ['\'none\''],
  baseUri: ['\'none\''],
  formAction: ['\'none\''],
  ...(isProduction && { upgradeInsecureRequests: [] }),
};

const permissionsPolicyMiddleware: RequestHandler = (_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'interest-cohort=()',
      'browsing-topics=()',
      'attribution-reporting=()',
    ].join(', ')
  );
  next();
};

export const applySecurityHeaders = (app: Application): void => {
  app.use(
    helmet({
      contentSecurityPolicy: { directives: cspDirectives },
      strictTransportSecurity: isProduction
        ? { maxAge: 63072000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: isProduction ? { policy: 'require-corp' } : false,
      frameguard: { action: 'deny' },
      xssFilter: false,
    })
  );

  app.use(permissionsPolicyMiddleware);
};
