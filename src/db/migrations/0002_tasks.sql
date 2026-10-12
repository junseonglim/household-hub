CREATE TABLE "task" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"module" text NOT NULL,
	"space_id" uuid,
	"title" text NOT NULL,
	"note" text,
	"recurrence" jsonb NOT NULL,
	"start_date" date NOT NULL,
	"next_due_date" date,
	"assignee_member_id" uuid,
	"estimated_minutes" integer,
	"last_completed_at" timestamp with time zone,
	"created_by_member_id" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_completion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"completed_by_member_id" uuid NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"due_date" date,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_member_id_household_member_id_fk" FOREIGN KEY ("assignee_member_id") REFERENCES "public"."household_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_member_id_household_member_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completion" ADD CONSTRAINT "task_completion_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completion" ADD CONSTRAINT "task_completion_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completion" ADD CONSTRAINT "task_completion_completed_by_member_id_household_member_id_fk" FOREIGN KEY ("completed_by_member_id") REFERENCES "public"."household_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_household_module_due_idx" ON "task" USING btree ("household_id","module","next_due_date") WHERE "task"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "task_completion_task_completed_idx" ON "task_completion" USING btree ("task_id","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "task_completion_household_completed_idx" ON "task_completion" USING btree ("household_id","completed_at");