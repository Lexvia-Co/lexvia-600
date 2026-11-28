ALTER TABLE "documents" ADD COLUMN "language" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "intended_use" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "file_inspection" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "reference_only" boolean DEFAULT false NOT NULL;