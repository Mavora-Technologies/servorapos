CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'CHEF', 'HEAD_CHEF', 'STOREKEEPER', 'ACCOUNTANT');--> statement-breakpoint
CREATE TABLE "ai_assistant_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"sender_role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"tool_call_intent" varchar(80),
	"structured_data" jsonb,
	"suggested_actions" jsonb,
	"confidence_score" numeric(4, 2),
	"tokens_used" integer DEFAULT 0,
	"latency_ms" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_assistant_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) DEFAULT 'New Strategic Inquiry' NOT NULL,
	"scope_domain" varchar(50) DEFAULT 'GENERAL_OPS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"schedule_id" integer,
	"clock_in_at" timestamp with time zone NOT NULL,
	"clock_out_at" timestamp with time zone,
	"clock_in_method" varchar(50) DEFAULT 'PIN' NOT NULL,
	"clock_out_method" varchar(50),
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"total_duration_minutes" integer DEFAULT 0 NOT NULL,
	"regular_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"overtime_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'ON_DUTY' NOT NULL,
	"verification_status" varchar(50) DEFAULT 'VERIFIED' NOT NULL,
	"device_info" varchar(255),
	"ip_address" varchar(64),
	"notes" text,
	"approved_by_user_id" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"branch_id" integer,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"module" varchar(50) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"reason" text,
	"previous_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_statement_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_statement_id" integer NOT NULL,
	"line_date" timestamp with time zone NOT NULL,
	"transaction_reference" varchar(100),
	"description" text NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"matched_payment_id" integer,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bank_statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"statement_number" varchar(50) NOT NULL,
	"clearing_account" varchar(100) NOT NULL,
	"opening_balance" numeric(12, 4) NOT NULL,
	"closing_balance" numeric(12, 4) NOT NULL,
	"statement_date" timestamp with time zone NOT NULL,
	"status" varchar(30) DEFAULT 'OPEN' NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"subscription_id" integer,
	"invoice_number" varchar(100) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16.00' NOT NULL,
	"tax_amount" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"billing_period_start" timestamp with time zone NOT NULL,
	"billing_period_end" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method_type" varchar(50),
	"external_transaction_ref" varchar(150),
	"pdf_url" text,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "billing_payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"account_mask" varchar(50) NOT NULL,
	"brand_or_bank" varchar(50),
	"expiry_month" integer,
	"expiry_year" integer,
	"token" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"kra_pin" varchar(50),
	"etims_branch_id" varchar(20) DEFAULT '00',
	"etims_device_serial" varchar(100),
	"receipt_footer" text,
	"is_main_branch" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"delivery_status" varchar(50) DEFAULT 'SENT' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_drawers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"drawer_code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'CLOSED' NOT NULL,
	"current_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashier_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"cash_drawer_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"assigned_by_user_id" integer,
	"assignment_date" date NOT NULL,
	"shift_type" varchar(50) DEFAULT 'MORNING' NOT NULL,
	"status" varchar(50) DEFAULT 'ASSIGNED' NOT NULL,
	"allocated_float" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"max_cash_limit" numeric(12, 2) DEFAULT '50000.00' NOT NULL,
	"allow_refunds" boolean DEFAULT false NOT NULL,
	"allow_drawer_pop" boolean DEFAULT true NOT NULL,
	"allow_manual_discount" boolean DEFAULT false NOT NULL,
	"max_discount_percent" integer DEFAULT 0 NOT NULL,
	"activated_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"handover_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashier_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"cashier_id" integer NOT NULL,
	"closed_by_user_id" integer,
	"opening_float" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"expected_cash" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"counted_cash" numeric(12, 2),
	"variance" numeric(12, 2),
	"status" varchar(30) DEFAULT 'OPEN' NOT NULL,
	"variance_notes" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "combo_bundle_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"combo_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"additional_price" numeric(10, 2) DEFAULT '0.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combo_bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(150) NOT NULL,
	"description" text,
	"sku" varchar(50),
	"base_price" numeric(10, 2) NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"customer_id" integer NOT NULL,
	"order_id" integer,
	"staff_id" integer,
	"feedback_category" varchar(50) NOT NULL,
	"rating" integer NOT NULL,
	"nps_score" integer,
	"sentiment" varchar(20) DEFAULT 'NEUTRAL' NOT NULL,
	"channel" varchar(30) DEFAULT 'TABLE_QR' NOT NULL,
	"status" varchar(30) DEFAULT 'NEW' NOT NULL,
	"title" varchar(200) NOT NULL,
	"comments" text NOT NULL,
	"action_taken" text,
	"assigned_to_user_id" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_rating_range_chk" CHECK ("customer_feedback"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "feedback_nps_range_chk" CHECK ("customer_feedback"."nps_score" IS NULL OR ("customer_feedback"."nps_score" BETWEEN 0 AND 10))
);
--> statement-breakpoint
CREATE TABLE "customer_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"user_id" integer,
	"interaction_type" varchar(50) DEFAULT 'NOTE' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"details" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_loyalty_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"tier_id" integer,
	"current_points" integer DEFAULT 0 NOT NULL,
	"lifetime_points_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_points_redeemed" integer DEFAULT 0 NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_loyalty_profiles_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50) NOT NULL,
	"kra_pin" varchar(50),
	"company_name" varchar(255),
	"customer_type" varchar(50) DEFAULT 'RETAIL' NOT NULL,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"order_id" integer NOT NULL,
	"provider" varchar(100) DEFAULT 'In-House' NOT NULL,
	"fleet_vehicle_id" integer,
	"driver_name" varchar(255) NOT NULL,
	"driver_phone" varchar(50),
	"delivery_address" text,
	"tracking_url" varchar(500),
	"delivery_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'Assigned' NOT NULL,
	"dispatched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "demand_forecast_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"forecast_date" timestamp with time zone NOT NULL,
	"day_of_week" varchar(20) NOT NULL,
	"projected_covers" integer NOT NULL,
	"projected_gross_sales_kes" numeric(12, 2) NOT NULL,
	"historical_actual_sales_kes" numeric(12, 2),
	"recommended_foh_labor_hours" numeric(6, 2) NOT NULL,
	"recommended_boh_labor_hours" numeric(6, 2) NOT NULL,
	"scheduled_labor_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"optimal_staffing_headcount" integer NOT NULL,
	"labor_cost_budget_kes" numeric(12, 2) NOT NULL,
	"confidence_score" numeric(4, 2) DEFAULT '0.92' NOT NULL,
	"weather_factor" varchar(50) DEFAULT 'CLEAR_NORMAL' NOT NULL,
	"local_event_modifier" varchar(150),
	"variance_tolerance_pct" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_enrollment_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"pairing_code" varchar(12) NOT NULL,
	"token" text NOT NULL,
	"device_type" varchar(50) DEFAULT 'POS_TERMINAL' NOT NULL,
	"assigned_drawer_id" integer,
	"assigned_kitchen_station_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"claimed_device_id" integer,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dining_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawer_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"drawer_id" integer NOT NULL,
	"cashier_id" integer,
	"supervisor_id" integer,
	"status" varchar(30) DEFAULT 'OPEN' NOT NULL,
	"opening_float" numeric(12, 4) NOT NULL,
	"cash_sales_total" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"cash_drops_total" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"payouts_total" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"expected_closing_balance" numeric(12, 4) NOT NULL,
	"actual_closing_balance" numeric(12, 4),
	"variance" numeric(12, 4),
	"denominations" jsonb DEFAULT '{}'::jsonb,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"gl_account_code" varchar(50) DEFAULT '6100' NOT NULL,
	"requires_receipt" boolean DEFAULT true NOT NULL,
	"max_single_limit" numeric(12, 2) DEFAULT '50000.00' NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"category_id" integer NOT NULL,
	"voucher_number" varchar(50) NOT NULL,
	"expense_type" varchar(40) DEFAULT 'EMPLOYEE_REIMBURSEMENT' NOT NULL,
	"claimant_id" integer NOT NULL,
	"payee_name" varchar(255),
	"expense_date" date NOT NULL,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(50) DEFAULT 'CASH_DRAWER' NOT NULL,
	"merchant_tax_pin" varchar(50),
	"receipt_number" varchar(100),
	"receipt_attachment_url" text,
	"description" text NOT NULL,
	"status" varchar(30) DEFAULT 'SUBMITTED' NOT NULL,
	"approved_by_user_id" integer,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"paid_at" timestamp with time zone,
	"payment_reference" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"adjustment_number" varchar(50) NOT NULL,
	"adjustment_type" varchar(50) NOT NULL,
	"shift_id" integer,
	"attributed_user_id" integer,
	"created_by_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"adjustment_direction" varchar(20) DEFAULT 'DEBIT' NOT NULL,
	"debit_gl_account" varchar(50) NOT NULL,
	"credit_gl_account" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"approved_by_user_id" integer,
	"approved_at" timestamp with time zone,
	"posted_at" timestamp with time zone,
	"rejection_reason" text,
	"reason_code" varchar(80) NOT NULL,
	"justification_notes" text NOT NULL,
	"supporting_document_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"order_id" integer NOT NULL,
	"invoice_type" varchar(30) DEFAULT 'SALE' NOT NULL,
	"buyer_kra_pin" varchar(50),
	"cu_invoice_number" varchar(100),
	"sdc_id" varchar(100),
	"internal_data" text,
	"receipt_signature" text,
	"qr_code_url" text,
	"fiscal_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"fiscalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_received_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"grn_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity_accepted" numeric(12, 4) NOT NULL,
	"quantity_rejected" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"rejection_reason" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "goods_received_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"purchase_order_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"grn_number" varchar(50) NOT NULL,
	"supplier_delivery_note" varchar(100),
	"received_by_id" integer,
	"received_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hourly_forecast_intervals" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"projected_guest_checkouts" integer NOT NULL,
	"projected_sales_kes" numeric(12, 2) NOT NULL,
	"required_servers" integer NOT NULL,
	"required_line_cooks" integer NOT NULL,
	"peak_load_indicator" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hourly_forecast_hour_chk" CHECK ("hourly_forecast_intervals"."hour_of_day" BETWEEN 0 AND 23)
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"inventory_item_id" integer NOT NULL,
	"supplier_id" integer,
	"batch_number" varchar(50) NOT NULL,
	"supplier_batch_number" varchar(100),
	"certificate_number" varchar(100),
	"initial_quantity" numeric(12, 4) NOT NULL,
	"current_quantity" numeric(12, 4) NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"location_bin" varchar(80),
	"storage_temperature" numeric(5, 2),
	"received_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expiry_date" timestamp with time zone NOT NULL,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_branch_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"current_stock" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"reserved_stock" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"min_threshold" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"reorder_quantity" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"average_unit_cost" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"barcode" varchar(100),
	"material_type" varchar(50) DEFAULT 'RAW_MATERIAL' NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(30) NOT NULL,
	"purchase_unit" varchar(30) DEFAULT 'pcs',
	"conversion_factor" numeric(12, 4) DEFAULT '1.0000' NOT NULL,
	"preferred_supplier_id" integer,
	"cost_price" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"valuation_method" varchar(30) DEFAULT 'FIFO' NOT NULL,
	"min_threshold" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"reorder_quantity" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"current_stock" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"tracking_method" varchar(30) DEFAULT 'BATCH_EXPIRY' NOT NULL,
	"storage_condition" varchar(50) DEFAULT 'DRY_AMBIENT' NOT NULL,
	"tax_classification" varchar(20) DEFAULT 'A_16' NOT NULL,
	"allow_negative_stock" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"menu_item_id" integer NOT NULL,
	"rule_name" varchar(150) NOT NULL,
	"rule_type" varchar(50) DEFAULT 'FIXED_PRICE' NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"days_of_week" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_global_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"default_warning_minutes" integer DEFAULT 10 NOT NULL,
	"default_critical_minutes" integer DEFAULT 18 NOT NULL,
	"enable_course_pacing" boolean DEFAULT true NOT NULL,
	"enable_order_consolidation" boolean DEFAULT true NOT NULL,
	"vip_priority_boost_minutes" integer DEFAULT 5 NOT NULL,
	"delivery_priority_boost_minutes" integer DEFAULT 3 NOT NULL,
	"sound_volume" integer DEFAULT 80 NOT NULL,
	"auto_archive_completed_minutes" integer DEFAULT 120 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_global_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "kitchen_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"station_type" varchar(50) DEFAULT 'PREP' NOT NULL,
	"color_hex" varchar(20) DEFAULT '#0554F4' NOT NULL,
	"target_prep_time_minutes" integer DEFAULT 15 NOT NULL,
	"warning_time_minutes" integer DEFAULT 10 NOT NULL,
	"critical_time_minutes" integer DEFAULT 18 NOT NULL,
	"assigned_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_bump_on_print" boolean DEFAULT false NOT NULL,
	"sound_alert_on_new_ticket" boolean DEFAULT true NOT NULL,
	"allow_ticket_recall" boolean DEFAULT true NOT NULL,
	"backup_station_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"slug" varchar(150) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"read_time_minutes" integer DEFAULT 3 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_base_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "logistics_fleet" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"vehicle_plate" varchar(50) NOT NULL,
	"make_model" varchar(100) DEFAULT 'Standard Fleet' NOT NULL,
	"vehicle_type" varchar(50) DEFAULT 'REEFER_VAN' NOT NULL,
	"driver_name" varchar(120),
	"driver_phone" varchar(30),
	"max_payload_kg" numeric(10, 2) DEFAULT '1500.00' NOT NULL,
	"is_refrigerated" boolean DEFAULT false NOT NULL,
	"min_target_temp" numeric(5, 2),
	"max_target_temp" numeric(5, 2),
	"current_status" varchar(30) DEFAULT 'AVAILABLE' NOT NULL,
	"current_location_lat" numeric(10, 7),
	"current_location_lng" numeric(10, 7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"customer_id" integer NOT NULL,
	"order_id" integer,
	"reward_id" integer,
	"entry_type" varchar(50) NOT NULL,
	"points_delta" integer NOT NULL,
	"monetary_value_kes" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"balance_before" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"channel" varchar(30) DEFAULT 'POS_TERMINAL' NOT NULL,
	"audit_reference" varchar(100),
	"notes" text,
	"processed_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_rewards_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"reward_type" varchar(50) DEFAULT 'DISCOUNT_FIXED' NOT NULL,
	"reward_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"max_discount_cap" numeric(12, 2),
	"menu_item_id" integer,
	"min_tier_id" integer,
	"max_redemptions_per_member" integer,
	"total_inventory_quota" integer,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"min_points" integer DEFAULT 0 NOT NULL,
	"earning_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"perks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"objective" varchar(100) DEFAULT 'REVENUE_GROWTH' NOT NULL,
	"channel" varchar(50) DEFAULT 'SMS' NOT NULL,
	"target_segment" varchar(100) DEFAULT 'ALL_CUSTOMERS' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"budget_kes" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"attributed_revenue_kes" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"promo_code" varchar(50),
	"discount_percentage" integer,
	"message_content" text NOT NULL,
	"recipients_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"clicked_count" integer DEFAULT 0 NOT NULL,
	"converted_count" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"channel" varchar(50) DEFAULT 'SMS' NOT NULL,
	"objective" varchar(100) DEFAULT 'REVENUE_GROWTH' NOT NULL,
	"subject_line" varchar(255),
	"body_template" text NOT NULL,
	"suggested_promo_prefix" varchar(20),
	"default_discount_percentage" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_engineering_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"menu_item_id" integer NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"gross_revenue_kes" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"unit_selling_price_kes" numeric(12, 2) NOT NULL,
	"unit_food_cost_kes" numeric(12, 2) NOT NULL,
	"contribution_margin_kes" numeric(12, 2) NOT NULL,
	"food_cost_percentage" numeric(5, 2) NOT NULL,
	"popularity_share_pct" numeric(5, 2) NOT NULL,
	"matrix_classification" varchar(30) NOT NULL,
	"suggested_price_adjustment_kes" numeric(12, 2) DEFAULT '0.00',
	"ai_recommendation_type" varchar(50) NOT NULL,
	"strategic_action_note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"menu_item_id" integer NOT NULL,
	"is_86ed" boolean DEFAULT false NOT NULL,
	"reason" varchar(150),
	"remaining_count" integer,
	"auto_reset_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"category_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"cost_estimate" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"stock_tracking_type" varchar(50) DEFAULT 'RECIPE' NOT NULL,
	"direct_inventory_item_id" integer,
	"kitchen_station" varchar(50) DEFAULT 'MAIN_KITCHEN' NOT NULL,
	"prep_time_minutes" integer DEFAULT 15 NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16.00' NOT NULL,
	"catering_levy_rate" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"is_tax_inclusive" boolean DEFAULT true NOT NULL,
	"etims_item_code" varchar(50),
	"etims_class_code" varchar(50),
	"etims_tax_type_code" varchar(10) DEFAULT 'B',
	"is_available" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"option_name" varchar(100) NOT NULL,
	"price_delta" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"linked_inventory_item_id" integer,
	"linked_quantity" numeric(12, 4) DEFAULT '0.0000',
	"is_required" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"channel" varchar(30) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"environment" varchar(20) DEFAULT 'SANDBOX' NOT NULL,
	"sender_id" varchar(50),
	"account_identifier" varchar(150) NOT NULL,
	"api_key" text NOT NULL,
	"api_secret" text,
	"webhook_url" text,
	"monthly_credit_cap" integer DEFAULT 0 NOT NULL,
	"current_month_dispatches" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"last_handshake_at" timestamp with time zone,
	"last_handshake_status" varchar(50),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"integration_id" integer,
	"recipient" varchar(150) NOT NULL,
	"channel" varchar(30) NOT NULL,
	"trigger_event" varchar(100),
	"body_content" text NOT NULL,
	"external_message_id" varchar(150),
	"status" varchar(50) DEFAULT 'DELIVERED' NOT NULL,
	"cost_units" numeric(8, 2) DEFAULT '1.00' NOT NULL,
	"dispatched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"trigger_event" varchar(100) NOT NULL,
	"channel" varchar(30) NOT NULL,
	"subject" varchar(200),
	"body_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" varchar(255),
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"modifier_group_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"price_adjustment" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mpesa_c2b_callbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"trans_id" varchar(50) NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"trans_amount" numeric(12, 2) NOT NULL,
	"business_short_code" varchar(30) NOT NULL,
	"bill_ref_number" varchar(100),
	"msisdn" varchar(100) NOT NULL,
	"first_name" varchar(100),
	"middle_name" varchar(100),
	"last_name" varchar(100),
	"trans_time" varchar(30) NOT NULL,
	"allocation_status" varchar(30) DEFAULT 'UNALLOCATED' NOT NULL,
	"allocated_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"claimed_by_user_id" integer,
	"claimed_order_id" integer,
	"raw_payload" jsonb,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mpesa_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"transaction_type" varchar(50) NOT NULL,
	"mpesa_receipt_number" varchar(50),
	"checkout_request_id" varchar(100),
	"conversation_id" varchar(100),
	"originator_conversation_id" varchar(100),
	"phone_number" varchar(30),
	"account_reference" varchar(100) NOT NULL,
	"business_short_code" varchar(50) NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"transaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"result_code" varchar(20),
	"result_desc" text,
	"supplier_id" integer,
	"supplier_invoice_id" integer,
	"order_id" integer,
	"payment_id" integer,
	"raw_payload" jsonb,
	"initiated_by_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_printers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"device_type" varchar(50) NOT NULL,
	"connection_type" varchar(50) DEFAULT 'NETWORK_TCP' NOT NULL,
	"ip_address" varchar(64),
	"port" integer DEFAULT 9100 NOT NULL,
	"mac_address" varchar(64),
	"driver_protocol" varchar(50) DEFAULT 'ESC_POS' NOT NULL,
	"paper_width" varchar(20) DEFAULT '80MM' NOT NULL,
	"auto_cut" boolean DEFAULT true NOT NULL,
	"open_cash_drawer_on_print" boolean DEFAULT false NOT NULL,
	"beep_on_print" boolean DEFAULT false NOT NULL,
	"beep_count" integer DEFAULT 1 NOT NULL,
	"backup_printer_id" integer,
	"assigned_stations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'ONLINE' NOT NULL,
	"last_ping_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"user_id" integer,
	"title" varchar(255) NOT NULL,
	"detail" text NOT NULL,
	"severity" varchar(30) DEFAULT 'INFO' NOT NULL,
	"module" varchar(50) DEFAULT 'SYSTEM' NOT NULL,
	"category" varchar(50) DEFAULT 'ACTION_REQUIRED' NOT NULL,
	"entity_type" varchar(100),
	"entity_id" varchar(100),
	"action_url" varchar(255),
	"action_payload" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"allow_offline_sales" boolean DEFAULT true NOT NULL,
	"max_offline_hours" integer DEFAULT 72 NOT NULL,
	"max_offline_ticket_total" numeric(12, 2) DEFAULT '50000.00' NOT NULL,
	"max_offline_cumulative_balance" numeric(14, 2) DEFAULT '500000.00' NOT NULL,
	"require_manager_auth_for_offline" boolean DEFAULT false NOT NULL,
	"conflict_resolution_strategy" varchar(50) DEFAULT 'SERVER_TIMESTAMP_WINS' NOT NULL,
	"auto_sync_on_reconnect" boolean DEFAULT true NOT NULL,
	"sync_batch_size" integer DEFAULT 50 NOT NULL,
	"sync_interval_seconds" integer DEFAULT 30 NOT NULL,
	"cache_catalog_items" boolean DEFAULT true NOT NULL,
	"cache_customer_directory" boolean DEFAULT true NOT NULL,
	"cache_tax_tables" boolean DEFAULT true NOT NULL,
	"cache_user_credentials" boolean DEFAULT true NOT NULL,
	"encrypt_local_storage" boolean DEFAULT true NOT NULL,
	"allow_offline_cash" boolean DEFAULT true NOT NULL,
	"allow_offline_card" boolean DEFAULT true NOT NULL,
	"allow_offline_mpesa_reference" boolean DEFAULT true NOT NULL,
	"allow_offline_gift_cards" boolean DEFAULT false NOT NULL,
	"allow_offline_credit_tabs" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offline_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "offline_sync_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"terminal_identifier" varchar(100) NOT NULL,
	"batch_reference" varchar(100) NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'PROCESSED' NOT NULL,
	"conflict_count" integer DEFAULT 0 NOT NULL,
	"payload_summary" jsonb,
	"sync_duration_ms" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_integration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"integration_id" integer NOT NULL,
	"channel" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"external_order_id" varchar(150),
	"payload" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'SUCCESS' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"channel" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"environment" varchar(20) DEFAULT 'SANDBOX' NOT NULL,
	"store_identifier" varchar(150) NOT NULL,
	"api_key" text NOT NULL,
	"api_secret" text,
	"webhook_secret" text,
	"callback_url" text,
	"auto_accept_orders" boolean DEFAULT false NOT NULL,
	"auto_send_to_kitchen" boolean DEFAULT true NOT NULL,
	"price_markup_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"default_prep_time_minutes" integer DEFAULT 20 NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_status" varchar(50),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"modifiers_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"unit_cost_snapshot" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"selected_modifiers" jsonb DEFAULT '[]'::jsonb,
	"kitchen_status" varchar(50) DEFAULT 'New' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_qty_positive_chk" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"table_id" integer,
	"customer_id" integer,
	"table_name" varchar(100),
	"waiter_id" integer,
	"cashier_id" integer,
	"order_number" varchar(50) NOT NULL,
	"order_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"payment_status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"buyer_kra_pin" varchar(50),
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax" numeric(12, 2) NOT NULL,
	"catering_levy" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"service_charge" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"delivery_fee" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"notes" text,
	"cancel_reason" text,
	"idempotency_key" varchar(100),
	"inventory_deducted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"provider" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"environment" varchar(20) DEFAULT 'SANDBOX' NOT NULL,
	"merchant_identifier" varchar(100) NOT NULL,
	"api_key" text NOT NULL,
	"api_secret" text NOT NULL,
	"pass_key" text,
	"webhook_secret" text,
	"callback_url" text,
	"supported_currencies" jsonb DEFAULT '["KES"]'::jsonb NOT NULL,
	"auto_reconcile" boolean DEFAULT true NOT NULL,
	"settlement_account_code" varchar(50),
	"surcharge_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'INACTIVE' NOT NULL,
	"last_handshake_at" timestamp with time zone,
	"last_handshake_status" varchar(50),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"integration_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"external_reference" varchar(100),
	"payload" jsonb NOT NULL,
	"response_code" integer DEFAULT 200 NOT NULL,
	"status" varchar(50) DEFAULT 'PROCESSED' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"payment_number" varchar(50) NOT NULL,
	"payment_flow" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'POSTED' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"clearing_account" varchar(100) NOT NULL,
	"transaction_reference" varchar(100),
	"supplier_id" integer,
	"supplier_invoice_id" integer,
	"order_id" integer,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"reversed_payment_id" integer,
	"is_reversed" boolean DEFAULT false NOT NULL,
	"processed_by_id" integer,
	"reconciled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"device_code" varchar(50) NOT NULL,
	"device_type" varchar(50) DEFAULT 'POS_TERMINAL' NOT NULL,
	"operating_system" varchar(50) DEFAULT 'WEB_BROWSER' NOT NULL,
	"hardware_fingerprint" varchar(255),
	"ip_address" varchar(64),
	"mac_address" varchar(64),
	"app_version" varchar(30),
	"assigned_drawer_id" integer,
	"assigned_kitchen_station_id" integer,
	"assigned_receipt_printer_id" integer,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"allow_offline_sales" boolean DEFAULT true NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"last_heartbeat_ip" varchar(64),
	"registered_by_user_id" integer,
	"decommissioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictive_inventory_replenishments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"inventory_item_id" integer NOT NULL,
	"supplier_id" integer,
	"purchase_order_id" integer,
	"current_stock_level" numeric(12, 2) NOT NULL,
	"daily_burn_rate" numeric(12, 2) NOT NULL,
	"days_of_inventory_remaining" numeric(6, 1) NOT NULL,
	"forecasted_runout_date" timestamp with time zone NOT NULL,
	"recommended_order_qty" numeric(12, 2) NOT NULL,
	"unit_of_measure" varchar(30) DEFAULT 'KG' NOT NULL,
	"estimated_unit_cost_kes" numeric(12, 2) NOT NULL,
	"total_projected_cost_kes" numeric(12, 2) NOT NULL,
	"supplier_lead_time_days" integer DEFAULT 3 NOT NULL,
	"urgency_level" varchar(30) DEFAULT 'MEDIUM' NOT NULL,
	"approval_status" varchar(30) DEFAULT 'PENDING_REVIEW' NOT NULL,
	"ai_reasoning_note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotional_discounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"campaign_id" integer,
	"code" varchar(50) NOT NULL,
	"discount_type" varchar(50) DEFAULT 'PERCENTAGE' NOT NULL,
	"discount_value" numeric(12, 2) NOT NULL,
	"min_order_subtotal_kes" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"max_discount_cap_kes" numeric(12, 2),
	"max_usage_count" integer DEFAULT 100 NOT NULL,
	"current_usage_count" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity_ordered" numeric(12, 4) NOT NULL,
	"quantity_received" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16.00' NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"supplier_id" integer NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"payment_terms" varchar(50) DEFAULT 'NET_30' NOT NULL,
	"subtotal" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"tax_amount" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"total_amount" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"delivery_expected_date" timestamp with time zone,
	"issued_at" timestamp with time zone,
	"created_by_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_request_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"requested_quantity" numeric(12, 4) NOT NULL,
	"estimated_unit_cost" numeric(12, 4) NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"request_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"priority" varchar(20) DEFAULT 'NORMAL' NOT NULL,
	"requested_by_id" integer,
	"reviewed_by_id" integer,
	"department" varchar(80) DEFAULT 'KITCHEN' NOT NULL,
	"estimated_total" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"notes" text,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"paper_width" varchar(20) DEFAULT '80MM' NOT NULL,
	"font_scale" varchar(20) DEFAULT 'NORMAL' NOT NULL,
	"header_title" varchar(150) NOT NULL,
	"header_subtitle" varchar(255),
	"show_logo" boolean DEFAULT true NOT NULL,
	"show_branch_address" boolean DEFAULT true NOT NULL,
	"show_tax_pin" boolean DEFAULT true NOT NULL,
	"show_contact_phone" boolean DEFAULT true NOT NULL,
	"show_contact_email" boolean DEFAULT false NOT NULL,
	"show_cashier_name" boolean DEFAULT true NOT NULL,
	"show_server_name" boolean DEFAULT true NOT NULL,
	"show_table_number" boolean DEFAULT true NOT NULL,
	"show_customer_details" boolean DEFAULT true NOT NULL,
	"show_order_type" boolean DEFAULT true NOT NULL,
	"show_item_sku" boolean DEFAULT false NOT NULL,
	"show_item_modifiers" boolean DEFAULT true NOT NULL,
	"show_kitchen_notes" boolean DEFAULT false NOT NULL,
	"show_tax_summary" boolean DEFAULT true NOT NULL,
	"show_etims_qr_code" boolean DEFAULT true NOT NULL,
	"show_fiscal_device_serial" boolean DEFAULT true NOT NULL,
	"show_payment_breakdown" boolean DEFAULT true NOT NULL,
	"show_change_due" boolean DEFAULT true NOT NULL,
	"show_tip_prompt_line" boolean DEFAULT false NOT NULL,
	"show_loyalty_points" boolean DEFAULT true NOT NULL,
	"footer_message" text,
	"return_policy" text,
	"wifi_details" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"wastage_percentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"menu_item_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"prep_time_minutes" integer DEFAULT 15 NOT NULL,
	"cook_time_minutes" integer DEFAULT 10 NOT NULL,
	"yield_portions" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"instructions" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"refund_number" varchar(50) NOT NULL,
	"refund_flow" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'APPROVED' NOT NULL,
	"order_id" integer,
	"supplier_id" integer,
	"payment_id" integer,
	"refund_method" varchar(50) NOT NULL,
	"clearing_account" varchar(100) NOT NULL,
	"transaction_reference" varchar(100),
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"restock_items" boolean DEFAULT true NOT NULL,
	"processed_by_id" integer,
	"reason_code" varchar(100) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"code" varchar(80) NOT NULL,
	"name" varchar(150) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"supported_formats" jsonb DEFAULT '["CSV","JSON"]'::jsonb NOT NULL,
	"parameter_schema" jsonb DEFAULT '{"requiresDateRange":true,"requiresBranch":false}'::jsonb NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "report_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"report_definition_id" integer NOT NULL,
	"branch_id" integer,
	"requested_by_user_id" integer,
	"execution_number" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'QUEUED' NOT NULL,
	"format" varchar(20) DEFAULT 'CSV' NOT NULL,
	"parameters_applied" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"execution_duration_ms" integer DEFAULT 0 NOT NULL,
	"file_url" text,
	"error_message" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_executions_execution_number_unique" UNIQUE("execution_number")
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"report_definition_id" integer NOT NULL,
	"branch_id" integer,
	"created_by_user_id" integer,
	"title" varchar(150) NOT NULL,
	"frequency" varchar(30) DEFAULT 'WEEKLY' NOT NULL,
	"delivery_channel" varchar(30) DEFAULT 'EMAIL' NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" varchar(20) DEFAULT 'CSV' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(50) NOT NULL,
	"customer_email" varchar(255),
	"party_size" integer NOT NULL,
	"reservation_date" timestamp with time zone NOT NULL,
	"expected_duration" integer DEFAULT 120 NOT NULL,
	"table_id" integer,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"special_requests" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"area_id" integer NOT NULL,
	"table_label" varchar(50) NOT NULL,
	"capacity" integer NOT NULL,
	"status" varchar(50) DEFAULT 'Available' NOT NULL,
	"assigned_waiter_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"min_password_length" integer DEFAULT 10 NOT NULL,
	"require_uppercase" boolean DEFAULT true NOT NULL,
	"require_lowercase" boolean DEFAULT true NOT NULL,
	"require_numbers" boolean DEFAULT true NOT NULL,
	"require_symbols" boolean DEFAULT true NOT NULL,
	"password_expiration_days" integer DEFAULT 90 NOT NULL,
	"prevent_password_reuse_count" integer DEFAULT 5 NOT NULL,
	"mfa_enforcement" varchar(40) DEFAULT 'OPTIONAL' NOT NULL,
	"allowed_mfa_methods" jsonb DEFAULT '["TOTP","EMAIL"]'::jsonb NOT NULL,
	"session_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"max_concurrent_sessions" integer DEFAULT 3 NOT NULL,
	"enforce_ip_binding" boolean DEFAULT false NOT NULL,
	"notify_on_new_login" boolean DEFAULT true NOT NULL,
	"max_failed_attempts" integer DEFAULT 5 NOT NULL,
	"lockout_duration_minutes" integer DEFAULT 30 NOT NULL,
	"enable_ip_allowlist" boolean DEFAULT false NOT NULL,
	"allowed_ip_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sso_enabled" boolean DEFAULT false NOT NULL,
	"sso_provider" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "service_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text,
	"requires_table" boolean DEFAULT true NOT NULL,
	"pay_before_order" boolean DEFAULT false NOT NULL,
	"prompt_guest_count" boolean DEFAULT true NOT NULL,
	"allow_split_checks" boolean DEFAULT true NOT NULL,
	"allow_table_transfers" boolean DEFAULT true NOT NULL,
	"auto_send_to_kitchen" boolean DEFAULT false NOT NULL,
	"enable_course_pacing" boolean DEFAULT false NOT NULL,
	"require_seat_numbering" boolean DEFAULT false NOT NULL,
	"auto_apply_service_charge" boolean DEFAULT false NOT NULL,
	"service_charge_percent" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"packing_charge_amount" numeric(8, 2) DEFAULT '0.00' NOT NULL,
	"pre_auth_card_required" boolean DEFAULT false NOT NULL,
	"max_tab_credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_handovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"outgoing_manager_id" integer NOT NULL,
	"incoming_manager_id" integer,
	"shift_type" varchar(50) NOT NULL,
	"handover_date" date NOT NULL,
	"cash_status" varchar(50) DEFAULT 'BALANCED' NOT NULL,
	"opening_float" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"closing_cash" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cash_variance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"operational_incidents" text,
	"inventory_kitchen_notes" text,
	"hardware_maintenance_notes" text,
	"guest_experience_notes" text,
	"checklist_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'SUBMITTED' NOT NULL,
	"outgoing_signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"incoming_signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(100) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"break_minutes" integer DEFAULT 30 NOT NULL,
	"color_hex" varchar(20) DEFAULT '#0554F4' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reviewer_id" integer,
	"review_cycle" varchar(50) DEFAULT 'MONTHLY' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"overall_rating" numeric(3, 2) DEFAULT '4.00' NOT NULL,
	"total_sales_generated" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"sales_target" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"average_ticket_value" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"speed_of_service_minutes" numeric(5, 1) DEFAULT '0.0' NOT NULL,
	"attendance_score_percent" integer DEFAULT 100 NOT NULL,
	"void_refund_count" integer DEFAULT 0 NOT NULL,
	"tip_pool_allocated" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"competencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"manager_feedback" text,
	"employee_feedback" text,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_count_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_count_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"expected_quantity" numeric(12, 4) NOT NULL,
	"counted_quantity" numeric(12, 4),
	"variance_quantity" numeric(12, 4),
	"unit_cost" numeric(12, 4) NOT NULL,
	"variance_cost" numeric(12, 4),
	"recount_required" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"count_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'IN_PROGRESS' NOT NULL,
	"count_type" varchar(30) DEFAULT 'FULL' NOT NULL,
	"category" varchar(100),
	"is_blind_count" boolean DEFAULT true NOT NULL,
	"total_items_count" integer DEFAULT 0 NOT NULL,
	"discrepancy_items_count" integer DEFAULT 0 NOT NULL,
	"net_variance_cost" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"conductor_id" integer,
	"approved_by_id" integer,
	"reconciled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"inventory_item_id" integer NOT NULL,
	"user_id" integer,
	"order_id" integer,
	"type" varchar(50) NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"total_valuation" numeric(12, 4) NOT NULL,
	"balance_after" numeric(12, 4) NOT NULL,
	"batch_number" varchar(50),
	"location_bin" varchar(80),
	"document_reference" varchar(100),
	"reversed_movement_id" integer,
	"is_reversed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"requested_quantity" numeric(12, 4) NOT NULL,
	"sent_quantity" numeric(12, 4),
	"received_quantity" numeric(12, 4),
	"transit_loss_quantity" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"batch_number" varchar(50),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"transfer_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"source_branch_id" integer NOT NULL,
	"destination_branch_id" integer NOT NULL,
	"carrier_vehicle_plate" varchar(50),
	"driver_name" varchar(100),
	"dispatch_temp_probe" numeric(5, 2),
	"arrival_temp_probe" numeric(5, 2),
	"total_valuation" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"transit_loss_valuation" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"requested_by_id" integer,
	"dispatched_by_id" integer,
	"received_by_id" integer,
	"dispatched_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sto_distinct_branches_chk" CHECK ("stock_transfers"."source_branch_id" <> "stock_transfers"."destination_branch_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"billing_cycle" varchar(20) DEFAULT 'MONTHLY' NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"included_users" integer DEFAULT 5 NOT NULL,
	"included_branches" integer DEFAULT 1 NOT NULL,
	"per_user_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"per_branch_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "supplier_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_invoice_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit_price" numeric(12, 4) NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '16.00' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "supplier_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"supplier_id" integer NOT NULL,
	"purchase_order_id" integer,
	"goods_received_note_id" integer,
	"invoice_number" varchar(100) NOT NULL,
	"internal_ref" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'UNPAID' NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"tax_amount" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"total_amount" numeric(12, 4) NOT NULL,
	"paid_amount" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"created_by_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_return_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"reason" varchar(80) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "supplier_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"supplier_id" integer NOT NULL,
	"goods_received_note_id" integer,
	"supplier_invoice_id" integer,
	"return_number" varchar(50) NOT NULL,
	"debit_note_number" varchar(50),
	"status" varchar(30) DEFAULT 'PENDING_DISPATCH' NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"tax_amount" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
	"total_amount" numeric(12, 4) NOT NULL,
	"created_by_id" integer,
	"dispatched_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(150),
	"phone" varchar(50),
	"email" varchar(255),
	"kra_pin" varchar(50),
	"physical_address" text,
	"city" varchar(100) DEFAULT 'Nairobi',
	"payment_terms" varchar(50) DEFAULT 'NET_30',
	"lead_time_days" integer DEFAULT 2 NOT NULL,
	"bank_name" varchar(100),
	"bank_account_number" varchar(100),
	"mpesa_paybill_number" varchar(50),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer,
	"is_staff_reply" boolean DEFAULT false NOT NULL,
	"sender_name" varchar(120) NOT NULL,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"user_id" integer,
	"ticket_number" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
	"status" varchar(30) DEFAULT 'OPEN' NOT NULL,
	"description" text NOT NULL,
	"diagnostics_payload" jsonb,
	"assigned_agent" varchar(100),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "tax_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"statutory_code" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_financial_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"base_currency" varchar(10) DEFAULT 'KES' NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
	"tax_pin" varchar(50),
	"is_vat_inclusive" boolean DEFAULT true NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '16.00' NOT NULL,
	"is_catering_levy_enabled" boolean DEFAULT true NOT NULL,
	"catering_levy_rate" numeric(5, 2) DEFAULT '2.00' NOT NULL,
	"is_service_charge_enabled" boolean DEFAULT false NOT NULL,
	"service_charge_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"etims_environment" varchar(20) DEFAULT 'SANDBOX' NOT NULL,
	"auto_fiscalize_on_payment" boolean DEFAULT true NOT NULL,
	"etims_middle_server_url" varchar(255),
	"etims_device_serial" varchar(100),
	"etims_branch_code" varchar(20) DEFAULT '00' NOT NULL,
	"allow_offline_fiscal_sign" boolean DEFAULT true NOT NULL,
	"tip_distribution_model" varchar(50) DEFAULT 'HOURS_WEIGHTED' NOT NULL,
	"default_overtime_multiplier" numeric(4, 2) DEFAULT '1.50' NOT NULL,
	"holiday_overtime_multiplier" numeric(4, 2) DEFAULT '2.00' NOT NULL,
	"standard_work_week_hours" integer DEFAULT 40 NOT NULL,
	"max_drawer_cash_threshold" numeric(12, 2) DEFAULT '50000.00' NOT NULL,
	"enable_safe_drop_alerts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_financial_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'TRIAL' NOT NULL,
	"current_period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"seat_allocation" integer DEFAULT 5 NOT NULL,
	"branch_allocation" integer DEFAULT 1 NOT NULL,
	"payment_method_id" integer,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_subscriptions_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "transfer_fleet_dispatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"transfer_id" integer NOT NULL,
	"fleet_vehicle_id" integer NOT NULL,
	"dispatched_by_id" integer,
	"dispatch_status" varchar(30) DEFAULT 'IN_TRANSIT' NOT NULL,
	"departure_odometer_km" numeric(10, 2),
	"arrival_odometer_km" numeric(10, 2),
	"departure_time" timestamp with time zone DEFAULT now(),
	"arrival_time" timestamp with time zone,
	"dispatch_temp_probe" numeric(5, 2),
	"arrival_temp_probe" numeric(5, 2),
	"delivery_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_conversions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"from_unit" varchar(50) NOT NULL,
	"to_unit" varchar(50) NOT NULL,
	"conversion_factor" numeric(12, 4) NOT NULL,
	"inventory_item_id" integer,
	"unit_category" varchar(50) DEFAULT 'WEIGHT' NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_branch_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"role_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"session_token_hash" varchar(255) NOT NULL,
	"ip_address" varchar(64) NOT NULL,
	"user_agent" text,
	"device_type" varchar(50) DEFAULT 'DESKTOP' NOT NULL,
	"browser" varchar(50),
	"os" varchar(50),
	"city" varchar(100),
	"country" varchar(100),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(50) NOT NULL,
	"party_size" integer NOT NULL,
	"quoted_wait_time" integer NOT NULL,
	"status" varchar(50) DEFAULT 'Waiting' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_bins" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"zone_id" integer NOT NULL,
	"bin_code" varchar(40) NOT NULL,
	"barcode" varchar(80),
	"bin_type" varchar(30) DEFAULT 'STANDARD_SHELF' NOT NULL,
	"pick_sequence" integer DEFAULT 10 NOT NULL,
	"max_weight_kg" numeric(10, 2) DEFAULT '500.00' NOT NULL,
	"max_volume_cbm" numeric(8, 3) DEFAULT '1.500' NOT NULL,
	"is_quarantine" boolean DEFAULT false NOT NULL,
	"is_occupied" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"zone_type" varchar(50) DEFAULT 'DRY_AMBIENT' NOT NULL,
	"target_min_temp" numeric(5, 2),
	"target_max_temp" numeric(5, 2),
	"is_refrigerated" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"zone_code" varchar(30) NOT NULL,
	"name" varchar(120) NOT NULL,
	"zone_type" varchar(40) DEFAULT 'INTERNAL_STORAGE' NOT NULL,
	"temperature_min_c" numeric(5, 2),
	"temperature_max_c" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waste_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"inventory_item_id" integer NOT NULL,
	"inventory_batch_id" integer,
	"department" varchar(50) DEFAULT 'KITCHEN' NOT NULL,
	"waste_reason" varchar(80) NOT NULL,
	"disposition_method" varchar(50) DEFAULT 'TRASH_LANDFILL' NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit_cost" numeric(12, 4) NOT NULL,
	"total_loss_cost" numeric(12, 4) NOT NULL,
	"location_bin" varchar(80),
	"document_reference" varchar(50),
	"reported_by_id" integer,
	"witnessed_by_id" integer,
	"notes" text,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"template_id" integer,
	"shift_date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"break_minutes" integer DEFAULT 30 NOT NULL,
	"role" varchar(100) NOT NULL,
	"hourly_wage" numeric(12, 2) DEFAULT '0.00',
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_execution_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"rule_id" integer NOT NULL,
	"execution_status" varchar(30) DEFAULT 'SUCCESS' NOT NULL,
	"trigger_payload_snapshot" jsonb,
	"execution_output" text NOT NULL,
	"execution_duration_ms" integer DEFAULT 0 NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"domain" varchar(50) DEFAULT 'WORKFORCE_HCM' NOT NULL,
	"trigger_event" varchar(80) NOT NULL,
	"condition_logic" jsonb NOT NULL,
	"action_type" varchar(80) NOT NULL,
	"action_payload" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slug" varchar(100);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "legal_name" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "kra_pin" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "currency" varchar(10) DEFAULT 'KES' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "timezone" varchar(64) DEFAULT 'Africa/Nairobi' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_plan" varchar(50) DEFAULT 'STARTER' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_status" varchar(50) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_branch_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_assistant_messages" ADD CONSTRAINT "ai_assistant_messages_session_id_ai_assistant_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_assistant_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_messages" ADD CONSTRAINT "ai_assistant_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_sessions" ADD CONSTRAINT "ai_assistant_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assistant_sessions" ADD CONSTRAINT "ai_assistant_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_schedule_id_work_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."work_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_bank_statement_id_bank_statements_id_fk" FOREIGN KEY ("bank_statement_id") REFERENCES "public"."bank_statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_matched_payment_id_payments_id_fk" FOREIGN KEY ("matched_payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscription_id_tenant_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."tenant_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients_log" ADD CONSTRAINT "campaign_recipients_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients_log" ADD CONSTRAINT "campaign_recipients_log_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients_log" ADD CONSTRAINT "campaign_recipients_log_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_drawers" ADD CONSTRAINT "cash_drawers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_drawers" ADD CONSTRAINT "cash_drawers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_assignments" ADD CONSTRAINT "cashier_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_assignments" ADD CONSTRAINT "cashier_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_assignments" ADD CONSTRAINT "cashier_assignments_cash_drawer_id_cash_drawers_id_fk" FOREIGN KEY ("cash_drawer_id") REFERENCES "public"."cash_drawers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_assignments" ADD CONSTRAINT "cashier_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_assignments" ADD CONSTRAINT "cashier_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_bundle_items" ADD CONSTRAINT "combo_bundle_items_combo_id_combo_bundles_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combo_bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_bundle_items" ADD CONSTRAINT "combo_bundle_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_bundles" ADD CONSTRAINT "combo_bundles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_bundles" ADD CONSTRAINT "combo_bundles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty_profiles" ADD CONSTRAINT "customer_loyalty_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty_profiles" ADD CONSTRAINT "customer_loyalty_profiles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty_profiles" ADD CONSTRAINT "customer_loyalty_profiles_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_fleet_vehicle_id_logistics_fleet_id_fk" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "public"."logistics_fleet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_forecast_snapshots" ADD CONSTRAINT "demand_forecast_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_forecast_snapshots" ADD CONSTRAINT "demand_forecast_snapshots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollment_tokens" ADD CONSTRAINT "device_enrollment_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollment_tokens" ADD CONSTRAINT "device_enrollment_tokens_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollment_tokens" ADD CONSTRAINT "device_enrollment_tokens_assigned_drawer_id_cash_drawers_id_fk" FOREIGN KEY ("assigned_drawer_id") REFERENCES "public"."cash_drawers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollment_tokens" ADD CONSTRAINT "device_enrollment_tokens_assigned_kitchen_station_id_kitchen_stations_id_fk" FOREIGN KEY ("assigned_kitchen_station_id") REFERENCES "public"."kitchen_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollment_tokens" ADD CONSTRAINT "device_enrollment_tokens_claimed_device_id_pos_devices_id_fk" FOREIGN KEY ("claimed_device_id") REFERENCES "public"."pos_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_enrollment_tokens" ADD CONSTRAINT "device_enrollment_tokens_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dining_areas" ADD CONSTRAINT "dining_areas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dining_areas" ADD CONSTRAINT "dining_areas_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawer_sessions" ADD CONSTRAINT "drawer_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawer_sessions" ADD CONSTRAINT "drawer_sessions_drawer_id_cash_drawers_id_fk" FOREIGN KEY ("drawer_id") REFERENCES "public"."cash_drawers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawer_sessions" ADD CONSTRAINT "drawer_sessions_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawer_sessions" ADD CONSTRAINT "drawer_sessions_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_shift_id_cashier_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."cashier_shifts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_attributed_user_id_users_id_fk" FOREIGN KEY ("attributed_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_invoices" ADD CONSTRAINT "fiscal_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_invoices" ADD CONSTRAINT "fiscal_invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_invoices" ADD CONSTRAINT "fiscal_invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_items" ADD CONSTRAINT "goods_received_items_grn_id_goods_received_notes_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_received_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_items" ADD CONSTRAINT "goods_received_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hourly_forecast_intervals" ADD CONSTRAINT "hourly_forecast_intervals_snapshot_id_demand_forecast_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."demand_forecast_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hourly_forecast_intervals" ADD CONSTRAINT "hourly_forecast_intervals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_branch_stock" ADD CONSTRAINT "inventory_branch_stock_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_branch_stock" ADD CONSTRAINT "inventory_branch_stock_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_branch_stock" ADD CONSTRAINT "inventory_branch_stock_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_preferred_supplier_id_suppliers_id_fk" FOREIGN KEY ("preferred_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pricing_rules" ADD CONSTRAINT "item_pricing_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pricing_rules" ADD CONSTRAINT "item_pricing_rules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pricing_rules" ADD CONSTRAINT "item_pricing_rules_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_global_settings" ADD CONSTRAINT "kitchen_global_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_backup_station_id_kitchen_stations_id_fk" FOREIGN KEY ("backup_station_id") REFERENCES "public"."kitchen_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_fleet" ADD CONSTRAINT "logistics_fleet_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_fleet" ADD CONSTRAINT "logistics_fleet_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions_ledger" ADD CONSTRAINT "loyalty_transactions_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions_ledger" ADD CONSTRAINT "loyalty_transactions_ledger_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions_ledger" ADD CONSTRAINT "loyalty_transactions_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions_ledger" ADD CONSTRAINT "loyalty_transactions_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions_ledger" ADD CONSTRAINT "loyalty_transactions_ledger_reward_id_loyalty_rewards_catalog_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."loyalty_rewards_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions_ledger" ADD CONSTRAINT "loyalty_transactions_ledger_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards_catalog" ADD CONSTRAINT "loyalty_rewards_catalog_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards_catalog" ADD CONSTRAINT "loyalty_rewards_catalog_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards_catalog" ADD CONSTRAINT "loyalty_rewards_catalog_min_tier_id_loyalty_tiers_id_fk" FOREIGN KEY ("min_tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_tiers" ADD CONSTRAINT "loyalty_tiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_templates" ADD CONSTRAINT "marketing_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_engineering_snapshots" ADD CONSTRAINT "menu_engineering_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_engineering_snapshots" ADD CONSTRAINT "menu_engineering_snapshots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_engineering_snapshots" ADD CONSTRAINT "menu_engineering_snapshots_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_availability" ADD CONSTRAINT "menu_item_availability_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_availability" ADD CONSTRAINT "menu_item_availability_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_availability" ADD CONSTRAINT "menu_item_availability_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_direct_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("direct_inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_modifiers" ADD CONSTRAINT "menu_modifiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_modifiers" ADD CONSTRAINT "menu_modifiers_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_modifiers" ADD CONSTRAINT "menu_modifiers_linked_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("linked_inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_integrations" ADD CONSTRAINT "messaging_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_integrations" ADD CONSTRAINT "messaging_integrations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_logs" ADD CONSTRAINT "messaging_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_logs" ADD CONSTRAINT "messaging_logs_integration_id_messaging_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."messaging_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_templates" ADD CONSTRAINT "messaging_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_c2b_callbacks" ADD CONSTRAINT "mpesa_c2b_callbacks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_c2b_callbacks" ADD CONSTRAINT "mpesa_c2b_callbacks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_c2b_callbacks" ADD CONSTRAINT "mpesa_c2b_callbacks_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_c2b_callbacks" ADD CONSTRAINT "mpesa_c2b_callbacks_claimed_order_id_orders_id_fk" FOREIGN KEY ("claimed_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_supplier_invoice_id_supplier_invoices_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_initiated_by_id_users_id_fk" FOREIGN KEY ("initiated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_printers" ADD CONSTRAINT "network_printers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_printers" ADD CONSTRAINT "network_printers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_printers" ADD CONSTRAINT "network_printers_backup_printer_id_network_printers_id_fk" FOREIGN KEY ("backup_printer_id") REFERENCES "public"."network_printers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_settings" ADD CONSTRAINT "offline_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_settings" ADD CONSTRAINT "offline_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_sync_batches" ADD CONSTRAINT "offline_sync_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_sync_batches" ADD CONSTRAINT "offline_sync_batches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_integration_logs" ADD CONSTRAINT "order_integration_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_integration_logs" ADD CONSTRAINT "order_integration_logs_integration_id_order_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."order_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_integrations" ADD CONSTRAINT "order_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_integrations" ADD CONSTRAINT "order_integrations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_integrations" ADD CONSTRAINT "payment_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_integrations" ADD CONSTRAINT "payment_integrations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_logs" ADD CONSTRAINT "payment_webhook_logs_integration_id_payment_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."payment_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_invoice_id_supplier_invoices_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversed_payment_id_payments_id_fk" FOREIGN KEY ("reversed_payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_assigned_drawer_id_cash_drawers_id_fk" FOREIGN KEY ("assigned_drawer_id") REFERENCES "public"."cash_drawers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_assigned_kitchen_station_id_kitchen_stations_id_fk" FOREIGN KEY ("assigned_kitchen_station_id") REFERENCES "public"."kitchen_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_assigned_receipt_printer_id_network_printers_id_fk" FOREIGN KEY ("assigned_receipt_printer_id") REFERENCES "public"."network_printers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictive_inventory_replenishments" ADD CONSTRAINT "predictive_inventory_replenishments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictive_inventory_replenishments" ADD CONSTRAINT "predictive_inventory_replenishments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictive_inventory_replenishments" ADD CONSTRAINT "predictive_inventory_replenishments_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictive_inventory_replenishments" ADD CONSTRAINT "predictive_inventory_replenishments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictive_inventory_replenishments" ADD CONSTRAINT "predictive_inventory_replenishments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_discounts" ADD CONSTRAINT "promotional_discounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_discounts" ADD CONSTRAINT "promotional_discounts_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_templates" ADD CONSTRAINT "receipt_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_templates" ADD CONSTRAINT "receipt_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_report_definition_id_report_definitions_id_fk" FOREIGN KEY ("report_definition_id") REFERENCES "public"."report_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_report_definition_id_report_definitions_id_fk" FOREIGN KEY ("report_definition_id") REFERENCES "public"."report_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_area_id_dining_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."dining_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_assigned_waiter_id_users_id_fk" FOREIGN KEY ("assigned_waiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_settings" ADD CONSTRAINT "security_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_models" ADD CONSTRAINT "service_models_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_models" ADD CONSTRAINT "service_models_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_outgoing_manager_id_users_id_fk" FOREIGN KEY ("outgoing_manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_incoming_manager_id_users_id_fk" FOREIGN KEY ("incoming_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_performance_reviews" ADD CONSTRAINT "staff_performance_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_performance_reviews" ADD CONSTRAINT "staff_performance_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_performance_reviews" ADD CONSTRAINT "staff_performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_stock_count_id_stock_counts_id_fk" FOREIGN KEY ("stock_count_id") REFERENCES "public"."stock_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_conductor_id_users_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reversed_movement_id_stock_movements_id_fk" FOREIGN KEY ("reversed_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_branch_id_branches_id_fk" FOREIGN KEY ("source_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destination_branch_id_branches_id_fk" FOREIGN KEY ("destination_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_dispatched_by_id_users_id_fk" FOREIGN KEY ("dispatched_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_supplier_invoice_id_supplier_invoices_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoice_items" ADD CONSTRAINT "supplier_invoice_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_goods_received_note_id_goods_received_notes_id_fk" FOREIGN KEY ("goods_received_note_id") REFERENCES "public"."goods_received_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_supplier_return_id_supplier_returns_id_fk" FOREIGN KEY ("supplier_return_id") REFERENCES "public"."supplier_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_goods_received_note_id_goods_received_notes_id_fk" FOREIGN KEY ("goods_received_note_id") REFERENCES "public"."goods_received_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_invoice_id_supplier_invoices_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_codes" ADD CONSTRAINT "tax_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_financial_settings" ADD CONSTRAINT "tenant_financial_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_payment_method_id_billing_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."billing_payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_fleet_dispatches" ADD CONSTRAINT "transfer_fleet_dispatches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_fleet_dispatches" ADD CONSTRAINT "transfer_fleet_dispatches_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_fleet_dispatches" ADD CONSTRAINT "transfer_fleet_dispatches_fleet_vehicle_id_logistics_fleet_id_fk" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "public"."logistics_fleet"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_fleet_dispatches" ADD CONSTRAINT "transfer_fleet_dispatches_dispatched_by_id_users_id_fk" FOREIGN KEY ("dispatched_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_branch_memberships" ADD CONSTRAINT "user_branch_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_bins" ADD CONSTRAINT "warehouse_bins_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_bins" ADD CONSTRAINT "warehouse_bins_zone_id_warehouse_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."warehouse_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_inventory_batch_id_inventory_batches_id_fk" FOREIGN KEY ("inventory_batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_witnessed_by_id_users_id_fk" FOREIGN KEY ("witnessed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_template_id_shift_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."shift_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_rule_id_workflow_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."workflow_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_rules" ADD CONSTRAINT "workflow_rules_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_messages_session_idx" ON "ai_assistant_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_messages_tenant_idx" ON "ai_assistant_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_tenant_idx" ON "ai_assistant_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_user_idx" ON "ai_assistant_sessions" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "attendance_tenant_idx" ON "attendance_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "attendance_tenant_user_idx" ON "attendance_records" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "attendance_tenant_branch_idx" ON "attendance_records" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "attendance_clock_in_idx" ON "attendance_records" USING btree ("tenant_id","clock_in_at");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance_records" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "bank_stmt_line_stmt_idx" ON "bank_statement_lines" USING btree ("bank_statement_id");--> statement-breakpoint
CREATE INDEX "bank_stmt_line_match_idx" ON "bank_statement_lines" USING btree ("matched_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_stmt_tenant_number_idx" ON "bank_statements" USING btree ("tenant_id","statement_number");--> statement-breakpoint
CREATE INDEX "bank_stmt_tenant_idx" ON "bank_statements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bank_stmt_acc_idx" ON "bank_statements" USING btree ("clearing_account");--> statement-breakpoint
CREATE INDEX "billing_invoices_tenant_idx" ON "billing_invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_invoices_number_idx" ON "billing_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "billing_payment_methods_tenant_idx" ON "billing_payment_methods" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_payment_methods_default_idx" ON "billing_payment_methods" USING btree ("tenant_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_tenant_code_idx" ON "branches" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "branches_tenant_idx" ON "branches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_campaign_idx" ON "campaign_recipients_log" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_tenant_idx" ON "campaign_recipients_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "drawer_tenant_idx" ON "cash_drawers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drawers_tenant_branch_code_idx" ON "cash_drawers" USING btree ("tenant_id","branch_id","drawer_code") WHERE "cash_drawers"."branch_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "drawers_tenant_code_idx" ON "cash_drawers" USING btree ("tenant_id","drawer_code") WHERE "cash_drawers"."branch_id" IS NULL;--> statement-breakpoint
CREATE INDEX "cashier_assignments_tenant_idx" ON "cashier_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cashier_assignments_tenant_date_idx" ON "cashier_assignments" USING btree ("tenant_id","assignment_date");--> statement-breakpoint
CREATE INDEX "cashier_assignments_drawer_idx" ON "cashier_assignments" USING btree ("cash_drawer_id");--> statement-breakpoint
CREATE INDEX "cashier_assignments_user_idx" ON "cashier_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cashier_assignments_status_idx" ON "cashier_assignments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "cashier_shifts_tenant_status_idx" ON "cashier_shifts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "active_cashier_shift_unique_idx" ON "cashier_shifts" USING btree ("tenant_id","cashier_id") WHERE "cashier_shifts"."status" = 'OPEN';--> statement-breakpoint
CREATE INDEX "combo_items_combo_idx" ON "combo_bundle_items" USING btree ("combo_id");--> statement-breakpoint
CREATE INDEX "combo_bundles_tenant_idx" ON "combo_bundles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "feedback_tenant_idx" ON "customer_feedback" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "feedback_customer_idx" ON "customer_feedback" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "feedback_branch_idx" ON "customer_feedback" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "customer_feedback" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "feedback_rating_idx" ON "customer_feedback" USING btree ("tenant_id","rating");--> statement-breakpoint
CREATE INDEX "customer_interactions_customer_idx" ON "customer_interactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_interactions_tenant_idx" ON "customer_interactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cust_loyalty_tenant_idx" ON "customer_loyalty_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cust_loyalty_customer_idx" ON "customer_loyalty_profiles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_tenant_idx" ON "customers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "customers_type_idx" ON "customers" USING btree ("tenant_id","customer_type");--> statement-breakpoint
CREATE INDEX "delivery_assignments_tenant_order_idx" ON "delivery_assignments" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "demand_forecast_tenant_idx" ON "demand_forecast_snapshots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "demand_forecast_branch_idx" ON "demand_forecast_snapshots" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "demand_forecast_date_idx" ON "demand_forecast_snapshots" USING btree ("tenant_id","forecast_date");--> statement-breakpoint
CREATE INDEX "device_enrollment_tenant_idx" ON "device_enrollment_tokens" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "device_enrollment_pairing_idx" ON "device_enrollment_tokens" USING btree ("tenant_id","pairing_code");--> statement-breakpoint
CREATE INDEX "dining_areas_tenant_branch_idx" ON "dining_areas" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "session_tenant_idx" ON "drawer_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_drawer_idx" ON "drawer_sessions" USING btree ("drawer_id");--> statement-breakpoint
CREATE INDEX "session_status_idx" ON "drawer_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "exp_cat_tenant_code_idx" ON "expense_categories" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "exp_cat_tenant_idx" ON "expense_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_tenant_voucher_idx" ON "expenses" USING btree ("tenant_id","voucher_number");--> statement-breakpoint
CREATE INDEX "expenses_tenant_status_idx" ON "expenses" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "expenses_tenant_date_idx" ON "expenses" USING btree ("tenant_id","expense_date");--> statement-breakpoint
CREATE INDEX "expenses_claimant_idx" ON "expenses" USING btree ("claimant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fin_adj_tenant_number_idx" ON "financial_adjustments" USING btree ("tenant_id","adjustment_number");--> statement-breakpoint
CREATE INDEX "fin_adj_tenant_status_idx" ON "financial_adjustments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "fin_adj_tenant_type_idx" ON "financial_adjustments" USING btree ("tenant_id","adjustment_type");--> statement-breakpoint
CREATE INDEX "fin_adj_tenant_created_idx" ON "financial_adjustments" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "fiscal_invoices_tenant_order_idx" ON "fiscal_invoices" USING btree ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "fiscal_invoices_status_idx" ON "fiscal_invoices" USING btree ("tenant_id","fiscal_status");--> statement-breakpoint
CREATE INDEX "grn_items_grn_idx" ON "goods_received_items" USING btree ("grn_id");--> statement-breakpoint
CREATE INDEX "grn_items_item_idx" ON "goods_received_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grn_tenant_number_idx" ON "goods_received_notes" USING btree ("tenant_id","grn_number");--> statement-breakpoint
CREATE INDEX "grn_tenant_idx" ON "goods_received_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "grn_po_idx" ON "goods_received_notes" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "grn_supplier_idx" ON "goods_received_notes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "hourly_forecast_snapshot_idx" ON "hourly_forecast_intervals" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "hourly_forecast_hour_idx" ON "hourly_forecast_intervals" USING btree ("snapshot_id","hour_of_day");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_batch_tenant_branch_num_idx" ON "inventory_batches" USING btree ("tenant_id","branch_id","batch_number") WHERE "inventory_batches"."branch_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "inv_batch_tenant_num_idx" ON "inventory_batches" USING btree ("tenant_id","batch_number") WHERE "inventory_batches"."branch_id" IS NULL;--> statement-breakpoint
CREATE INDEX "inv_batch_tenant_idx" ON "inventory_batches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inv_batch_item_idx" ON "inventory_batches" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inv_batch_status_idx" ON "inventory_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inv_batch_expiry_idx" ON "inventory_batches" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_branch_stock_unique_idx" ON "inventory_branch_stock" USING btree ("tenant_id","branch_id","inventory_item_id");--> statement-breakpoint
CREATE INDEX "inv_branch_stock_branch_idx" ON "inventory_branch_stock" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "inv_branch_stock_item_idx" ON "inventory_branch_stock" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inv_items_tenant_idx" ON "inventory_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inv_items_sku_idx" ON "inventory_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inv_items_cat_idx" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inv_items_mat_type_idx" ON "inventory_items" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "pricing_rules_tenant_idx" ON "item_pricing_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_item_idx" ON "item_pricing_rules" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "kitchen_global_tenant_idx" ON "kitchen_global_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kitchen_stations_tenant_branch_code_idx" ON "kitchen_stations" USING btree ("tenant_id","branch_id","code");--> statement-breakpoint
CREATE INDEX "kitchen_stations_tenant_idx" ON "kitchen_stations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "kitchen_stations_branch_idx" ON "kitchen_stations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "kitchen_stations_type_idx" ON "kitchen_stations" USING btree ("tenant_id","station_type");--> statement-breakpoint
CREATE INDEX "kb_articles_category_idx" ON "knowledge_base_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "kb_articles_published_idx" ON "knowledge_base_articles" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "fleet_tenant_idx" ON "logistics_fleet" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fleet_plate_idx" ON "logistics_fleet" USING btree ("tenant_id","vehicle_plate");--> statement-breakpoint
CREATE INDEX "fleet_status_idx" ON "logistics_fleet" USING btree ("tenant_id","current_status");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_tenant_idx" ON "loyalty_transactions_ledger" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_customer_idx" ON "loyalty_transactions_ledger" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_type_idx" ON "loyalty_transactions_ledger" USING btree ("tenant_id","entry_type");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_created_idx" ON "loyalty_transactions_ledger" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_rewards_tenant_idx" ON "loyalty_rewards_catalog" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "loyalty_rewards_active_idx" ON "loyalty_rewards_catalog" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "loyalty_rewards_tier_idx" ON "loyalty_rewards_catalog" USING btree ("min_tier_id");--> statement-breakpoint
CREATE INDEX "loyalty_tiers_tenant_idx" ON "loyalty_tiers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_tenant_code_idx" ON "marketing_campaigns" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "campaigns_tenant_idx" ON "marketing_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "marketing_campaigns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_channel_idx" ON "marketing_campaigns" USING btree ("tenant_id","channel");--> statement-breakpoint
CREATE INDEX "mkt_templates_tenant_idx" ON "marketing_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mkt_templates_channel_idx" ON "marketing_templates" USING btree ("tenant_id","channel");--> statement-breakpoint
CREATE INDEX "menu_categories_tenant_idx" ON "menu_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "menu_eng_tenant_idx" ON "menu_engineering_snapshots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "menu_eng_item_idx" ON "menu_engineering_snapshots" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_eng_class_idx" ON "menu_engineering_snapshots" USING btree ("tenant_id","matrix_classification");--> statement-breakpoint
CREATE INDEX "item_avail_tenant_idx" ON "menu_item_availability" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "item_avail_menu_item_idx" ON "menu_item_availability" USING btree ("menu_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_items_tenant_sku_idx" ON "menu_items" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "menu_items_tenant_category_idx" ON "menu_items" USING btree ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "menu_items_tenant_available_idx" ON "menu_items" USING btree ("tenant_id","is_available");--> statement-breakpoint
CREATE INDEX "menu_modifiers_item_idx" ON "menu_modifiers" USING btree ("tenant_id","menu_item_id");--> statement-breakpoint
CREATE INDEX "messaging_integrations_tenant_idx" ON "messaging_integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_integrations_channel_idx" ON "messaging_integrations" USING btree ("tenant_id","channel");--> statement-breakpoint
CREATE INDEX "messaging_integrations_provider_idx" ON "messaging_integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "messaging_integrations_status_idx" ON "messaging_integrations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "messaging_logs_tenant_idx" ON "messaging_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_logs_recipient_idx" ON "messaging_logs" USING btree ("tenant_id","recipient");--> statement-breakpoint
CREATE INDEX "messaging_logs_dispatched_idx" ON "messaging_logs" USING btree ("tenant_id","dispatched_at");--> statement-breakpoint
CREATE INDEX "messaging_templates_tenant_idx" ON "messaging_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messaging_templates_event_idx" ON "messaging_templates" USING btree ("tenant_id","trigger_event");--> statement-breakpoint
CREATE INDEX "modifier_groups_tenant_idx" ON "modifier_groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "modifier_options_group_idx" ON "modifier_options" USING btree ("modifier_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mpesa_c2b_tenant_trans_id_idx" ON "mpesa_c2b_callbacks" USING btree ("tenant_id","trans_id");--> statement-breakpoint
CREATE INDEX "mpesa_c2b_unallocated_idx" ON "mpesa_c2b_callbacks" USING btree ("tenant_id","allocation_status","created_at");--> statement-breakpoint
CREATE INDEX "mpesa_tx_tenant_idx" ON "mpesa_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mpesa_tx_receipt_idx" ON "mpesa_transactions" USING btree ("mpesa_receipt_number");--> statement-breakpoint
CREATE INDEX "mpesa_tx_status_idx" ON "mpesa_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mpesa_tx_type_idx" ON "mpesa_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "network_printers_tenant_idx" ON "network_printers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "network_printers_branch_idx" ON "network_printers" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "network_printers_type_idx" ON "network_printers" USING btree ("tenant_id","device_type");--> statement-breakpoint
CREATE INDEX "notifications_tenant_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("tenant_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_severity_idx" ON "notifications" USING btree ("tenant_id","severity");--> statement-breakpoint
CREATE INDEX "notifications_category_idx" ON "notifications" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "offline_settings_tenant_idx" ON "offline_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "offline_settings_branch_idx" ON "offline_settings" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offline_sync_tenant_ref_idx" ON "offline_sync_batches" USING btree ("tenant_id","batch_reference");--> statement-breakpoint
CREATE INDEX "offline_sync_tenant_idx" ON "offline_sync_batches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "offline_sync_terminal_idx" ON "offline_sync_batches" USING btree ("terminal_identifier");--> statement-breakpoint
CREATE INDEX "offline_sync_status_idx" ON "offline_sync_batches" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "order_logs_tenant_idx" ON "order_integration_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_logs_integration_idx" ON "order_integration_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "order_logs_received_idx" ON "order_integration_logs" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX "order_integrations_tenant_idx" ON "order_integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_integrations_branch_idx" ON "order_integrations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "order_integrations_channel_idx" ON "order_integrations" USING btree ("tenant_id","channel");--> statement-breakpoint
CREATE INDEX "order_integrations_status_idx" ON "order_integrations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_menu_item_idx" ON "order_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_tenant_number_idx" ON "orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_idx" ON "orders" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_tenant_status_idx" ON "orders" USING btree ("tenant_id","status","payment_status");--> statement-breakpoint
CREATE INDEX "orders_tenant_created_idx" ON "orders" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_table_idx" ON "orders" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "payment_integrations_tenant_idx" ON "payment_integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_integrations_branch_idx" ON "payment_integrations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "payment_integrations_provider_idx" ON "payment_integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "payment_integrations_status_idx" ON "payment_integrations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "payment_webhooks_tenant_idx" ON "payment_webhook_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_webhooks_integration_idx" ON "payment_webhook_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pmt_tenant_number_idx" ON "payments" USING btree ("tenant_id","payment_number");--> statement-breakpoint
CREATE INDEX "pmt_tenant_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pmt_flow_idx" ON "payments" USING btree ("payment_flow");--> statement-breakpoint
CREATE INDEX "pmt_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pmt_supplier_idx" ON "payments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "pmt_invoice_idx" ON "payments" USING btree ("supplier_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pos_devices_code_idx" ON "pos_devices" USING btree ("tenant_id","device_code");--> statement-breakpoint
CREATE INDEX "pos_devices_tenant_idx" ON "pos_devices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pos_devices_branch_idx" ON "pos_devices" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "pos_devices_status_idx" ON "pos_devices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "pred_replenish_tenant_idx" ON "predictive_inventory_replenishments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pred_replenish_item_idx" ON "predictive_inventory_replenishments" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "pred_replenish_urgency_idx" ON "predictive_inventory_replenishments" USING btree ("tenant_id","urgency_level");--> statement-breakpoint
CREATE INDEX "pred_replenish_status_idx" ON "predictive_inventory_replenishments" USING btree ("tenant_id","approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_discounts_code_idx" ON "promotional_discounts" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "promo_discounts_tenant_idx" ON "promotional_discounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "promo_discounts_active_idx" ON "promotional_discounts" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "po_items_order_idx" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "po_items_item_idx" ON "purchase_order_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "po_tenant_number_idx" ON "purchase_orders" USING btree ("tenant_id","po_number");--> statement-breakpoint
CREATE INDEX "po_tenant_idx" ON "purchase_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "po_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "po_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "pr_items_request_idx" ON "purchase_request_items" USING btree ("purchase_request_id");--> statement-breakpoint
CREATE INDEX "pr_items_item_idx" ON "purchase_request_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pr_tenant_number_idx" ON "purchase_requests" USING btree ("tenant_id","request_number");--> statement-breakpoint
CREATE INDEX "pr_tenant_idx" ON "purchase_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pr_status_idx" ON "purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pr_priority_idx" ON "purchase_requests" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "receipt_templates_tenant_idx" ON "receipt_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "receipt_templates_branch_idx" ON "receipt_templates" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipes_tenant_menu_item_idx" ON "recipes" USING btree ("tenant_id","menu_item_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ref_tenant_number_idx" ON "refunds" USING btree ("tenant_id","refund_number");--> statement-breakpoint
CREATE INDEX "ref_tenant_idx" ON "refunds" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ref_flow_idx" ON "refunds" USING btree ("refund_flow");--> statement-breakpoint
CREATE INDEX "ref_order_idx" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "report_definitions_category_idx" ON "report_definitions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "report_definitions_active_idx" ON "report_definitions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "report_executions_tenant_idx" ON "report_executions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "report_executions_def_idx" ON "report_executions" USING btree ("report_definition_id");--> statement-breakpoint
CREATE INDEX "report_executions_status_idx" ON "report_executions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "report_schedules_tenant_idx" ON "report_schedules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "report_schedules_active_idx" ON "report_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "reservations_tenant_date_idx" ON "reservations" USING btree ("tenant_id","reservation_date");--> statement-breakpoint
CREATE INDEX "reservations_tenant_table_idx" ON "reservations" USING btree ("tenant_id","table_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tables_tenant_area_label_idx" ON "restaurant_tables" USING btree ("tenant_id","area_id","table_label");--> statement-breakpoint
CREATE INDEX "tables_tenant_status_idx" ON "restaurant_tables" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenant_slug_idx" ON "roles" USING btree ("tenant_id","slug") WHERE "roles"."tenant_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_system_slug_idx" ON "roles" USING btree ("slug") WHERE "roles"."tenant_id" IS NULL;--> statement-breakpoint
CREATE INDEX "security_settings_tenant_idx" ON "security_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_models_tenant_idx" ON "service_models" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_models_type_idx" ON "service_models" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "shift_handovers_tenant_idx" ON "shift_handovers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shift_handovers_tenant_date_idx" ON "shift_handovers" USING btree ("tenant_id","handover_date");--> statement-breakpoint
CREATE INDEX "shift_handovers_tenant_branch_idx" ON "shift_handovers" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE INDEX "shift_handovers_status_idx" ON "shift_handovers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "shift_templates_tenant_idx" ON "shift_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "perf_reviews_tenant_idx" ON "staff_performance_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "perf_reviews_user_idx" ON "staff_performance_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "perf_reviews_cycle_idx" ON "staff_performance_reviews" USING btree ("tenant_id","review_cycle");--> statement-breakpoint
CREATE INDEX "perf_reviews_status_idx" ON "staff_performance_reviews" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "stock_cnt_items_cnt_idx" ON "stock_count_items" USING btree ("stock_count_id");--> statement-breakpoint
CREATE INDEX "stock_cnt_items_inv_idx" ON "stock_count_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_cnt_tenant_number_idx" ON "stock_counts" USING btree ("tenant_id","count_number");--> statement-breakpoint
CREATE INDEX "stock_cnt_tenant_idx" ON "stock_counts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_cnt_status_idx" ON "stock_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_mov_tenant_idx" ON "stock_movements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_mov_item_idx" ON "stock_movements" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "stock_mov_type_idx" ON "stock_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stock_mov_created_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sto_items_transfer_idx" ON "stock_transfer_items" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "sto_items_inv_idx" ON "stock_transfer_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sto_tenant_number_idx" ON "stock_transfers" USING btree ("tenant_id","transfer_number");--> statement-breakpoint
CREATE INDEX "sto_tenant_idx" ON "stock_transfers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sto_status_idx" ON "stock_transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sto_source_idx" ON "stock_transfers" USING btree ("source_branch_id");--> statement-breakpoint
CREATE INDEX "sto_dest_idx" ON "stock_transfers" USING btree ("destination_branch_id");--> statement-breakpoint
CREATE INDEX "subscription_plans_code_idx" ON "subscription_plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "subscription_plans_active_idx" ON "subscription_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "supplier_inv_items_inv_idx" ON "supplier_invoice_items" USING btree ("supplier_invoice_id");--> statement-breakpoint
CREATE INDEX "supplier_inv_items_item_idx" ON "supplier_invoice_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_inv_tenant_ref_idx" ON "supplier_invoices" USING btree ("tenant_id","internal_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_inv_tenant_supplier_num_idx" ON "supplier_invoices" USING btree ("tenant_id","supplier_id","invoice_number");--> statement-breakpoint
CREATE INDEX "supplier_inv_tenant_idx" ON "supplier_invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "supplier_inv_status_idx" ON "supplier_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "supplier_inv_due_idx" ON "supplier_invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "supplier_inv_supplier_idx" ON "supplier_invoices" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_ret_items_ret_idx" ON "supplier_return_items" USING btree ("supplier_return_id");--> statement-breakpoint
CREATE INDEX "supplier_ret_items_inv_idx" ON "supplier_return_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_returns_tenant_number_idx" ON "supplier_returns" USING btree ("tenant_id","return_number");--> statement-breakpoint
CREATE INDEX "supplier_returns_tenant_idx" ON "supplier_returns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "supplier_returns_status_idx" ON "supplier_returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "supplier_returns_supplier_idx" ON "supplier_returns" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "suppliers_tenant_idx" ON "suppliers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "suppliers_active_idx" ON "suppliers" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_idx" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_tickets_tenant_idx" ON "support_tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_codes_tenant_code_idx" ON "tax_codes" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "tax_codes_tenant_idx" ON "tax_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "fin_settings_tenant_idx" ON "tenant_financial_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_subscriptions_tenant_idx" ON "tenant_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transfer_dispatches_tenant_idx" ON "transfer_fleet_dispatches" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transfer_dispatches_transfer_idx" ON "transfer_fleet_dispatches" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "transfer_dispatches_vehicle_idx" ON "transfer_fleet_dispatches" USING btree ("fleet_vehicle_id");--> statement-breakpoint
CREATE INDEX "unit_conv_tenant_idx" ON "unit_conversions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "unit_conv_item_idx" ON "unit_conversions" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_branch_unique_idx" ON "user_branch_memberships" USING btree ("user_id","branch_id");--> statement-breakpoint
CREATE INDEX "user_branch_tenant_idx" ON "user_branch_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_sessions_tenant_idx" ON "user_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_active_idx" ON "user_sessions" USING btree ("tenant_id","is_revoked");--> statement-breakpoint
CREATE INDEX "waitlist_tenant_status_idx" ON "waitlist_entries" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "warehouse_bins_tenant_idx" ON "warehouse_bins" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "warehouse_bins_zone_idx" ON "warehouse_bins" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_bins_zone_code_idx" ON "warehouse_bins" USING btree ("tenant_id","zone_id","bin_code");--> statement-breakpoint
CREATE INDEX "wh_loc_tenant_idx" ON "warehouse_locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wh_loc_branch_idx" ON "warehouse_locations" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "wh_loc_code_idx" ON "warehouse_locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "warehouse_zones_tenant_idx" ON "warehouse_zones" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "warehouse_zones_branch_idx" ON "warehouse_zones" USING btree ("tenant_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_zones_branch_code_idx" ON "warehouse_zones" USING btree ("tenant_id","branch_id","zone_code");--> statement-breakpoint
CREATE INDEX "waste_logs_tenant_idx" ON "waste_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "waste_logs_item_idx" ON "waste_logs" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "waste_logs_reason_idx" ON "waste_logs" USING btree ("waste_reason");--> statement-breakpoint
CREATE INDEX "waste_logs_logged_idx" ON "waste_logs" USING btree ("logged_at");--> statement-breakpoint
CREATE INDEX "work_schedules_tenant_idx" ON "work_schedules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "work_schedules_tenant_date_idx" ON "work_schedules" USING btree ("tenant_id","shift_date");--> statement-breakpoint
CREATE INDEX "work_schedules_user_idx" ON "work_schedules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "work_schedules_branch_idx" ON "work_schedules" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "wf_logs_rule_idx" ON "workflow_execution_logs" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "wf_logs_tenant_idx" ON "workflow_execution_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wf_rules_tenant_idx" ON "workflow_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wf_rules_domain_idx" ON "workflow_rules" USING btree ("tenant_id","domain");--> statement-breakpoint
CREATE INDEX "wf_rules_active_idx" ON "workflow_rules" USING btree ("tenant_id","is_active");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_branch_id_branches_id_fk" FOREIGN KEY ("default_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_active_idx" ON "tenants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_tenant_branch_idx" ON "users" USING btree ("tenant_id","default_branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");