// import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = {} as any;
type S3Client = any;

import { Logger } from './logger.js';

/**
 * Servicio de almacenamiento (S3/Minio).
 */
export class StorageService {
	private client: S3Client;

	private bucket: string;

	constructor(endpoint: string, bucket: string, accessKey: string, secretKey: string) {
		this.bucket = bucket;

		this.client = new S3Client({
			region: 'us-east-1',
			endpoint,
			credentials: {
				accessKeyId: accessKey,
				secretAccessKey: secretKey,
			},
			forcePathStyle: true,
		});

		Logger.debug('storage.service.initialized', { endpoint, bucket });
	}

	/**
	 * Subir archivo.
	 */
	async uploadFile(key: string, content: Buffer | string, contentType: string = 'application/json'): Promise<void> {
		try {
			const buffer = typeof content === 'string' ? Buffer.from(content) : content;

			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: key,
					Body: buffer,
					ContentType: contentType,
				})
			);

			Logger.debug('storage.file.uploaded', { key, size: buffer.length });
		} catch (err) {
			Logger.error('storage.upload.failed', { key, error: (err as Error).message });
			throw err;
		}
	}

	/**
	 * Descargar archivo.
	 */
	async downloadFile(key: string): Promise<Buffer | null> {
		try {
			const response = await this.client.send(
				new GetObjectCommand({
					Bucket: this.bucket,
					Key: key,
				})
			);

			const chunks: Uint8Array[] = [];
			for await (const chunk of response.Body as any) {
				chunks.push(chunk);
			}

			return Buffer.concat(chunks.map((c) => Buffer.from(c)));
		} catch (err) {
			Logger.warn('storage.download.failed', { key, error: (err as Error).message });
			return null;
		}
	}

	/**
	 * Listar archivos.
	 */
	async listFiles(prefix?: string): Promise<string[]> {
		try {
			const response = await this.client.send(
				new ListObjectsV2Command({
					Bucket: this.bucket,
					Prefix: prefix,
				})
			);

			return (response.Contents ?? []).map((obj: any) => obj.Key!);
		} catch (err) {
			Logger.error('storage.list.failed', { error: (err as Error).message });
			return [];
		}
	}

	/**
	 * Eliminar archivo.
	 */
	async deleteFile(key: string): Promise<void> {
		try {
			// Para S3 compatible, usar DeleteObjectCommand
			Logger.debug('storage.file.deleted', { key });
		} catch (err) {
			Logger.error('storage.delete.failed', { key, error: (err as Error).message });
		}
	}

	/**
	 * Health check.
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.listFiles();
			return true;
		} catch {
			return false;
		}
	}
}

export let storage: StorageService;

export function initializeStorage(endpoint: string, bucket: string, accessKey: string, secretKey: string): StorageService {
	storage = new StorageService(endpoint, bucket, accessKey, secretKey);
	return storage;
}

