// SCALE Engine — Logger
import pino from 'pino';
export const logger = pino({
    level: process.env.SCALE_LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l' },
        },
});
//# sourceMappingURL=logger.js.map