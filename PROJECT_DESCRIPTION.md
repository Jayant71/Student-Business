# 📘 AI-READY PROJECT DESCRIPTION  
### **Business Launchpad for Teens – Full System Specification (Including Flask + Supabase Backend Architecture)**

This is a complete, self-contained system description optimized for any AI agent that needs to understand **backend architecture, database, automation engines, workflows, and frontend functionality**.

---

# 🎯 **Primary Objective**
Build a fully automated business-training platform where **one educator (admin)** teaches **students aged 12–18** how to start businesses using **no-code + AI tools**.  
The system uses:

- **Supabase** → Authentication, Database, Storage, RLS, Edge Functions  
- **Flask** → Automation backend for external APIs (SendGrid, AiSensy, Bolna.ai, Instamojo)  

The platform handles:
- Lead import  
- CTA form funnel  
- Automated email / WhatsApp / voice call communication  
- CRM unified messaging  
- Payments  
- Scheduling  
- Assignments  
- Recordings  
- Support  
- Certifications  

---

# 🧱 **CORE TECHNOLOGY STACK**

### **Backend:**
- **Supabase** → Main backend (Auth, Postgres DB, Storage, Real-time, Edge Functions)  
- **Flask Server** → Automation + Integration Layer  
  - Handles API orchestration for:  
    1. SendGrid email automation  
    2. AiSensy WhatsApp automation  
    3. Bolna.ai voice calling  
    4. Instamojo payment integration  
    5. Scheduling tasks  
    6. Webhooks → payment callbacks, message delivery events  

### **Frontend:**
- Any framework (Next.js / React / Vue) calling:  
  - Supabase Auth  
  - Supabase Database (with RLS policies)  
  - Flask automation APIs  

---

# 🧍‍ SYSTEM ROLES

### **1. Admin (Educator)**
Uses **Admin Dashboard**  
- Imports leads  
- Approves CTA submissions  
- Reviews CRM communication  
- Sends payment links  
- Creates sessions  
- Assigns tasks  
- Uploads recordings  
- Issues certificates  
- Configures automation API keys  

### **2. Student**
Uses **Student Dashboard**  
- Accesses schedule  
- Views recordings  
- Submits assignments  
- Views payment status  
- Downloads certificate  
- Contacts support  

Parents use the same student account (no separate parent role).

---

# 🧱 **SYSTEM MODULES WITH FLASK + SUPABASE INTERACTION**

Below is the MOST IMPORTANT part, explaining how **Supabase and Flask work together**.

---

# 🔌 **HOW SUPABASE & FLASK WORK TOGETHER**

## 🔷 **Supabase Responsibilities**
- Auth (email/password)  
- Profile storage (via RPC `create_profile_for_current_user()`)  
- All relational data stored in Postgres  
- File storage (assignments, recordings)  
- Row Level Security rules  
- Real-time updates for CRM  
- Edge Functions for:  
  - Background jobs  
  - Scheduled cron tasks  
  - Real-time notifications  

Supabase acts as the **primary backend**.

---

## 🔶 **Flask Responsibilities**
Flask acts as the **automation engine**, performing tasks that require external API calls or more complex logic.

### **Flask runs these services:**

### 1. **SendGrid Email Automation**
- Bulk email sending  
- Personalized templates  
- CTA link delivery  
- Payment confirmation emails  
- Session reminders  

Flask writes logs back to **Supabase → `email_logs`**.

---

### 2. **AiSensy WhatsApp Automation**
- Send welcome messages  
- Send follow-up messages  
- Send payment reminders  
- Send session reminders  
- Send post-session materials  

Flask writes logs to **Supabase → `whatsapp_logs`** and **crm_messages**.

---

### 3. **Bolna.ai Voice Calling**
- Automated informational calls  
- Follow-up calls  
- Call logs + durations  
- Call recordings  

Flask stores logs in **`call_logs`**.

---

### 4. **Instamojo Payment Integration**
Flask handles:
- Generating payment link  
- Sending link to student  
- Subscribing to webhook  
- Receiving payment success events  
- Updating **`payments` table**  
- Scheduling session notifications after payment  

---

