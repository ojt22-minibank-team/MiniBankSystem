import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def create_element(name):
    return OxmlElement(name)

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = create_element('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = create_element('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = create_element(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    tblBorders = create_element('w:tblBorders')
    for b in ['top', 'left', 'bottom', 'right', 'insideH']:
        el = create_element(f'w:{b}')
        el.set(qn('w:val'), val)
        el.set(qn('w:sz'), sz)
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), color)
        tblBorders.append(el)
    el = create_element('w:insideV')
    el.set(qn('w:val'), 'none')
    tblBorders.append(el)
    tblPr.append(tblBorders)

def style_table_header(row, col_widths, hex_color="1B365D"):
    for i, cell in enumerate(row.cells):
        set_cell_background(cell, hex_color)
        set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        if col_widths and i < len(col_widths):
            cell.width = col_widths[i]
        for p in cell.paragraphs:
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            for run in p.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(9.5)
                run.font.name = "Calibri"

def style_table_cells(table, col_widths, alt_color="F8FAFC"):
    for r_idx, row in enumerate(table.rows[1:]):
        bg = alt_color if r_idx % 2 == 1 else "FFFFFF"
        for i, cell in enumerate(row.cells):
            if bg != "FFFFFF":
                set_cell_background(cell, bg)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            if col_widths and i < len(col_widths):
                cell.width = col_widths[i]
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.15
                for run in p.runs:
                    run.font.size = Pt(9.0)
                    run.font.name = "Calibri"
                    run.font.color.rgb = RGBColor(31, 41, 55)

