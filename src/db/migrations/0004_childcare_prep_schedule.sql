CREATE TABLE "child" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"due_date" date,
	"birth_date" date,
	"sex" text,
	"sort_order" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"measured_on" date NOT NULL,
	"weight_kg" numeric(5, 2),
	"height_cm" numeric(4, 1),
	"head_cm" numeric(4, 1),
	"note" text,
	"recorded_by_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "growth_record_has_value" CHECK ("growth_record"."weight_kg" is not null or "growth_record"."height_cm" is not null or "growth_record"."head_cm" is not null)
);
--> statement-breakpoint
CREATE TABLE "health_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"standard_code" text,
	"due_date" date,
	"due_until" date,
	"scheduled_at" timestamp with time zone,
	"place" text,
	"done_on" date,
	"done_by_member_id" uuid,
	"dismissed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_event_child_standard_code_unique" UNIQUE("child_id","standard_code")
);
--> statement-breakpoint
CREATE TABLE "prep_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"quantity" text,
	"note" text,
	"is_done" boolean DEFAULT false NOT NULL,
	"done_by_member_id" uuid,
	"done_at" timestamp with time zone,
	"sort_order" integer NOT NULL,
	"created_by_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "child" ADD CONSTRAINT "child_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_record" ADD CONSTRAINT "growth_record_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_record" ADD CONSTRAINT "growth_record_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_record" ADD CONSTRAINT "growth_record_recorded_by_member_id_household_member_id_fk" FOREIGN KEY ("recorded_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_event" ADD CONSTRAINT "health_event_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_event" ADD CONSTRAINT "health_event_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_event" ADD CONSTRAINT "health_event_done_by_member_id_household_member_id_fk" FOREIGN KEY ("done_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_item" ADD CONSTRAINT "prep_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_item" ADD CONSTRAINT "prep_item_done_by_member_id_household_member_id_fk" FOREIGN KEY ("done_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_item" ADD CONSTRAINT "prep_item_created_by_member_id_household_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_household_id_idx" ON "child" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "growth_record_child_measured_idx" ON "growth_record" USING btree ("child_id","measured_on");--> statement-breakpoint
CREATE INDEX "health_event_child_due_idx" ON "health_event" USING btree ("child_id","due_date");--> statement-breakpoint
CREATE INDEX "prep_item_household_id_idx" ON "prep_item" USING btree ("household_id");