### 5. **CRM Message Processing**
Whenever WhatsApp or Email receives a reply:
- Flask webhook receives event  
- Normalizes message format  
- Stores conversation into **`crm_messages`**  

---

### 6. **Reminder System**
Runs every session event:
- 15-min before class  
- Flask triggers both:  
  - WhatsApp template message  
  - Email reminder  

Logs reminders in **`reminders` table**.

---

### 7. **Certificate Generation**
Flask:
- Generates certificate PDF or image  
- Uploads file to Supabase Storage  
- Stores reference in **`certificates` table**  

---

# 🔄 **SYSTEM WORKFLOWS (Supabase + Flask)**

## **1. Signup Workflow**
1. User signs up via Supabase Auth.  
2. Client calls RPC:  
   `create_profile_for_current_user()`  
3. Profile stored in `profiles` table.

---

## **2. Lead Import Workflow**
Admin uploads CSV → Supabase Storage.  
Flask reads file → validates → inserts leads into `imported_leads`.

Flask triggers SendGrid → sends CTA email.

---

## **3. CTA Approval → Automation**
1. Admin approves CTA → Supabase updates status.  
2. Supabase triggers Edge Function OR Flask polls.  
3. Flask sends:
   - WhatsApp welcome  
   - Voice call  
   - Email  

Logs stored across:
- `whatsapp_logs`  
- `call_logs`  
- `email_logs`  
- `crm_messages`

---

## **4. Payment Workflow**
1. Admin marks student as "Interested"  
2. Flask calls Instamojo → generates payment link  
3. Flask sends link over WhatsApp & email  
4. Webhook receives payment success → updates `payments`  
5. Student gets:
   - Dashboard access  
   - Session details  
   - Welcome instructions  

---

## **5. Session Workflow**
Admin creates session → Supabase stores it.

Flask checks upcoming sessions every minute:
- Sends reminders 15 min before  
- Sends session link  
- After session ends:  
  - Sends recording link  
  - Sends assignments  

---

## **6. Assignment Workflow**
Admin creates assignment → Supabase stores.  
Student uploads submission → Supabase stores file → updates `assignment_submissions`.

---

## **7. Recording Workflow**
Admin uploads recordings to Supabase Storage.  
Database table `recordings` points students to the link.

---

## **8. CRM Workflow**
Incoming Email/WhatsApp/calls → Flask webhook → Normalize → Insert into `crm_messages`.

Admin responds inside CRM UI:
- Flask sends reply via API  
- Supabase updates messages  

---

## **9. Certificate Workflow**
Admin clicks “Generate Certificate”.
Flask:
- Creates certificate  
- Uploads to Storage  
- Inserts row in `certificates`  

Student can download anytime.

---

# 📊 **ADMIN DASHBOARD MODULES**

### Includes pages:
- Dashboard Overview  
- Lead Import  
- Email Automation  
- CTA Review  
- WhatsApp Automation  
- Auto Calling  
- CRM Inbox  
- Payment Processing  
- Paid Students  
- Session Scheduler  
- Assignments  
- Recordings  
- Notifications Manager  
- Support  
- Certificate Generator  
- Settings  

All admin actions push or pull data from **Supabase**, while heavy automations run through **Flask**.

---

# 🧒 **STUDENT DASHBOARD MODULES**

- Home Dashboard  
- My Schedule  
- Recordings Library  
- Assignments Viewer  
- Submit Assignments  
- Payment Status  
- Support Options  
- Profile Management  

All student data is securely retrieved from Supabase (protected by RLS).

---

# 🔐 **SECURITY**
- Supabase manages authentication  
- Row-Level Security ensures:
  - Students only see their own data  
  - Admin sees everything  
- Flask does NOT store user tokens  
  - Uses Supabase service key for server-side operations  

---

# 🧩 **SUMMARY**
This project consists of:

### ✔ Supabase  
- Auth  
- Profiles  
- Database  
- Storage  
- RLS  
- Edge Functions  
- Real-time CRM  

### ✔ Flask  
- External Integrations  
- Email Automation  
- WhatsApp Automation  
- Voice Call Automation  
- Payment Flow  
- Cron Schedulers  
- Certificate Generation  
- Webhooks Processing  

Together, they form a **hybrid backend architecture** suitable for automation-heavy education platforms.
