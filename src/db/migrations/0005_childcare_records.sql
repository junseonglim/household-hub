CREATE TABLE "care_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"type" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text,
	"recorded_by_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"title" text NOT NULL,
	"achieved_on" date NOT NULL,
	"note" text,
	"recorded_by_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_log" ADD CONSTRAINT "care_log_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_log" ADD CONSTRAINT "care_log_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_log" ADD CONSTRAINT "care_log_recorded_by_member_id_household_member_id_fk" FOREIGN KEY ("recorded_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone" ADD CONSTRAINT "milestone_recorded_by_member_id_household_member_id_fk" FOREIGN KEY ("recorded_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_log_child_started_idx" ON "care_log" USING btree ("child_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "care_log_running_timer_unique" ON "care_log" USING btree ("child_id","type") WHERE "care_log"."ended_at" is null and ("care_log"."type" = 'sleep' or ("care_log"."type" = 'feeding' and "care_log"."details"->>'method' = 'breast'));--> statement-breakpoint
CREATE INDEX "milestone_child_achieved_idx" ON "milestone" USING btree ("child_id","achieved_on");