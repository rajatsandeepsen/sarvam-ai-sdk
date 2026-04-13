import { z } from "zod";

export type DocumentIntelligenceLanguage =
	| "hi-IN"
	| "en-IN"
	| "bn-IN"
	| "gu-IN"
	| "kn-IN"
	| "ml-IN"
	| "mr-IN"
	| "or-IN"
	| "pa-IN"
	| "ta-IN"
	| "te-IN"
	| "ur-IN"
	| "as-IN"
	| "bodo-IN"
	| "doi-IN"
	| "ks-IN"
	| "kok-IN"
	| "mai-IN"
	| "mni-IN"
	| "ne-IN"
	| "sa-IN"
	| "sat-IN"
	| "sd-IN"
	| (string & {});

export type DocumentIntelligenceOutputFormat = "html" | "md" | "json";

export type JobState =
	| "Accepted"
	| "Pending"
	| "Running"
	| "Completed"
	| "PartiallyCompleted"
	| "Failed";

export type DigitizeDocumentOptions = {
	/**
	 * Primary language of the document in BCP-47 format.
	 * @default "hi-IN"
	 */
	language?: DocumentIntelligenceLanguage;
	/**
	 * Output format for extracted content (delivered as a ZIP buffer).
	 * - `md`: Markdown files (default)
	 * - `html`: Structured HTML with layout preservation
	 * - `json`: Structured JSON for programmatic processing
	 * @default "md"
	 */
	outputFormat?: DocumentIntelligenceOutputFormat;
	/**
	 * Optional webhook URL for job completion notification.
	 */
	callbackUrl?: string;
	/**
	 * Auth token sent as X-SARVAM-JOB-CALLBACK-TOKEN header with the webhook.
	 */
	callbackAuthToken?: string;
	/**
	 * How often to poll for job status in milliseconds.
	 * @default 3000
	 */
	pollIntervalMs?: number;
	/**
	 * Maximum time to wait for job completion in milliseconds.
	 * @default 300000 (5 minutes)
	 */
	timeoutMs?: number;
	/**
	 * AbortSignal to cancel the operation.
	 */
	abortSignal?: AbortSignal;
};

export type DigitizeDocumentResult = {
	/** Zip archive as a Buffer containing the processed document output files */
	output: Buffer;
	/** Job ID for reference */
	jobId: string;
	/** Final job state */
	jobState: JobState;
	/** Page processing metrics */
	pageMetrics: {
		totalPages: number;
		pagesProcessed: number;
		pagesSucceeded: number;
		pagesFailed: number;
	};
};

const createJobResponseSchema = z.object({
	job_id: z.string(),
	job_state: z.string(),
});

const uploadUrlsResponseSchema = z.object({
	job_id: z.string(),
	upload_urls: z.record(
		z.string(),
		z.object({
			file_url: z.string(),
		}),
	),
});

const jobStatusResponseSchema = z.object({
	job_id: z.string(),
	job_state: z.string(),
	job_details: z
		.array(
			z.object({
				outputs: z
					.array(
						z.object({
							file_id: z.string(),
							file_name: z.string(),
						}),
					)
					.optional(),
				total_pages: z.number().optional(),
				pages_processed: z.number().optional(),
				pages_succeeded: z.number().optional(),
				pages_failed: z.number().optional(),
			}),
		)
		.optional(),
});

const downloadUrlResponseSchema = z.object({
	download_urls: z.record(z.string(), z.object({ file_url: z.string() })),
});

export class SarvamDocumentIntelligence {
	constructor(
		private readonly baseURL: string,
		private readonly headers: () => Record<string, string>,
		private readonly fetchFn?: typeof fetch,
	) {}

	private get fetch() {
		return this.fetchFn ?? globalThis.fetch;
	}

