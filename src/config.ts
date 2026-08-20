import dotenv from 'dotenv';
dotenv.config();

export const config = {
	port: Number(process.env.PORT ?? 3000),
	env: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
	serviceName: process.env.SERVICE_NAME ?? 'aura-service',
};
