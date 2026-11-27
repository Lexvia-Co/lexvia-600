CREATE TABLE "applicant_details" (
	"application_id" uuid PRIMARY KEY,
	"owner_id" text NOT NULL,
	"answers" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"guide_version" text NOT NULL,
	"last_step" text DEFAULT 'identity' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"templates" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"evidence_key" text NOT NULL,
	"kind" text NOT NULL,
	"original_id" uuid,
	"file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"size" integer NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_request_id" UNIQUE("application_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"application_id" uuid,
	"owner_id" text NOT NULL,
	"evidence_key" text,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "evidence_items_pkey" PRIMARY KEY("application_id","evidence_key")
);
--> statement-breakpoint
CREATE TABLE "storage_cleanup" (
	"document_id" uuid,
	"kind" text,
	"due_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "storage_cleanup_pkey" PRIMARY KEY("document_id","kind")
);
--> statement-breakpoint
CREATE INDEX "applications_owner_idx" ON "applications" ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "applications_expiry_idx" ON "applications" ("expires_at");--> statement-breakpoint
CREATE INDEX "documents_state_created_idx" ON "documents" ("state","created_at");--> statement-breakpoint
CREATE INDEX "storage_cleanup_due_idx" ON "storage_cleanup" ("due_at");--> statement-breakpoint
ALTER TABLE "applicant_details" ADD CONSTRAINT "applicant_details_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE;