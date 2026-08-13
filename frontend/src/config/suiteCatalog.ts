import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  Car,
  CheckSquare,
  ClipboardList,
  Clock3,
  ConciergeBell,
  Cpu,
  CreditCard,
  Factory,
  Files,
  FolderKanban,
  Gauge,
  GitBranch,
  Globe2,
  GraduationCap,
  Hammer,
  History,
  Key,
  KeyRound,
  Landmark,
  Leaf,
  LifeBuoy,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  Newspaper,
  PackageSearch,
  PenLine,
  Phone,
  PlugZap,
  ReceiptText,
  Repeat2,
  ScanBarcode,
  Sheet,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Target,
  Timer,
  UserPlus,
  UserRoundSearch,
  Users,
  Utensils,
  WalletCards,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { TenantModuleKey } from '../utils/tenantModules';

export type SuiteImplementationStatus = 'live' | 'partial' | 'blueprint';

export type SuiteCategoryId =
  | 'finance'
  | 'sales'
  | 'websites'
  | 'supply-chain'
  | 'human-resources'
  | 'marketing'
  | 'services'
  | 'productivity'
  | 'platform'
  | 'commerce'
  | 'intelligence';

export interface SuiteAppDefinition {
  id: string;
  category: SuiteCategoryId;
  name: string;
  shortName?: string;
  description: string;
  icon: LucideIcon;
  bundle: TenantModuleKey;
  status: SuiteImplementationStatus;
  path?: string;
  capabilities: string[];
  localFirst?: boolean;
}

export interface SuiteCategoryDefinition {
  id: SuiteCategoryId;
  name: string;
  description: string;
}

export const SUITE_CATEGORIES: SuiteCategoryDefinition[] = [
  { id: 'finance', name: 'Finance', description: 'Accounting, billing, expenses, tax, treasury, and financial control.' },
  { id: 'sales', name: 'Sales', description: 'Lead-to-cash, quotations, POS, subscriptions, and rentals.' },
  { id: 'websites', name: 'Websites', description: 'Website, commerce, learning, community, publishing, and live chat.' },
  { id: 'supply-chain', name: 'Supply Chain', description: 'Inventory, procurement, manufacturing, quality, maintenance, and repairs.' },
  { id: 'human-resources', name: 'Human Resources', description: 'Employee lifecycle, attendance, payroll, recruitment, and workforce operations.' },
  { id: 'marketing', name: 'Marketing', description: 'Campaigns, automation, events, surveys, social, and lifecycle activation.' },
  { id: 'services', name: 'Services', description: 'Projects, timesheets, planning, field service, helpdesk, and appointments.' },
  { id: 'productivity', name: 'Productivity', description: 'Documents, signatures, knowledge, calendar, communications, and collaboration.' },
  { id: 'platform', name: 'Platform & Governance', description: 'Studio, users, company settings, IoT, integrations, API, audit, and security.' },
  { id: 'commerce', name: 'Omnichannel Commerce', description: 'Indonesia-first marketplace, messaging, loyalty, ordering, and customer operations.' },
  { id: 'intelligence', name: 'AI & Intelligence', description: 'Forecasting, analytics, automation, anomaly detection, and AI copilots.' },
];