	/**
	 * Digitizes a document using the Sarvam Vision Document Intelligence API.
	 *
	 * This method handles the full async workflow:
	 * 1. Creates a job
	 * 2. Gets presigned upload URL
	 * 3. Uploads the document
	 * 4. Starts processing
	 * 5. Polls until complete
	 * 6. Downloads and returns the output ZIP as a Buffer
	 *
	 * @param file - The document to process (Buffer, Uint8Array, or Blob). Supports PDF, PNG, JPEG, or ZIP of images.
	 * @param filename - Filename with extension (e.g. "document.pdf", "pages.zip")
	 * @param options - Configuration options
	 *
	 * @example
	 * ```ts
	 * import { sarvam } from "sarvam-ai-sdk";
	 * import { readFile, writeFile } from "fs/promises";
	 *
	 * const file = await readFile("./invoice.pdf");
	 * const result = await sarvam.documentIntelligence.digitize(file, "invoice.pdf", {
	 *   language: "hi-IN",
	 *   outputFormat: "md",
	 * });
	 *
	 * await writeFile("./output.zip", result.output);
	 * console.log(`Processed ${result.pageMetrics.pagesSucceeded} pages`);
	 * ```
	 */
	async digitize(
		file: Buffer | Uint8Array | Blob,
		filename: string,
		options: DigitizeDocumentOptions = {},
	): Promise<DigitizeDocumentResult> {
		const {
			language = "hi-IN",
			outputFormat = "md",
			callbackUrl,
			callbackAuthToken,
			pollIntervalMs = 3000,
			timeoutMs = 300_000,
			abortSignal,
		} = options;

		const headers = this.headers();

		// Step 1: Create job
		const createJobRes = await this.fetch(
			`${this.baseURL}/doc-digitization/job/v1`,
			{
				method: "POST",
				headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify({
					job_parameters: { language, output_format: outputFormat },
					callback: callbackUrl
						? { url: callbackUrl, auth_token: callbackAuthToken ?? "" }
						: null,
				}),
				signal: abortSignal,
			},
		);

		if (!createJobRes.ok) {
			const err = await createJobRes.json().catch(() => ({}));
			throw new Error(
				`Failed to create document intelligence job: ${JSON.stringify(err)}`,
			);
		}

		const { job_id } = createJobResponseSchema.parse(await createJobRes.json());

		// Step 2: Get presigned upload URL
		const uploadUrlRes = await this.fetch(
			`${this.baseURL}/doc-digitization/job/v1/upload-files`,
			{
				method: "POST",
				headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify({ job_id, files: [filename] }),
				signal: abortSignal,
			},
		);

		if (!uploadUrlRes.ok) {
			const err = await uploadUrlRes.json().catch(() => ({}));
			throw new Error(`Failed to get upload URLs: ${JSON.stringify(err)}`);
		}

		const { upload_urls } = uploadUrlsResponseSchema.parse(
			await uploadUrlRes.json(),
		);

		const uploadUrl = upload_urls[filename]?.file_url;
		if (!uploadUrl) {
			throw new Error(`No upload URL returned for file: ${filename}`);
		}

		// Step 3: Upload file to presigned URL
		const fileBlob =
			file instanceof Blob
				? file
				: new Blob([file], { type: _mimeType(filename) });

		const uploadRes = await this.fetch(uploadUrl, {
			method: "PUT",
			headers: { "Content-Type": _mimeType(filename) },
			body: fileBlob,
			signal: abortSignal,
		});

		if (!uploadRes.ok) {
			throw new Error(`Failed to upload file: HTTP ${uploadRes.status}`);
		}

		// Step 4: Start the job
		const startRes = await this.fetch(
			`${this.baseURL}/doc-digitization/job/v1/${job_id}/start`,
			{
				method: "POST",
				headers,
				signal: abortSignal,
			},
		);

		if (!startRes.ok) {
			const err = await startRes.json().catch(() => ({}));
			throw new Error(`Failed to start job: ${JSON.stringify(err)}`);
		}

		// Step 5: Poll for completion
		const deadline = Date.now() + timeoutMs;
		let statusData = jobStatusResponseSchema.parse(await startRes.json());

		while (
			statusData.job_state !== "Completed" &&
			statusData.job_state !== "PartiallyCompleted" &&
			statusData.job_state !== "Failed"
		) {
			if (Date.now() > deadline) {
				throw new Error(
					`Document intelligence job timed out after ${timeoutMs}ms`,
				);
			}
			if (abortSignal?.aborted) {
				throw new Error("Document intelligence job was aborted");
			}

			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

			const pollRes = await this.fetch(
				`${this.baseURL}/doc-digitization/job/v1/${job_id}`,
				{ headers, signal: abortSignal },
			);

			if (!pollRes.ok) {
				throw new Error(`Failed to poll job status: HTTP ${pollRes.status}`);
			}

			statusData = jobStatusResponseSchema.parse(await pollRes.json());
		}

		if (statusData.job_state === "Failed") {
			throw new Error(`Document intelligence job failed`);
		}

		// Collect page metrics
		const detail = statusData.job_details?.[0];
		const pageMetrics = {
			totalPages: detail?.total_pages ?? 0,
			pagesProcessed: detail?.pages_processed ?? 0,
			pagesSucceeded: detail?.pages_succeeded ?? 0,
			pagesFailed: detail?.pages_failed ?? 0,
		};

		// Step 6: Get download URLs
		const outputFileIds =
			detail?.outputs?.map((o) => o.file_id).filter(Boolean) ?? [];

		if (outputFileIds.length === 0) {
			throw new Error("No output files found after job completion");
		}

		const downloadUrlRes = await this.fetch(
			`${this.baseURL}/doc-digitization/job/v1/download-files`,
			{
				method: "POST",
				headers: { ...headers, "Content-Type": "application/json" },
				body: JSON.stringify({ job_id, file_ids: outputFileIds }),
				signal: abortSignal,
			},
		);

		if (!downloadUrlRes.ok) {
			throw new Error(
				`Failed to get download URLs: HTTP ${downloadUrlRes.status}`,
			);
		}

		const { download_urls } = downloadUrlResponseSchema.parse(
			await downloadUrlRes.json(),
		);

		const firstDownloadUrl = Object.values(download_urls)[0]?.file_url;
		if (!firstDownloadUrl) {
			throw new Error("No download URL returned");
		}

		// Download the output ZIP
		const outputRes = await this.fetch(firstDownloadUrl, {
			signal: abortSignal,
		});

		if (!outputRes.ok) {
			throw new Error(`Failed to download output: HTTP ${outputRes.status}`);
		}

		const outputBuffer = Buffer.from(await outputRes.arrayBuffer());

		return {
			output: outputBuffer,
			jobId: job_id,
			jobState: statusData.job_state as JobState,
			pageMetrics,
		};
	}
}

function _mimeType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "pdf":
			return "application/pdf";
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "zip":
			return "application/zip";
		default:
			return "application/octet-stream";
	}
}