def build_srs_doc(output_path):
    doc = Document()
    
    # Page setup: Standard Letter / A4 with 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("Group 2 - Core Banking System | Software Requirements Specification")
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(156, 163, 175)
        hrun.font.name = "Calibri"

    # Color definitions
    NAVY = RGBColor(27, 54, 93)      # Primary Title / Headings #1B365D
    SLATE = RGBColor(71, 85, 105)    # Secondary / Subheadings #475569
    DARK = RGBColor(31, 41, 55)      # Body text #1F2937

    # Helper: Add Headings with exact styling
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = NAVY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(12.5)
        run.font.bold = True
        run.font.color.rgb = NAVY
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(10.5)
        run.font.bold = True
        run.font.color.rgb = SLATE
        return p

    def add_p(text, bold_prefix=None, space_after=4):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Calibri"
            r_bold.font.size = Pt(10)
            r_bold.font.bold = True
            r_bold.font.color.rgb = DARK
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(10)
        run.font.color.rgb = DARK
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.name = "Calibri"
            r_bold.font.size = Pt(10)
            r_bold.font.bold = True
            r_bold.font.color.rgb = DARK
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(10)
        run.font.color.rgb = DARK
        return p

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(24)
    p_pre.paragraph_format.space_after = Pt(8)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_pre = p_pre.add_run("SOFTWARE REQUIREMENTS SPECIFICATION")
    r_pre.font.name = "Calibri"
    r_pre.font.size = Pt(14)
    r_pre.font.bold = True
    r_pre.font.color.rgb = NAVY

    p_inst = doc.add_paragraph()
    p_inst.paragraph_format.space_before = Pt(10)
    p_inst.paragraph_format.space_after = Pt(2)
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("ACE\nInspiration")
    r_inst.font.name = "Georgia"
    r_inst.font.size = Pt(38)
    r_inst.font.bold = True
    r_inst.font.color.rgb = RGBColor(15, 76, 129)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(36)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("—— Professional Development Center ——")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = SLATE

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(6)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("CORE BANKING APPLICATION")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = NAVY

    p_subtitle = doc.add_paragraph()
    p_subtitle.paragraph_format.space_before = Pt(0)
    p_subtitle.paragraph_format.space_after = Pt(28)
    p_subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_subtitle = p_subtitle.add_run("Staff Operations & Transaction Management Portal")
    r_subtitle.font.name = "Calibri"
    r_subtitle.font.size = Pt(14)
    r_subtitle.font.color.rgb = SLATE

    # Meta block
    meta_items = [
        ("Project Group: ", "Group 2"),
        ("Course: ", "Software Engineering"),
        ("Academic Year: ", "2026"),
        ("Document Version: ", "1.0"),
        ("Document Status: ", "Final Draft"),
    ]
    for label, val in meta_items:
        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_before = Pt(0)
        p_m.paragraph_format.space_after = Pt(2)
        p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p_m.add_run(label)
        r1.font.bold = True
        r1.font.size = Pt(10.5)
        r1.font.color.rgb = DARK
        r2 = p_m.add_run(val)
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = DARK

    p_space = doc.add_paragraph()
    p_space.paragraph_format.space_before = Pt(24)

    p_prep = doc.add_paragraph()
    p_prep.paragraph_format.space_before = Pt(0)
    p_prep.paragraph_format.space_after = Pt(2)
    p_prep.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_prep = p_prep.add_run("Prepared By")
    r_prep.font.bold = True
    r_prep.font.size = Pt(11)
    r_prep.font.color.rgb = NAVY

    p_team = doc.add_paragraph()
    p_team.paragraph_format.space_before = Pt(0)
    p_team.paragraph_format.space_after = Pt(18)
    p_team.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_team = p_team.add_run("Group 2 – Core Banking Development Team")
    r_team.font.size = Pt(10.5)
    r_team.font.color.rgb = DARK

    p_subm = doc.add_paragraph()
    p_subm.paragraph_format.space_before = Pt(0)
    p_subm.paragraph_format.space_after = Pt(2)
    p_subm.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_subm = p_subm.add_run("Submitted To")
    r_subm.font.bold = True
    r_subm.font.size = Pt(11)
    r_subm.font.color.rgb = NAVY

    p_teacher = doc.add_paragraph()
    p_teacher.paragraph_format.space_before = Pt(0)
    p_teacher.paragraph_format.space_after = Pt(24)
    p_teacher.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_teacher = p_teacher.add_run("Daw Khin Khin Saw")
    r_teacher.font.size = Pt(11)
    r_teacher.font.color.rgb = DARK

    p_date = doc.add_paragraph()
    p_date.paragraph_format.space_before = Pt(0)
    p_date.paragraph_format.space_after = Pt(0)
    p_date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_date = p_date.add_run("November 2026")
    r_date.font.size = Pt(10.5)
    r_date.font.color.rgb = SLATE

    doc.add_page_break()

    # =========================================================================
    # DOCUMENT CONTROL & REVISION HISTORY
    # =========================================================================
    add_h1("Document Control")
    table_ctrl = doc.add_table(rows=6, cols=2)
    table_ctrl.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_ctrl = [Inches(2.2), Inches(4.3)]
    set_table_borders(table_ctrl)

    ctrl_data = [
        ("Document Title", "Software Requirements Specification (SRS)"),
        ("Project", "Core Banking Application - Staff Operations Portal"),
        ("Project Group", "Group 2"),
        ("Document Version", "1.0"),
        ("Document Status", "Final Draft"),
        ("Prepared By", "Group 2 - Core Banking Development Team")
    ]
    for r_idx, (k, v) in enumerate(ctrl_data):
        row = table_ctrl.rows[r_idx]
        row.cells[0].paragraphs[0].text = k
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[1].paragraphs[0].text = v
    style_table_cells(table_ctrl, col_w_ctrl)

    add_h2("Revision History")
    table_rev = doc.add_table(rows=5, cols=4)
    table_rev.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_rev = [Inches(0.8), Inches(1.1), Inches(3.6), Inches(1.0)]
    set_table_borders(table_rev)

    rev_headers = ["Version", "Date", "Description", "Author"]
    for i, h in enumerate(rev_headers):
        table_rev.rows[0].cells[i].paragraphs[0].text = h
    style_table_header(table_rev.rows[0], col_w_rev)

    rev_data = [
        ("0.1", "2026-Sep-01", "Initial requirements gathering and baseline architecture draft.", "Group 2"),
        ("0.2", "2026-Sep-15", "Defined double-entry ledger rules, OTC flows, and external integration points.", "Group 2"),
        ("0.9", "2026-Oct-20", "Drafted complete functional specification, reporting subsystems, and audit trail engine.", "Group 2"),
        ("1.0", "2026-Nov-09", "Final SRS release: completely removed Held and Release functions, eliminated Maker-Checker workflows, established direct account creation without rejection state, and restricted reporting to Admin and Auditor.", "Group 2")
    ]
    for r_idx, row_vals in enumerate(rev_data):
        row = table_rev.rows[r_idx + 1]
        for c_idx, val in enumerate(row_vals):
            row.cells[c_idx].paragraphs[0].text = val
    style_table_cells(table_rev, col_w_rev)

    doc.add_page_break()

    # =========================================================================
    # TABLE OF CONTENTS
    # =========================================================================
    add_h1("Table of Contents")
    toc_items = [
        ("1. Introduction", "4"),
        ("2. Overall Description", "5"),
        ("3. Stakeholders and User Requirements", "7"),
        ("4. Business Requirements", "8"),
        ("5. Functional Requirements", "9"),
        ("6. Non-Functional Requirements", "11"),
        ("7. External Interface Requirements", "12"),
        ("8. Business Rules", "13"),
        ("9. Main System Flow", "14"),
        ("10. Data and Reporting Requirements", "15"),
        ("11. Technology and UI/UX Requirements", "16"),
        ("12. Timeline and Success Metrics", "17"),
        ("13. Requirement Traceability", "18"),
        ("14. Appendix: Defense Quick Reference", "19")
    ]
    table_toc = doc.add_table(rows=len(toc_items), cols=2)
    table_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_toc = [Inches(5.5), Inches(1.0)]
    set_table_borders(table_toc, val="none") # clean borderless TOC table

    for r_idx, (sec_name, page_no) in enumerate(toc_items):
        row = table_toc.rows[r_idx]
        set_cell_margins(row.cells[0], top=40, bottom=40, left=0, right=0)
        set_cell_margins(row.cells[1], top=40, bottom=40, left=0, right=0)
        row.cells[0].paragraphs[0].text = sec_name
        row.cells[0].paragraphs[0].runs[0].font.name = "Calibri"
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(10)
        row.cells[0].paragraphs[0].runs[0].font.color.rgb = DARK
        row.cells[1].paragraphs[0].text = page_no
        row.cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
        row.cells[1].paragraphs[0].runs[0].font.name = "Calibri"
        row.cells[1].paragraphs[0].runs[0].font.size = Pt(10)
        row.cells[1].paragraphs[0].runs[0].font.color.rgb = SLATE

    doc.add_page_break()

    # =========================================================================
    # 1. INTRODUCTION
    # =========================================================================
    add_h1("1. Introduction")
    
    add_h2("1.1 Purpose")
    add_p("This Software Requirements Specification (SRS) defines the formal business, user, functional, non-functional, external interface, business rules, data, and operational requirements for the Group 2 Core Banking System. The system comprises the Java Spring Boot backend engine (corebanking) and the React staff administrative portal (core-banking-react). This specification establishes a binding reference for software engineers, quality assurance testers, academic reviewers, and evaluators.")

    add_h2("1.2 Scope")
    add_p("The Group 2 Core Banking platform serves as the central administrative and financial transaction backbone for the wider financial ecosystem. It provides staff authentication, customer identity management (Personal, Individual, Company KYC), direct account creation, account lifecycle state administration, branch Over-The-Counter (OTC) cash handling (deposits and withdrawals), balanced double-entry general ledger accounting, dynamic parameter and fee configuration, immutable audit trail logging with sensitive data masking, and financial/regulatory reporting.")
    add_p("Crucial Scope Clarifications:")
    add_bullet("Held and Release functions are strictly excluded from the operational scope. The system does not support placing accounts or transactions on temporary hold or executing subsequent release operations. All transactions resolve directly into final completed or failed states.")
    add_bullet("Maker-Checker dual authorization is completely excluded from the system. Account creation is executed directly by authorized branch staff (Teller or Admin) without requiring supervisory approval queues or dual verification.")
    add_bullet("Account creation does not include a rejection workflow. Upon complete KYC validation and required data entry by authorized staff, the account is directly generated and transitioned immediately into an ACTIVE operational status.")
    add_bullet("Direct customer online banking interactions are serviced via the external Customer Portal. Financial payment settlement requests from external merchants and platforms are routed through the Group 3 Payment Gateway (MMSPG) via authenticated REST APIs.")

    add_h2("1.3 Intended Audience")
    add_p("This document is prepared for the Group 2 software engineering team, course instructor Daw Khin Khin Saw, project examination committee members, system architects, QA verification testers, and integration partners responsible for external modules (Group 3 Payment Gateway and Group 1/5 E-Commerce).")

    add_h2("1.4 Product Overview")
    add_p("The Core Banking System provides a unified, secure web platform for branch operations and central banking administration. The backend is implemented as an enterprise Spring Boot application delivering high-performance REST APIs, JPA/Hibernate persistence, and strict ACID transaction management over a MySQL 8.0 InnoDB database. The frontend is built using React 19, TypeScript, and Vite, delivering role-optimized user interfaces for bank administrators, cash tellers, and compliance auditors.")

    # =========================================================================
    # 2. OVERALL DESCRIPTION
    # =========================================================================
    add_h1("2. Overall Description")

    add_h2("2.1 Product Perspective")
    add_p("Group 2 Core Banking operates as the authoritative ledger and balance-holding authority. External systems, including the Group 3 Payment Gateway (MMSPG), interface with Group 2 via REST endpoints to verify account standing and settle merchant transactions. Branch cashiers (Tellers) interact with the system at physical branches to process counter deposits and cash withdrawals, managing real-time cash drawer balances. Bank Administrators oversee system parameters, fee structures, staff profiles, and system broadcasts, while Auditors perform independent, read-only supervisory inspections over immutable audit logs and regulatory reports.")

    add_h2("2.2 Product Functions")
    add_bullet("Staff authentication, JWT stateless session management, and role-based access control (RBAC).")
    add_bullet("Staff user administration, role assignment, account deactivation, and secure password setup via email.")
    add_bullet("Customer KYC profile management for Personal, Individual, and Company entities.")
    add_bullet("Direct customer account opening (Savings, Current, Fixed Deposit, Corporate) without dual-approval bottlenecks.")
    add_bullet("Bank account status lifecycle management (ACTIVE, DORMANT, FROZEN, CLOSED) and joint-holder assignment.")
    add_bullet("Over-the-Counter (OTC) cash deposits with physical slip voucher deduplication and automated fee deduction.")
    add_bullet("Over-the-Counter (OTC) cash withdrawals with balance verification, minimum balance retention, and daily limit enforcement.")
    add_bullet("Teller cash desk management and real-time Daily Cash Summary tracking (Opening, Cash-In, Cash-Out, Net Drawer Balance).")
    add_bullet("Double-entry general ledger transaction engine enforcing exact debit and credit balance integrity.")
    add_bullet("Dynamic banking parameters management (minimum balance threshold, daily withdrawal limits) and transaction fee schedule configuration.")
    add_bullet("Bank bulletins and announcements broadcast targeting specific audiences.")
    add_bullet("External integration endpoints for Group 3 Payment Gateway (corporate account verification, merchant checkout clearing, and balance inquiry).")
    add_bullet("Immutable audit logging utilizing Spring AOP with thread-safe client IP/User-Agent extraction and automated PII masking.")
    add_bullet("Financial, compliance, and AML reporting (Daily Ledger Summary, Account Status, Audit Trail, Large Transactions, Fee Revenue, and Transaction Details) with multi-format export (Excel, PDF, CSV) and asynchronous background job execution.")

    add_h2("2.3 User Classes and Characteristics")
    table_users = doc.add_table(rows=6, cols=2)
    table_users.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_users = [Inches(2.0), Inches(4.5)]
    set_table_borders(table_users)

    table_users.rows[0].cells[0].paragraphs[0].text = "User Class / Role"
    table_users.rows[0].cells[1].paragraphs[0].text = "Description and Operational Access"
    style_table_header(table_users.rows[0], col_w_users)

    users_data = [
        ("Administrator (ADMIN)", "Full administrative control over staff user accounts, role assignments, system parameters, fee schedule configurations, bank bulletins, audit logs, and authorized financial/compliance reports."),
        ("Teller (TELLER)", "Branch cashier operations. Directly opens customer accounts, executes OTC cash deposits and withdrawals, validates physical slip voucher references, queries customer KYC details, and reviews personal daily cash summaries. Strictly restricted from accessing administrative reporting and system rule configurations."),
        ("Auditor (AUDITOR)", "Independent supervisory and compliance inspection role. Possesses read-only access to customer accounts, transaction histories, system parameters, fee structures, immutable audit logs with masked PII, and all regulatory reports."),
        ("Customer (External Stakeholder)", "End-user banking client. Interacts exclusively through the external Customer Portal or E-Commerce payment checkouts. Customer accounts have zero access to Core Banking back-office staff APIs."),
        ("Group 3 Payment Gateway (External System)", "Intermediary payment processing service. Interacts via authenticated REST APIs to perform corporate account verification and settle merchant checkouts.")
    ]
    for r_idx, (r, d) in enumerate(users_data):
        row = table_users.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = r
        row.cells[1].paragraphs[0].text = d
    style_table_cells(table_users, col_w_users)

    add_h2("2.4 Operating Environment")
    add_p("Backend: Java 21 LTS, Spring Boot 3.x / 4.x, Spring MVC, Spring Security 6, Spring Data JPA / Hibernate, HikariCP connection pool, running on Apache Tomcat. Database: MySQL 8.0+ utilizing InnoDB storage engine with strict ACID compliance. Frontend: React 19, TypeScript, Vite, Tailwind CSS, Axios, and React Router. Reporting & File Processing: Apache POI 5.2.x, JasperReports / iText, and OpenCSV. Configured application timezone: Asia/Yangon (UTC+06:30).")

    add_h2("2.5 Constraints")
    add_bullet("Held and Release operations are completely absent from the architecture; transactions and balances must never enter an intermediate held status.")
    add_bullet("Maker-Checker dual authorization is strictly excluded; operational workflows must execute directly upon authorized staff invocation.")
    add_bullet("Direct account opening must not feature any rejection state; valid submission immediately issues an active account.")
    add_bullet("Reporting subsystem access is strictly restricted to ADMIN and AUDITOR roles only; TELLER users have no access to reporting endpoints.")
    add_bullet("Financial data mutations must enforce ACID transactional integrity and row-level locking to prevent race conditions during concurrent transactions.")
    add_bullet("All sensitive Personally Identifiable Information (PII) including NRC numbers, account numbers, phone numbers, and email addresses must be masked before rendering in audit logs.")

    add_h2("2.6 Assumptions and Dependencies")
    add_bullet("Group 3 Payment Gateway services are reachable over the internal network for merchant settlement processing.")
    add_bullet("An active SMTP mail server is operational to dispatch staff onboarding and password setup links.")
    add_bullet("Branch staff access the staff operations portal via modern web browsers with TLS 1.3 encryption.")

    # =========================================================================
    # 3. STAKEHOLDERS AND USER REQUIREMENTS
    # =========================================================================
    add_h1("3. Stakeholders and User Requirements")

    add_h2("3.1 Stakeholders")
    table_stk = doc.add_table(rows=6, cols=2)
    table_stk.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_stk = [Inches(2.2), Inches(4.3)]
    set_table_borders(table_stk)

    table_stk.rows[0].cells[0].paragraphs[0].text = "Stakeholder"
    table_stk.rows[0].cells[1].paragraphs[0].text = "Responsibility / Relationship"
    style_table_header(table_stk.rows[0], col_w_stk)

    stk_data = [
        ("Bank Administrator", "Oversees staff accounts, defines global interest and fee parameters, monitors system health, broadcasts announcements, and reviews audit logs."),
        ("Branch Tellers", "Manages cash desk operations, assists walk-in customers, opens bank accounts directly, and executes counter deposits/withdrawals."),
        ("Compliance Auditor", "Performs supervisory audits, inspects tamper-evident logs, and reviews AML large transaction records."),
        ("Bank Customers (External)", "Holds deposit accounts and executes self-service transactions via external portal or merchant interfaces."),
        ("Payment Gateway Team (Group 3)", "Partners providing payment initiation, merchant authorization, and transaction settlement callbacks.")
    ]
    for r_idx, (s, r) in enumerate(stk_data):
        row = table_stk.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = s
        row.cells[1].paragraphs[0].text = r
    style_table_cells(table_stk, col_w_stk)

    add_h2("3.2 User Requirements")
    table_ur = doc.add_table(rows=6, cols=2)
    table_ur.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_ur = [Inches(1.8), Inches(4.7)]
    set_table_borders(table_ur)

    table_ur.rows[0].cells[0].paragraphs[0].text = "Requirement ID"
    table_ur.rows[0].cells[1].paragraphs[0].text = "User Requirement Description"
    style_table_header(table_ur.rows[0], col_w_ur)

    ur_data = [
        ("UR-1 - Administrator", "The Administrator shall be able to manage staff accounts and roles, configure dynamic banking parameters and fee schedules, publish bank-wide bulletins, inspect immutable audit logs, and access all operational and financial reports."),
        ("UR-2 - Teller", "The Teller shall be able to directly open customer accounts without dual approval, execute OTC deposits and withdrawals, verify voucher slip references, query customer profiles, and monitor daily personal cash drawer balances."),
        ("UR-3 - Auditor", "The Auditor shall have read-only access to inspect immutable audit logs with masked sensitive data, review AML large transaction summaries, monitor daily ledger balancing, and inspect historical transactions."),
        ("UR-4 - Customer (External)", "The Customer shall be able to view personal account balances, download account statements, and initiate peer-to-peer transfers via the external Customer Portal without accessing the Core Banking staff application."),
        ("UR-5 - Payment Gateway", "The Payment Gateway shall be able to verify corporate account validity, initiate merchant checkout debits, and obtain real-time settlement receipts via authenticated service APIs.")
    ]
    for r_idx, (uid, desc) in enumerate(ur_data):
        row = table_ur.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = uid
        row.cells[1].paragraphs[0].text = desc
    style_table_cells(table_ur, col_w_ur)

    # =========================================================================
    # 4. BUSINESS REQUIREMENTS
    # =========================================================================
    add_h1("4. Business Requirements")
    table_br = doc.add_table(rows=7, cols=2)
    table_br.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_br = [Inches(1.8), Inches(4.7)]
    set_table_borders(table_br)

    table_br.rows[0].cells[0].paragraphs[0].text = "Business Req ID"
    table_br.rows[0].cells[1].paragraphs[0].text = "Business Requirement Description"
    style_table_header(table_br.rows[0], col_w_br)

    br_data = [
        ("BR-1 - Customer & Account Governance", "Maintain centralized customer identity records (Personal, Individual, Company KYC) and bank accounts (Savings, Current, Fixed Deposit, Corporate). Support direct account creation by authorized staff, generating unique account numbers with immediate ACTIVE status upon creation."),
        ("BR-2 - Over-the-Counter Cash Operations", "Provide secure, instantaneous branch counter deposit and withdrawal processing with mandatory voucher reference deduplication, account balance validation, minimum balance retention, and automated teller drawer reconciliation."),
        ("BR-3 - Core Transaction Clearing & Ledger Integrity", "Execute all financial transactions (OTC deposits/withdrawals, P2P transfers, E-Commerce checkouts) under strict ACID compliance with automated double-entry ledger postings, ensuring total debits precisely equal total credits."),
        ("BR-4 - Parameter & Fee Administration", "Enable authorized administrative staff to dynamically configure system parameters (minimum account balances, daily transfer ceilings) and fee schedules without requiring server restarts or code redeployments."),
        ("BR-5 - Auditability & PII Protection", "Maintain a tamper-evident, append-only audit trail capturing staff identity, action type, client IP address, user-agent string, and state change differences, while masking all sensitive personally identifiable information (NRC, account number, phone, email)."),
        ("BR-6 - Regulatory & Financial Reporting", "Provide robust financial and regulatory reports (Daily Ledger Summary, Account Status, Large Transactions/AML, Fee Revenue, Transaction Details) with multi-format export capabilities (Excel, PDF, CSV) and asynchronous job processing, accessible strictly by ADMIN and AUDITOR roles.")
    ]
    for r_idx, (bid, bdesc) in enumerate(br_data):
        row = table_br.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = bid
        row.cells[1].paragraphs[0].text = bdesc
    style_table_cells(table_br, col_w_br)

    # =========================================================================
    # 5. FUNCTIONAL REQUIREMENTS
    # =========================================================================
    add_h1("5. Functional Requirements")
    add_p("The following requirements use the normative term shall to specify mandatory system behavior:")

    table_fr = doc.add_table(rows=16, cols=3)
    table_fr.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_fr = [Inches(0.9), Inches(2.0), Inches(3.6)]
    set_table_borders(table_fr)

    table_fr.rows[0].cells[0].paragraphs[0].text = "ID"
    table_fr.rows[0].cells[1].paragraphs[0].text = "Requirement Title"
    table_fr.rows[0].cells[2].paragraphs[0].text = "Normative Functional Description"
    style_table_header(table_fr.rows[0], col_w_fr)

    fr_data = [
        ("FR-1", "Staff Authentication & RBAC", "The system shall authenticate staff users via stateless JWT sessions, hash passwords using BCrypt, terminate sessions after 15 minutes of inactivity, and enforce endpoint authorization strictly restricted to ADMIN, TELLER, and AUDITOR roles."),
        ("FR-2", "Staff User Administration", "The system shall allow ADMIN users to create staff accounts, assign operational roles, deactivate profiles, and dispatch secure, single-use password setup links via email."),
        ("FR-3", "Customer Profile & KYC Management", "The system shall maintain comprehensive customer KYC profiles across Personal, Individual, and Company types, allowing authorized staff to record identity details, update contact records, and attach KYC documentation."),
        ("FR-4", "Direct Account Creation", "The system shall allow authorized staff (TELLER or ADMIN) to directly open customer accounts (Savings, Current, Fixed Deposit, Corporate) upon KYC validation. The system shall automatically generate a unique 10-digit account number and set the initial account status directly to ACTIVE. No maker-checker queue or approval delay shall exist, and no rejection state shall be present."),
        ("FR-5", "Account Lifecycle & Joint Holders", "The system shall allow authorized staff to update account statuses across ACTIVE, DORMANT, FROZEN, and CLOSED. Accounts in FROZEN, DORMANT, or CLOSED states shall be blocked from debit operations. The system shall support associating joint account holders."),
        ("FR-6", "OTC Cash Deposit", "The system shall allow TELLER users to execute counter cash deposits by specifying account number, deposit amount, and physical voucher slip reference. The system shall verify account active standing, validate slip uniqueness, compute applicable deposit fees, credit the customer balance, record double-entry ledger entries, and increment the teller cash drawer balance."),
        ("FR-7", "OTC Cash Withdrawal", "The system shall allow TELLER users to process counter cash withdrawals after verifying account standing, ensuring the remaining balance meets the configured minimum balance threshold, validating that cumulative withdrawals do not exceed the daily limit, debiting the customer balance, recording double-entry ledger entries, and decrementing the teller cash drawer balance."),
        ("FR-8", "Teller Daily Cash Summary", "The system shall compute real-time cash drawer metrics for the authenticated TELLER, including opening cash balance, total cash deposited (cash-in), total cash withdrawn (cash-out), and net drawer cash balance for the active business date."),
        ("FR-9", "System Parameters Configuration", "The system shall allow ADMIN users to view and update system parameters, including minimum account balance thresholds, daily transfer limits, and transaction thresholds, taking immediate effect across all channels."),
        ("FR-10", "Fee Schedule Management", "The system shall allow ADMIN users to configure flat and percentage-based fee schedules per transaction type (OTC_DEPOSIT, OTC_WITHDRAWAL, P2P_TRANSFER, ECOMMERCE_PAYMENT) and dynamically activate or deactivate fee schedules."),
        ("FR-11", "Announcements & Bulletins", "The system shall allow ADMIN users to create, update, and broadcast bank bulletins targeting specific audiences (ALL, STAFF, CUSTOMER) with configurable priority levels."),
        ("FR-12", "Gateway Account Verification", "The system shall expose authenticated REST endpoints for the Group 3 Payment Gateway to verify the existence, corporate ownership, and active operational status of bank accounts."),
        ("FR-13", "E-Commerce Payment Clearing", "The system shall process merchant payment checkouts initiated via Group 3 or external e-commerce platforms. Requests must include an Idempotency-Key header to prevent duplicate debiting, verify customer balance, post double-entry ledger transfers, and return a signed receipt."),
        ("FR-14", "Audit Trail Logging & PII Masking", "The system shall automatically intercept annotated operations via Spring AOP to record immutable audit log entries capturing staff ID, action type, entity identifier, client IP address, user-agent string, and JSON state diffs. All sensitive PII (NRC, account number, phone, email) shall be permanently masked prior to storage and display."),
        ("FR-15", "Financial & Regulatory Reporting", "The system shall generate 6 core reports: Daily Ledger Summary, Account Status Summary, Audit Trail Logs, Large Transactions & AML, Fee Revenue Breakdown, and Transaction Details. Access to all reporting endpoints and exports shall be strictly restricted to ADMIN and AUDITOR roles. Multi-format export (Excel, PDF, CSV) and asynchronous job execution shall be supported.")
    ]
    for r_idx, (fid, ftitle, fdesc) in enumerate(fr_data):
        row = table_fr.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = fid
        row.cells[1].paragraphs[0].text = ftitle
        row.cells[2].paragraphs[0].text = fdesc
    style_table_cells(table_fr, col_w_fr)

    # =========================================================================
    # 6. NON-FUNCTIONAL REQUIREMENTS
    # =========================================================================
    add_h1("6. Non-Functional Requirements")

    table_nfr = doc.add_table(rows=9, cols=3)
    table_nfr.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_nfr = [Inches(0.9), Inches(1.8), Inches(3.8)]
    set_table_borders(table_nfr)

    table_nfr.rows[0].cells[0].paragraphs[0].text = "ID"
    table_nfr.rows[0].cells[1].paragraphs[0].text = "Category"
    table_nfr.rows[0].cells[2].paragraphs[0].text = "Requirement / Implementation Baseline"
    style_table_header(table_nfr.rows[0], col_w_nfr)

    nfr_data = [
        ("NFR-1", "Scalability", "The system architecture is engineered to support 100,000+ accounts and high-volume transaction throughput using HikariCP connection pooling, indexed database schemas, and stateless Spring Boot services."),
        ("NFR-2", "Performance", "Core transactional operations (OTC deposit, OTC withdrawal, balance inquiry) shall complete within 500 milliseconds under nominal load. Dynamic criteria searches on transaction logs shall return within 1.5 seconds."),
        ("NFR-3", "Security", "Staff authentication shall enforce BCrypt password hashing (work factor 10) and stateless HMAC-SHA256 JWT tokens. REST endpoints shall enforce role-based access control via @PreAuthorize annotations. API integration with Group 3 shall be secured via internal shared secret headers."),
        ("NFR-4", "ACID Ledger Integrity", "Financial operations shall execute within atomic database transactions (@Transactional). Double-entry bookkeeping must strictly satisfy sum(Debits) = sum(Credits). Concurrent transactions on identical accounts shall use pessimistic row-level locking to prevent race conditions."),
        ("NFR-5", "Availability", "The core backend is designed for continuous operational readiness targeting 99.9% uptime during standard branch operating hours."),
        ("NFR-6", "Usability", "The administrative React frontend shall present clean, accessible interfaces with clear validation feedback, responsive tables, real-time cash desk indicators, and ergonomic data filtering."),
        ("NFR-7", "Auditability", "All state-modifying actions performed by staff must produce an immutable audit log record. Audit log records cannot be updated or deleted by any system user or role."),
        ("NFR-8", "Data Privacy (PII)", "Customer personal identifiers (NRC, account numbers, contact details) must be masked in audit views and administrative display tables to protect customer privacy and comply with financial data protection standards.")
    ]
    for r_idx, (nid, ncat, ndesc) in enumerate(nfr_data):
        row = table_nfr.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = nid
        row.cells[1].paragraphs[0].text = ncat
        row.cells[2].paragraphs[0].text = ndesc
    style_table_cells(table_nfr, col_w_nfr)

    # =========================================================================
    # 7. EXTERNAL INTERFACE REQUIREMENTS
    # =========================================================================
    add_h1("7. External Interface Requirements")

    add_h2("7.1 User Interface")
    add_p("The system provides a responsive web application built with React 19, TypeScript, and Tailwind CSS. The interface provides role-segmented navigation, ensuring staff only access authorized views: Admin Dashboard, Staff Management, Customer KYC, Account Opening, Announcements, and System Rules for ADMIN; Teller Dashboard, OTC Cash Desk, Customer Inquiries, and Account Management for TELLER; and Audit Logs, Reports, and Supervisory Views for AUDITOR. Teller users are prevented from navigating to or accessing any reporting screens.")

    add_h2("7.2 Software and Integration Interfaces")
    table_if = doc.add_table(rows=4, cols=2)
    table_if.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_if = [Inches(2.2), Inches(4.3)]
    set_table_borders(table_if)

    table_if.rows[0].cells[0].paragraphs[0].text = "Interface"
    table_if.rows[0].cells[1].paragraphs[0].text = "Responsibility and Data Exchanged"
    style_table_header(table_if.rows[0], col_w_if)

    if_data = [
        ("Group 3 Payment Gateway (MMSPG)", "REST interface exchanging JSON payloads secured by shared secret headers. Capabilities include Corporate Account Verification (/api/v1/payments/gateway/verify-corporate-account) and Merchant Payment Checkout (/api/customer/merchant-payment/authorize)."),
        ("E-Commerce Platform Checkout", "Direct checkout settlement endpoint (/api/v1/payments/ecommerce/checkout) accepting customer account credentials, order amounts, and mandatory Idempotency-Key headers to guarantee single-execution settlement."),
        ("SMTP Notification Service", "Standard SMTP transport interfacing with mail servers to deliver staff password onboarding links and administrative alerts.")
    ]
    for r_idx, (iname, idesc) in enumerate(if_data):
        row = table_if.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = iname
        row.cells[1].paragraphs[0].text = idesc
    style_table_cells(table_if, col_w_if)

    add_h2("7.3 Database Interface")
    add_p("The backend connects to MySQL 8.0+ via the HikariCP connection pool. Entities are managed via Spring Data JPA and Hibernate ORM. Double-entry general ledger transactions, account status transitions, and audit trails utilize dedicated InnoDB tables with foreign key constraints, composite indexes, and row-level locking.")

    # =========================================================================
    # 8. BUSINESS RULES
    # =========================================================================
    add_h1("8. Business Rules")
    table_brl = doc.add_table(rows=11, cols=2)
    table_brl.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_brl = [Inches(1.2), Inches(5.3)]
    set_table_borders(table_brl)

    table_brl.rows[0].cells[0].paragraphs[0].text = "Rule ID"
    table_brl.rows[0].cells[1].paragraphs[0].text = "Business Rule Specification"
    style_table_header(table_brl.rows[0], col_w_brl)

    brl_data = [
        ("BRL-01", "Role-Based Access Control: Back-office functions and API endpoints are strictly restricted based on authenticated staff roles. Tellers cannot configure system rules or access reports; Auditors have read-only access and cannot post transactions; Admins cannot perform counter cash operations."),
        ("BRL-02", "Direct Account Creation: Bank accounts shall be created directly by authorized staff (Teller or Admin) upon KYC verification. No secondary authorization, maker-checker queue, or dual sign-off is required. Accounts are activated immediately with ACTIVE status upon creation."),
        ("BRL-03", "Exclusion of Held and Release Functions: The system shall not support account or transaction hold and release functions. Financial transactions must execute to immediate finality, resolving directly to SUCCESS or FAILED."),
        ("BRL-04", "Voucher Slip Reference Uniqueness: Over-the-counter cash deposits and withdrawals require a physical voucher slip reference identifier. The system shall reject any counter transaction where the provided slip reference already exists in the system, preventing duplicate cash postings."),
        ("BRL-05", "Minimum Balance Protection: Any withdrawal, transfer, or debit operation that would cause an account's available balance to fall below the configured system minimum balance threshold shall be rejected immediately with an INSUFFICIENT_FUNDS error."),
        ("BRL-06", "Daily Withdrawal Limits: Cumulative cash withdrawals and outbound transfers initiated on an account within a 24-hour cycle must not exceed the system-configured daily withdrawal limit."),
        ("BRL-07", "Balanced Double-Entry Bookkeeping: Every financial event must record corresponding debit and credit ledger entries. The mathematical sum of all debits must equal the sum of all credits for every posted transaction."),
        ("BRL-08", "Account Operational Status Integrity: Accounts flagged as FROZEN, DORMANT, or CLOSED are strictly prohibited from originating outbound debit transactions or cash withdrawals."),
        ("BRL-09", "Audit Record Immutability: Records inserted into the audit_logs table are permanently append-only (insertable=true, updatable=false). SQL UPDATE and DELETE operations on audit records are strictly prohibited at both JPA and database level."),
        ("BRL-10", "Report Authorization Isolation: All business, compliance, and financial reporting endpoints and export facilities are strictly restricted to ADMIN and AUDITOR roles. TELLER accounts are prohibited from requesting or downloading reports.")
    ]
    for r_idx, (bid, bdesc) in enumerate(brl_data):
        row = table_brl.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = bid
        row.cells[1].paragraphs[0].text = bdesc
    style_table_cells(table_brl, col_w_brl)

    # =========================================================================
    # 9. MAIN SYSTEM FLOW
    # =========================================================================
    add_h1("9. Main System Flow")

    add_h2("9.1 Direct Customer Account Creation Flow")
    add_p("The account creation workflow operates with direct execution, entirely free of maker-checker queues or rejection states:")
    add_bullet("1. Authorized staff (Teller or Admin) accesses the Account Creation interface in the staff portal.")
    add_bullet("2. Staff enters customer KYC details (or selects an existing verified customer code) and specifies account parameters (Account Type: Savings, Current, Fixed Deposit, Corporate; Currency; Initial Deposit).")
    add_bullet("3. System validates input constraints, ensures customer identity validity, and verifies initial deposit requirements.")
    add_bullet("4. Upon clicking Create Account, the system generates a unique 10-digit account number, posts the initial deposit entry if applicable, and sets the account status directly to ACTIVE.")
    add_bullet("5. The system displays the generated account details and issues a creation confirmation. The account is immediately ready for banking operations.")

    add_h2("9.2 Over-The-Counter (OTC) Cash Deposit Flow")
    add_bullet("1. Customer approaches branch counter with physical cash and deposit voucher slip.")
    add_bullet("2. Teller enters target account number, deposit amount, and unique voucher slip reference into the OTC counter terminal.")
    add_bullet("3. System verifies account existence, confirms account status is ACTIVE, and checks that the voucher slip reference is not duplicate.")
    add_bullet("4. System dynamically calculates applicable deposit fee from active FeeSchedules.")
    add_bullet("5. System executes atomic transaction: credits customer ledger balance, debits branch cash vault, and increments the Teller's personal daily cash drawer balance.")
    add_bullet("6. System outputs digital receipt and returns status SUCCESS.")

    add_h2("9.3 Over-The-Counter (OTC) Cash Withdrawal Flow")
    add_bullet("1. Customer presents withdrawal slip and identification at the branch counter.")
    add_bullet("2. Teller enters account number, requested withdrawal amount, and voucher reference.")
    add_bullet("3. System confirms account is ACTIVE and verifies that the remaining balance after deducting requested amount and withdrawal fee satisfies the configured Minimum Balance threshold.")
    add_bullet("4. System checks today's cumulative withdrawals against the configured Daily Withdrawal Limit.")
    add_bullet("5. System checks that the voucher reference has not been previously used.")
    add_bullet("6. System executes atomic transaction: debits customer account balance, credits cash vault, and decrements the Teller's daily cash drawer balance.")
    add_bullet("7. System dispenses transaction confirmation and returns status SUCCESS.")

    add_h2("9.4 E-Commerce / Payment Gateway Settlement Flow")
    add_bullet("1. External customer initiates checkout on merchant site integrated with Group 3 Payment Gateway.")
    add_bullet("2. Gateway verifies corporate merchant account standing with Core Banking via /api/v1/payments/gateway/verify-corporate-account.")
    add_bullet("3. Payment request is dispatched to /api/v1/payments/ecommerce/checkout containing customer account ID, total amount, and unique Idempotency-Key.")
    add_bullet("4. System checks customer available balance and ensures idempotency key has not been processed.")
    add_bullet("5. System executes atomic ledger transfer: debits customer account, credits merchant corporate account, and records transaction state as SUCCESS.")
    add_bullet("6. System returns digital receipt and confirmation payload to the Payment Gateway.")

    add_h2("9.5 Account Status State Model")
    add_p("Bank account states are governed by a deterministic state model: ACTIVE, DORMANT, FROZEN, and CLOSED. Newly created accounts enter ACTIVE status immediately. Accounts may be set to FROZEN upon administrative instruction or suspicious flag, blocking all outbound debits while allowing inbound credits. Inactive accounts transition to DORMANT. Accounts resolved for termination transition to CLOSED status, terminating all future operations permanently.")

    add_h2("9.6 Transaction Lifecycle State Model")
    add_p("All financial transactions follow a direct execution lifecycle: INITIATED -> SUCCESS or FAILED. There are no intermediate HELD or PENDING_AUTHORIZATION statuses. If balance, limit, or parameter checks fail, the transaction transitions immediately to FAILED. If checks pass, ledger entries are committed atomically and the transaction transitions directly to SUCCESS.")

    # =========================================================================
    # 10. DATA AND REPORTING REQUIREMENTS
    # =========================================================================
    add_h1("10. Data and Reporting Requirements")

    add_h2("10.1 Core Operational Data Entities")
    add_bullet("Staff Entities: StaffUsers, Roles, Permissions, RolePermissions, StaffUserRoles, StaffPasswordSetupToken.")
    add_bullet("Customer Entities: Customers, PersonalInfo, CompanyInfo, CompanyContactPersons, CustomerCredentials.")
    add_bullet("Account Entities: Accounts, AccountSignatories, AccountStatusHistory, AccountTransferLimits.")
    add_bullet("Ledger & Transaction Entities: BankTransactions, LedgerAccounts, LedgerEntries, FeeSchedules, SystemParameters.")
    add_bullet("Audit Entities: AuditLogs (immutable with masked PII), LoginAttempt, AuthSession, JwtRevokedTokens.")
    add_bullet("Communication Entities: Announcements, AnnouncementReadStatus, Notifications.")

    add_h2("10.2 Enterprise Reporting Subsystem")
    add_p("All reports in the Group 2 Core Banking System are strictly restricted to ADMIN and AUDITOR roles. TELLER users have no access to reporting endpoints or file exports.")

    table_rpt = doc.add_table(rows=7, cols=3)
    table_rpt.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_rpt = [Inches(1.8), Inches(3.2), Inches(1.5)]
    set_table_borders(table_rpt)

    table_rpt.rows[0].cells[0].paragraphs[0].text = "Report Name"
    table_rpt.rows[0].cells[1].paragraphs[0].text = "Description and Search Parameters"
    table_rpt.rows[0].cells[2].paragraphs[0].text = "Access & Formats"
    style_table_header(table_rpt.rows[0], col_w_rpt)

    rpt_data = [
        ("Daily Ledger Summary", "Summarizes total debits, credits, and net variance across general ledger accounts for a specified date range.", "ADMIN, AUDITOR\nPDF, Excel, CSV"),
        ("Account Status Summary", "Categorizes total accounts, opening rates, and balance distributions across ACTIVE, DORMANT, FROZEN, and CLOSED states.", "ADMIN, AUDITOR\nPDF, Excel, CSV"),
        ("Audit Trail Logs", "Chronological audit logs of administrative actions with client IP, action type, staff ID, and masked PII.", "ADMIN, AUDITOR\nPDF, Excel, CSV"),
        ("Large Transactions & AML", "Flags transactions exceeding regulatory thresholds (e.g. > 10,000,000 MMK) for anti-money laundering compliance review.", "ADMIN, AUDITOR\nPDF, Excel, CSV"),
        ("Fee & Revenue Breakdown", "Analyzes bank fee revenues generated across counter operations, transfers, and merchant payment processing.", "ADMIN, AUDITOR\nPDF, Excel, CSV"),
        ("Transaction Detail Report", "Granular transaction records filterable by date range, channel, transaction type, status, and amount range. Supports Async background export jobs.", "ADMIN, AUDITOR\nPDF, Excel, CSV")
    ]
    for r_idx, (rname, rdesc, racc) in enumerate(rpt_data):
        row = table_rpt.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = rname
        row.cells[1].paragraphs[0].text = rdesc
        row.cells[2].paragraphs[0].text = racc
    style_table_cells(table_rpt, col_w_rpt)

    # =========================================================================
    # 11. TECHNOLOGY AND UI/UX REQUIREMENTS
    # =========================================================================
    add_h1("11. Technology and UI/UX Requirements")

    table_tech = doc.add_table(rows=8, cols=2)
    table_tech.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_tech = [Inches(2.2), Inches(4.3)]
    set_table_borders(table_tech)

    table_tech.rows[0].cells[0].paragraphs[0].text = "Layer / Subsystem"
    table_tech.rows[0].cells[1].paragraphs[0].text = "Technology Stack & Frameworks"
    style_table_header(table_tech.rows[0], col_w_tech)

    tech_data = [
        ("Frontend Web Portal", "React 19, TypeScript, Vite, Tailwind CSS, Axios, Lucide React icons."),
        ("Backend Framework", "Java 21 LTS, Spring Boot 3.x / 4.x, Spring MVC, Spring Security 6, Spring Data JPA / Hibernate."),
        ("Database Engine", "MySQL 8.0+ Community Server with InnoDB storage engine."),
        ("Connection Pool & Server", "HikariCP connection pool running on embedded Apache Tomcat."),
        ("Reporting & File Generation", "Apache POI 5.2.x (Excel), JasperReports / iText (PDF), OpenCSV (CSV)."),
        ("Security & Cryptography", "Stateless JWT (HMAC-SHA256), BCrypt password hashing, SHA-256 idempotency validation."),
        ("Audit Logging Engine", "Spring AOP interceptor (@Auditable), ThreadLocal client context extractor, DataMaskingUtil.")
    ]
    for r_idx, (tlayer, tstack) in enumerate(tech_data):
        row = table_tech.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = tlayer
        row.cells[1].paragraphs[0].text = tstack
    style_table_cells(table_tech, col_w_tech)

    add_h2("11.1 Security Architecture Constraints")
    add_p("Stateless token authentication is enforced across all endpoints. Passwords must satisfy complexity rules (minimum 8 characters, alphanumeric with special symbols) and be hashed using BCrypt. Role-based method security (@PreAuthorize) verifies role permissions prior to controller method invocation. API keys and sensitive secrets are loaded exclusively via external operating system environment variables or .env configurations.")

    add_h2("11.2 UI/UX Requirements")
    add_bullet("Responsive navigation sidebar reflecting only screens authorized for the active user's assigned role.")
    add_bullet("Direct account creation interface providing intuitive field validation without approval queue complexity.")
    add_bullet("Ergonomic OTC cash terminal with instant slip reference deduplication feedback and real-time cash drawer status cards.")
    add_bullet("High-performance reporting screens with date-range pickers, dynamic data tables, and one-click multi-format export buttons (Excel, PDF, CSV) restricted strictly to Admin and Auditor.")

    # =========================================================================
    # 12. TIMELINE AND SUCCESS METRICS
    # =========================================================================
    add_h1("12. Timeline and Success Metrics")

    table_time = doc.add_table(rows=5, cols=2)
    table_time.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_time = [Inches(3.0), Inches(3.5)]
    set_table_borders(table_time)

    table_time.rows[0].cells[0].paragraphs[0].text = "Project Phase"
    table_time.rows[0].cells[1].paragraphs[0].text = "Duration / Milestone Target"
    style_table_header(table_time.rows[0], col_w_time)

    time_data = [
        ("Requirements Analysis & Scope Freezing", "2 Weeks (Completed)"),
        ("Architecture Design & Prototype Development", "3 Weeks (Completed)"),
        ("Core Implementation & Integration Testing", "8 Weeks (Completed)"),
        ("Security Audit, Compliance Verification & Defense", "2 Weeks (Current Phase)")
    ]
    for r_idx, (pname, pdur) in enumerate(time_data):
        row = table_time.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = pname
        row.cells[1].paragraphs[0].text = pdur
    style_table_cells(table_time, col_w_time)

    add_h2("12.1 Success Metrics")
    add_bullet("Ledger Balance Accuracy: 100% mathematical precision across all double-entry debit and credit ledger postings.")
    add_bullet("Transaction Finality: Instantaneous transaction resolution to SUCCESS or FAILED with zero held-state latency.")
    add_bullet("Security Compliance: 100% role-based access control compliance with zero privilege escalation vulnerabilities.")
    add_bullet("Audit Completeness: Complete capture of all administrative state mutations with verified PII masking.")

    # =========================================================================
    # 13. REQUIREMENT TRACEABILITY
    # =========================================================================
    add_h1("13. Requirement Traceability")

    table_trc = doc.add_table(rows=7, cols=3)
    table_trc.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_trc = [Inches(2.0), Inches(1.5), Inches(3.0)]
    set_table_borders(table_trc)

    table_trc.rows[0].cells[0].paragraphs[0].text = "Business Requirement"
    table_trc.rows[0].cells[1].paragraphs[0].text = "User Req"
    table_trc.rows[0].cells[2].paragraphs[0].text = "Functional Requirements"
    style_table_header(table_trc.rows[0], col_w_trc)

    trc_data = [
        ("BR-1 Customer & Account Governance", "UR-1, UR-2", "FR-3, FR-4, FR-5"),
        ("BR-2 OTC Cash Operations", "UR-2", "FR-6, FR-7, FR-8"),
        ("BR-3 Ledger Integrity & Clearing", "UR-2, UR-5", "FR-6, FR-7, FR-12, FR-13"),
        ("BR-4 Parameter & Fee Administration", "UR-1", "FR-9, FR-10"),
        ("BR-5 Auditability & PII Protection", "UR-1, UR-3", "FR-1, FR-14; NFR-7, NFR-8"),
        ("BR-6 Financial & Regulatory Reporting", "UR-1, UR-3", "FR-15; NFR-1, NFR-2")
    ]
    for r_idx, (br, ur, fr) in enumerate(trc_data):
        row = table_trc.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = br
        row.cells[1].paragraphs[0].text = ur
        row.cells[2].paragraphs[0].text = fr
    style_table_cells(table_trc, col_w_trc)

    # =========================================================================
    # 14. APPENDIX: DEFENSE QUICK REFERENCE
    # =========================================================================
    add_h1("14. Appendix: Defense Quick Reference")

    add_h2("14.1 Banking Terminology and Definitions")
    table_term = doc.add_table(rows=7, cols=2)
    table_term.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_term = [Inches(2.0), Inches(4.5)]
    set_table_borders(table_term)

    table_term.rows[0].cells[0].paragraphs[0].text = "Term / Acronym"
    table_term.rows[0].cells[1].paragraphs[0].text = "Formal Banking Definition"
    style_table_header(table_term.rows[0], col_w_term)

    terms_data = [
        ("Core Banking", "The centralized backend system responsible for hosting accounts, computing balances, recording double-entry ledgers, and processing transactions."),
        ("Double-Entry Bookkeeping", "Accounting standard where every transaction requires equal and offsetting debit and credit entries, preserving the fundamental accounting equation."),
        ("Over-The-Counter (OTC)", "Physical in-branch counter transactions processed by a cashier/teller directly with a walk-in customer."),
        ("PII Masking", "Sanitization technique redacting sensitive Personally Identifiable Information (NRC, account numbers, emails) to prevent unauthorized inspection in audit logs."),
        ("Voucher Slip Reference", "Unique paper or electronic counter voucher number input during OTC operations to guarantee slip deduplication."),
        ("Idempotency", "Property of an API endpoint ensuring identical repeated requests produce the exact same outcome without duplicate financial posting.")
    ]
    for r_idx, (tname, tdef) in enumerate(terms_data):
        row = table_term.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = tname
        row.cells[1].paragraphs[0].text = tdef
    style_table_cells(table_term, col_w_term)

    add_h2("14.2 Explicit Out-of-Scope Items")
    add_bullet("Account and Transaction Held / Release Functions: Neither accounts nor transactions support being placed on hold or released. All transactions resolve directly to SUCCESS or FAILED.")
    add_bullet("Maker-Checker Dual Authorization: Maker-checker workflows are completely excluded across all system operations, including account creation and transaction posting.")
    add_bullet("Rejection Workflow on Account Creation: Valid account submissions are directly created and activated without approval delays or rejection states.")
    add_bullet("Teller Reporting Access: Tellers have zero access to reporting features; reporting is strictly restricted to ADMIN and AUDITOR roles.")
    add_bullet("Direct ATM Hardware Switching: ISO 8583 hardware interfaces and ATM controller integration are outside project scope.")
    add_bullet("Live Central Bank RTGS/CBM-NET: National interbank clearing is modeled via Group 3 Payment Gateway endpoints rather than direct hardware connections.")
    add_bullet("Direct SMS Gateway Dispatch: Telecommunication SMS gateway delivery is not implemented; notices are rendered in-app.")

    add_h2("14.3 Document Control and Sign-off")
    table_sign = doc.add_table(rows=3, cols=4)
    table_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_sign = [Inches(1.5), Inches(2.2), Inches(1.5), Inches(1.3)]
    set_table_borders(table_sign)

    table_sign.rows[0].cells[0].paragraphs[0].text = "Role"
    table_sign.rows[0].cells[1].paragraphs[0].text = "Name / Group"
    table_sign.rows[0].cells[2].paragraphs[0].text = "Signature"
    table_sign.rows[0].cells[3].paragraphs[0].text = "Date"
    style_table_header(table_sign.rows[0], col_w_sign)

    sign_data = [
        ("Prepared By", "Group 2 - Core Banking Development Team", "[Signed]", "2026-Nov-09"),
        ("Reviewed & Evaluated By", "Daw Khin Khin Saw", "[Pending Defense]", "2026-Nov")
    ]
    for r_idx, srow in enumerate(sign_data):
        row = table_sign.rows[r_idx + 1]
        for c_idx, val in enumerate(srow):
            row.cells[c_idx].paragraphs[0].text = val
    style_table_cells(table_sign, col_w_sign)

    # Save document
    doc.save(output_path)
    print(f"Document successfully created and saved to: {output_path}")

if __name__ == "__main__":
    downloads_dir = os.path.join(os.environ['USERPROFILE'], 'Downloads')
    target_file = os.path.join(downloads_dir, "G2 SRS.docx")
    build_srs_doc(target_file)
    
    # Also save a copy in the workspace root
    workspace_copy = os.path.join(os.getcwd(), "G2 SRS.docx")
    build_srs_doc(workspace_copy)