export const SUITE_APPS: SuiteAppDefinition[] = [
  // Finance
  { id: 'accounting', category: 'finance', name: 'Accounting', description: 'General ledger, journals, periods, reconciliation, financial statements, AP/AR.', icon: Landmark, bundle: 'accounting', status: 'live', path: '/accounting/dashboard', capabilities: ['GL & Journal', 'AP / AR', 'Financial Reports', 'Reconciliation'] },
  { id: 'invoicing', category: 'finance', name: 'Invoicing', description: 'Customer invoices, supplier bills, payment status, and receivable workflows.', icon: ReceiptText, bundle: 'accounting', status: 'partial', path: '/accounting/ar', capabilities: ['Invoices', 'Bills', 'Collections', 'Aging'] },
  { id: 'expenses', category: 'finance', name: 'Expenses', description: 'Operational expenses, approvals, evidence, and accounting posting.', icon: WalletCards, bundle: 'accounting', status: 'partial', capabilities: ['Expense Claims', 'Approvals', 'Attachments', 'Auto Journal'] },
  { id: 'payments', category: 'finance', name: 'Payments', description: 'Cash, QRIS, bank, gateway, split tender, settlement, and payment audit.', icon: CreditCard, bundle: 'pos', status: 'partial', path: '/cashier', capabilities: ['Cash', 'QRIS', 'Split Payment', 'Settlement'] },
  { id: 'tax', category: 'finance', name: 'Tax & Fiscal', description: 'Tax configuration, fiscal periods, local tax handling, and e-Faktur foundations.', icon: ShieldCheck, bundle: 'accounting', status: 'partial', path: '/accounting/settings', capabilities: ['Tax Rules', 'PPh 21', 'e-Faktur', 'Fiscal Periods'], localFirst: true },
  { id: 'esg', category: 'finance', name: 'ESG', description: 'Sustainability metrics, operational footprint, targets, and disclosure workspace.', icon: Leaf, bundle: 'accounting', status: 'blueprint', capabilities: ['ESG Metrics', 'Targets', 'Evidence', 'Reporting'] },

  // Sales
  { id: 'crm', category: 'sales', name: 'CRM', description: 'Lead pipeline, opportunities, activities, follow-ups, scoring, and customer history.', icon: Target, bundle: 'commerSocial', status: 'partial', path: '/medsos/customers', capabilities: ['Leads', 'Pipeline', 'Activities', 'Customer 360'] },
  { id: 'sales', category: 'sales', name: 'Sales', description: 'Quotation-to-order workflow, customer pricing, approval, delivery, and invoicing.', icon: ShoppingCart, bundle: 'pos', status: 'partial', path: '/owner/reports', capabilities: ['Quotation', 'Sales Order', 'Pricing', 'Order History'] },
  { id: 'point-of-sale', category: 'sales', name: 'Point of Sale', shortName: 'POS', description: 'Touch-first cashier, tables, modifiers, split tender, supervisor controls, printing.', icon: Store, bundle: 'pos', status: 'live', path: '/cashier', capabilities: ['Cashier', 'Tables', 'Modifiers', 'Split Payment'] },
  { id: 'subscriptions', category: 'sales', name: 'Subscriptions', description: 'Recurring plans, renewal lifecycle, recurring billing, and subscription analytics.', icon: Repeat2, bundle: 'accounting', status: 'blueprint', capabilities: ['Plans', 'Recurring Billing', 'Renewals', 'MRR'] },
  { id: 'rental', category: 'sales', name: 'Rental', description: 'Rental products, booking periods, pickup/return, deposit, and availability.', icon: KeyRound, bundle: 'pos', status: 'blueprint', capabilities: ['Booking', 'Availability', 'Deposit', 'Returns'] },

  // Websites
  { id: 'website', category: 'websites', name: 'Website', description: 'Business website, landing pages, forms, lead capture, and publish workflow.', icon: Globe2, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Pages', 'Forms', 'CMS', 'Analytics'] },
  { id: 'ecommerce', category: 'websites', name: 'eCommerce', description: 'Online catalog, cart, checkout, customer accounts, delivery, and order lifecycle.', icon: ShoppingBag, bundle: 'pos', status: 'blueprint', capabilities: ['Catalog', 'Cart', 'Checkout', 'Fulfillment'] },
  { id: 'elearning', category: 'websites', name: 'eLearning', description: 'Courses, lessons, completion tracking, assessments, and learner portal.', icon: GraduationCap, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Courses', 'Lessons', 'Quiz', 'Certificates'] },
  { id: 'forum', category: 'websites', name: 'Forum', description: 'Community Q&A, moderation, tags, reputation, and knowledge discovery.', icon: MessagesSquare, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Q&A', 'Moderation', 'Tags', 'Reputation'] },
  { id: 'blog', category: 'websites', name: 'Blog', description: 'Publishing workflow for articles, announcements, SEO content, and categories.', icon: Newspaper, bundle: 'commerSocial', status: 'partial', path: '/medsos/calendar', capabilities: ['Editorial Calendar', 'Drafts', 'Publishing', 'SEO Content'] },
  { id: 'live-chat', category: 'websites', name: 'Live Chat', description: 'Website conversations, routing, customer identification, and conversation history.', icon: MessageCircle, bundle: 'commerSocial', status: 'partial', path: '/medsos/inbox', capabilities: ['Inbox', 'Routing', 'Customer Context', 'Auto Reply'] },

  // Supply Chain
  { id: 'inventory', category: 'supply-chain', name: 'Inventory', description: 'Stock levels, movements, transfers, forecasting, reorder, and stock audit.', icon: Boxes, bundle: 'inventory', status: 'live', path: '/inventory/dashboard', capabilities: ['Stock', 'Movements', 'Forecast', 'Reorder'] },
  { id: 'manufacturing', category: 'supply-chain', name: 'Manufacturing', shortName: 'MRP', description: 'Recipes/BOM, production orders, material consumption, yield, and costing.', icon: Factory, bundle: 'inventory', status: 'partial', path: '/inventory/recipe-simulation', capabilities: ['BOM / Recipe', 'Production Order', 'Yield', 'Costing'] },
  { id: 'purchase', category: 'supply-chain', name: 'Purchase', description: 'Supplier, RFQ/PO foundations, receiving, cost, approval, and replenishment.', icon: PackageSearch, bundle: 'inventory', status: 'partial', path: '/owner/inventory', capabilities: ['Suppliers', 'Purchase Order', 'Receiving', 'Approval'] },
  { id: 'barcode', category: 'supply-chain', name: 'Barcode', description: 'Barcode-assisted receiving, stock count, transfer, picking, and POS lookup.', icon: ScanBarcode, bundle: 'inventory', status: 'blueprint', capabilities: ['Scan', 'Receiving', 'Stock Count', 'Picking'] },
  { id: 'quality', category: 'supply-chain', name: 'Quality', description: 'Quality points, inspections, non-conformance, corrective action, and traceability.', icon: BadgeCheck, bundle: 'inventory', status: 'blueprint', capabilities: ['Inspection', 'QC Points', 'NCR', 'CAPA'] },
  { id: 'maintenance', category: 'supply-chain', name: 'Maintenance', description: 'Equipment register, preventive maintenance, work requests, and downtime.', icon: Wrench, bundle: 'inventory', status: 'blueprint', capabilities: ['Equipment', 'PM Schedule', 'Work Request', 'Downtime'] },
  { id: 'plm', category: 'supply-chain', name: 'Product Lifecycle', shortName: 'PLM', description: 'Product revisions, engineering changes, approvals, and documentation.', icon: GitBranch, bundle: 'inventory', status: 'blueprint', capabilities: ['Revisions', 'ECO', 'Approvals', 'Documents'] },
  { id: 'repairs', category: 'supply-chain', name: 'Repairs', description: 'Repair orders, parts, service status, customer handoff, and repair costing.', icon: Hammer, bundle: 'inventory', status: 'blueprint', capabilities: ['Repair Order', 'Parts', 'Status', 'Costing'] },

  // Human Resources
  { id: 'employees', category: 'human-resources', name: 'Employees', description: 'Employee master data, organization, documents, status, and employment profile.', icon: Users, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Employee Master', 'Organization', 'Documents', 'Employment Data'] },
  { id: 'recruitment', category: 'human-resources', name: 'Recruitment', description: 'Jobs, applicants, recruitment pipeline, interviews, and hiring decisions.', icon: UserRoundSearch, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Vacancies', 'Applicants', 'Interview', 'Offer'] },
  { id: 'time-off', category: 'human-resources', name: 'Time Off', description: 'Leave types, balances, requests, approvals, calendar, and attendance impact.', icon: CalendarOff, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Leave Balance', 'Request', 'Approval', 'Calendar'] },
  { id: 'appraisals', category: 'human-resources', name: 'Appraisals', description: 'Performance cycles, goals, reviews, feedback, and development actions.', icon: Star, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Goals', 'Review Cycle', 'Feedback', 'Development'] },
  { id: 'referrals', category: 'human-resources', name: 'Referrals', description: 'Employee referral campaigns, candidate tracking, rewards, and hiring conversion.', icon: UserPlus, bundle: 'accounting', status: 'blueprint', capabilities: ['Referral', 'Candidate', 'Reward', 'Conversion'] },
  { id: 'fleet', category: 'human-resources', name: 'Fleet', description: 'Vehicle register, assignments, costs, service history, and operational status.', icon: Car, bundle: 'accounting', status: 'blueprint', capabilities: ['Vehicles', 'Assignments', 'Service', 'Cost'] },
  { id: 'attendances', category: 'human-resources', name: 'Attendances', description: 'Clock in/out, attendance logs, lateness, overtime input, and shift records.', icon: Clock3, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Clock In/Out', 'Attendance', 'Overtime', 'Shift'] },
  { id: 'payroll', category: 'human-resources', name: 'Payroll', description: 'Payroll periods, salary components, BPJS foundations, PPh 21, and net pay.', icon: Banknote, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Payroll Period', 'BPJS', 'PPh 21', 'Net Salary'], localFirst: true },
  { id: 'frontdesk', category: 'human-resources', name: 'Frontdesk', description: 'Visitor registration, host notification, purpose, badge, and visit history.', icon: ConciergeBell, bundle: 'accounting', status: 'blueprint', capabilities: ['Visitors', 'Host', 'Badge', 'History'] },
  { id: 'lunch', category: 'human-resources', name: 'Lunch', description: 'Employee meal ordering, vendors, allowances, delivery, and settlement.', icon: Utensils, bundle: 'accounting', status: 'blueprint', capabilities: ['Menu', 'Order', 'Allowance', 'Vendor'] },

  // Marketing
  { id: 'email-marketing', category: 'marketing', name: 'Email Marketing', description: 'Audience, templates, campaigns, delivery, engagement, and attribution.', icon: Mail, bundle: 'commerSocial', status: 'partial', path: '/medsos/broadcast', capabilities: ['Audience', 'Campaign', 'Template', 'Analytics'] },
  { id: 'sms-marketing', category: 'marketing', name: 'SMS Marketing', description: 'SMS audience, campaigns, scheduling, consent, delivery, and performance.', icon: MessageSquareText, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Audience', 'Campaign', 'Schedule', 'Analytics'] },
  { id: 'marketing-automation', category: 'marketing', name: 'Marketing Automation', description: 'Lifecycle journeys, triggers, conditions, scoring, and automated actions.', icon: Workflow, bundle: 'commerSocial', status: 'partial', path: '/medsos/auto-reply', capabilities: ['Triggers', 'Rules', 'Journeys', 'Actions'] },
  { id: 'events', category: 'marketing', name: 'Events', description: 'Event pages, registrations, tickets, attendees, communication, and reporting.', icon: CalendarDays, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Events', 'Registration', 'Ticketing', 'Attendees'] },
  { id: 'surveys', category: 'marketing', name: 'Surveys', description: 'Survey builder, response collection, scoring, segmentation, and analysis.', icon: ClipboardList, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Builder', 'Responses', 'Scoring', 'Analytics'] },
  { id: 'social-marketing', category: 'marketing', name: 'Social Marketing', description: 'Content calendar, social publishing, inbox, ads workspace, and social analytics.', icon: Megaphone, bundle: 'commerSocial', status: 'live', path: '/medsos/dashboard', capabilities: ['Planner', 'Publishing', 'Inbox', 'Ads'] },

  // Services
  { id: 'project', category: 'services', name: 'Project', description: 'Projects, tasks, stages, assignees, milestones, and operational delivery.', icon: FolderKanban, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Projects', 'Tasks', 'Milestones', 'Workload'] },
  { id: 'timesheets', category: 'services', name: 'Timesheets', description: 'Time logging by user, task, customer, activity, and billable context.', icon: Timer, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Time Entry', 'Task', 'Customer', 'Billable'] },
  { id: 'planning', category: 'services', name: 'Planning', description: 'Shift planning, assignments, capacity, availability, and scheduling conflicts.', icon: CalendarClock, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Schedule', 'Capacity', 'Assignment', 'Conflict'] },
  { id: 'field-service', category: 'services', name: 'Field Service', description: 'On-site work orders, technicians, location, parts, photos, and customer sign-off.', icon: MapPin, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Work Order', 'Technician', 'Parts', 'Sign-off'] },
  { id: 'helpdesk', category: 'services', name: 'Helpdesk', description: 'Tickets, queues, SLA, assignment, customer conversation, and resolution analytics.', icon: LifeBuoy, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Tickets', 'SLA', 'Routing', 'Resolution'] },
  { id: 'appointments', category: 'services', name: 'Appointments', description: 'Bookable resources, schedule, availability, reminders, and customer booking.', icon: CalendarCheck, bundle: 'accounting', status: 'live', path: '/workforce', capabilities: ['Booking', 'Availability', 'Resource', 'Reminder'] },

  // Productivity
  { id: 'documents', category: 'productivity', name: 'Documents', description: 'Company files, folders, tags, access, attachment workflow, and record linking.', icon: Files, bundle: 'accounting', status: 'partial', capabilities: ['Files', 'Folders', 'Tags', 'Record Links'] },
  { id: 'sign', category: 'productivity', name: 'Sign', description: 'Electronic signature requests, templates, recipients, audit trail, and completion.', icon: PenLine, bundle: 'accounting', status: 'blueprint', capabilities: ['Templates', 'Recipients', 'Signature', 'Audit'] },
  { id: 'spreadsheet', category: 'productivity', name: 'Spreadsheet', description: 'Business spreadsheet workspace with live business data and collaboration.', icon: Sheet, bundle: 'accounting', status: 'blueprint', capabilities: ['Sheets', 'Business Data', 'Formula', 'Export'] },
  { id: 'dashboards', category: 'productivity', name: 'Dashboards', description: 'Cross-module KPIs, charts, filters, outlet comparison, and executive views.', icon: Gauge, bundle: 'pos', status: 'live', path: '/owner/dashboard', capabilities: ['KPIs', 'Charts', 'Filters', 'Multi Outlet'] },
  { id: 'knowledge', category: 'productivity', name: 'Knowledge', description: 'Internal wiki, SOP, policies, playbooks, linked records, and search.', icon: BookOpen, bundle: 'accounting', status: 'blueprint', capabilities: ['Wiki', 'SOP', 'Search', 'Record Links'] },
  { id: 'calendar', category: 'productivity', name: 'Calendar', description: 'Shared business calendar, activities, reminders, events, and team visibility.', icon: Calendar, bundle: 'commerSocial', status: 'partial', path: '/medsos/calendar', capabilities: ['Calendar', 'Activities', 'Reminder', 'Team View'] },
  { id: 'whatsapp', category: 'productivity', name: 'WhatsApp', description: 'Unified WhatsApp inbox, customer context, broadcast, templates, and automation.', icon: MessageCircle, bundle: 'commerSocial', status: 'live', path: '/medsos/inbox', capabilities: ['Inbox', 'Broadcast', 'Templates', 'Automation'], localFirst: true },
  { id: 'phone', category: 'productivity', name: 'Phone / VoIP', description: 'Call workspace, contact context, call logging, routing, and follow-up activities.', icon: Phone, bundle: 'commerSocial', status: 'blueprint', capabilities: ['Calls', 'Routing', 'Call Log', 'Follow-up'] },
  { id: 'todo', category: 'productivity', name: 'To-do', description: 'Personal and team tasks, priorities, deadlines, activities, and completion tracking.', icon: CheckSquare, bundle: 'accounting', status: 'blueprint', capabilities: ['Tasks', 'Priority', 'Deadline', 'Activity'] },
  { id: 'data-cleaning', category: 'productivity', name: 'Data Cleaning', description: 'Duplicate detection, normalization, merge rules, data quality, and cleanup queues.', icon: SlidersHorizontal, bundle: 'accounting', status: 'blueprint', capabilities: ['Duplicates', 'Normalize', 'Merge', 'Data Quality'] },

  // Platform & governance
  { id: 'studio', category: 'platform', name: 'Studio', description: 'No-code custom fields, layouts, lightweight workflows, approval rules, and views.', icon: Sparkles, bundle: 'accounting', status: 'blueprint', capabilities: ['Fields', 'Views', 'Workflow', 'Approval Rules'] },
  { id: 'users-access', category: 'platform', name: 'Users & Access', description: 'Users, roles, outlet assignment, module access, permissions, and security controls.', icon: ShieldCheck, bundle: 'pos', status: 'live', path: '/owner/users', capabilities: ['Users', 'Roles', 'Permissions', 'Outlet Access'] },
  { id: 'companies-outlets', category: 'platform', name: 'Companies & Outlets', description: 'Tenant, outlet, business identity, limits, organizational structure, and provisioning.', icon: Building2, bundle: 'pos', status: 'live', path: '/owner/outlets', capabilities: ['Tenant', 'Outlets', 'Business Profile', 'Provisioning'] },
  { id: 'iot', category: 'platform', name: 'IoT & Devices', description: 'Printers, customer display, scanner, drawer, edge device, and hardware configuration.', icon: Cpu, bundle: 'pos', status: 'partial', path: '/owner/settings', capabilities: ['Printer', 'Scanner', 'Cash Drawer', 'Device Config'] },
  { id: 'integrations', category: 'platform', name: 'Integrations', description: 'External services, marketplaces, webhooks, credentials, and integration health.', icon: PlugZap, bundle: 'pos', status: 'live', path: '/owner/integrations', capabilities: ['Marketplace', 'Webhook', 'Credentials', 'Health'] },
  { id: 'api', category: 'platform', name: 'API & Developer', description: 'API keys, owner API, Swagger documentation, webhook contracts, and external access.', icon: Key, bundle: 'pos', status: 'live', path: '/admin/api-keys', capabilities: ['API Keys', 'Swagger', 'Webhooks', 'External API'] },
  { id: 'audit', category: 'platform', name: 'Audit & Activity', description: 'Critical action logs, approvals, user activity, stock changes, and traceability.', icon: History, bundle: 'accounting', status: 'partial', capabilities: ['Audit Log', 'Approvals', 'Activity', 'Traceability'] },
  { id: 'billing', category: 'platform', name: 'SaaS Billing', description: 'Tenant plan, subscription status, entitlements, limits, and billing administration.', icon: CreditCard, bundle: 'accounting', status: 'live', path: '/admin/billing', capabilities: ['Plans', 'Subscription', 'Entitlements', 'Limits'] },

  // Omnichannel commerce differentiators
  { id: 'marketplaces', category: 'commerce', name: 'Marketplace Hub', description: 'GoFood, GrabFood, ShopeeFood order and commercial control from one workspace.', icon: ShoppingBag, bundle: 'commerSocial', status: 'partial', path: '/medsos/marketplace', capabilities: ['GoFood', 'GrabFood', 'ShopeeFood', 'Order Sync'], localFirst: true },
  { id: 'customer-database', category: 'commerce', name: 'Customer 360', description: 'Unified customer profile, transactions, messaging, segment, and lifecycle context.', icon: Users, bundle: 'commerSocial', status: 'partial', path: '/medsos/customers', capabilities: ['Profiles', 'History', 'Segments', 'Lifecycle'] },
  { id: 'loyalty', category: 'commerce', name: 'Loyalty & Rewards', description: 'Points ledger, tiers, rewards, vouchers, wallet, and retention mechanics.', icon: Star, bundle: 'pos', status: 'blueprint', capabilities: ['Points', 'Tier', 'Rewards', 'Voucher'] },
  { id: 'broadcast', category: 'commerce', name: 'Broadcast & Campaign', description: 'Segmented outbound campaigns across WhatsApp and supported messaging channels.', icon: Megaphone, bundle: 'commerSocial', status: 'live', path: '/medsos/broadcast', capabilities: ['Audience', 'Templates', 'Schedule', 'Delivery'] },
  { id: 'auto-reply', category: 'commerce', name: 'Auto Reply', description: 'Rule-based automated replies, routing, trigger logic, and customer response automation.', icon: Workflow, bundle: 'commerSocial', status: 'live', path: '/medsos/auto-reply', capabilities: ['Rules', 'Triggers', 'Routing', 'Auto Response'] },

  // AI & intelligence
  { id: 'ai-forecast', category: 'intelligence', name: 'AI Forecast', description: 'Financial and inventory forecasting with confidence, history, and decision support.', icon: Sparkles, bundle: 'accounting', status: 'live', path: '/accounting/forecast', capabilities: ['Financial Forecast', 'Inventory Forecast', 'Confidence', 'Trend'] },
  { id: 'business-analytics', category: 'intelligence', name: 'Business Analytics', description: 'Sales, margin, product, outlet, inventory, and cross-channel operational analytics.', icon: Gauge, bundle: 'pos', status: 'live', path: '/owner/reports', capabilities: ['Sales', 'Margin', 'Product', 'Outlet'] },
  { id: 'anomaly-monitor', category: 'intelligence', name: 'Anomaly Monitor', description: 'Detect unusual sales, stock, cashier, expense, and financial activity for review.', icon: ShieldCheck, bundle: 'accounting', status: 'blueprint', capabilities: ['Sales Anomaly', 'Stock Anomaly', 'Expense Risk', 'Alerts'] },
  { id: 'ai-copilot', category: 'intelligence', name: 'AI Business Copilot', description: 'Natural-language business assistant for reports, insights, actions, and workflow guidance.', icon: Sparkles, bundle: 'accounting', status: 'blueprint', capabilities: ['Ask Data', 'Insights', 'Actions', 'Guidance'] },
];

export const SUITE_APP_COUNT = SUITE_APPS.length;
export const LIVE_SUITE_APP_COUNT = SUITE_APPS.filter((app) => app.status === 'live').length;
export const PARTIAL_SUITE_APP_COUNT = SUITE_APPS.filter((app) => app.status === 'partial').length;

export const getAppsForCategory = (category: SuiteCategoryId) =>
  SUITE_APPS.filter((app) => app.category === category);
