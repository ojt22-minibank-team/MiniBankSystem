# -*- coding: utf-8 -*-
"""
Script to generate D-SRS.docx:
Revised Software Requirements Specification (SRS) for Group 2 Core Banking System,
updated according to all feedback, removing Held/Release, Four-Eyes, Maker-Checker/Approval queues,
suspicious transaction flagging, and incorporating OTC pre-transaction account verification,
Deposit Slip IDs, and refined business rules.
"""

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

def build_d_srs(output_path):
    doc = Document()

    # Page setup: Standard A4 / Letter with 1-inch margins
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
        hrun = hp.add_run("Group 2 - Core Banking Backend & Staff Operations Portal SRS")
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(156, 163, 175)
        hrun.font.name = "Calibri"

        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Mini Online Banking System - Core Banking Specification (D-SRS)")
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(156, 163, 175)
        frun.font.name = "Calibri"

    # Color definitions
    NAVY = RGBColor(27, 54, 93)      # #1B365D
    SLATE = RGBColor(71, 85, 105)    # #475569
    DARK = RGBColor(31, 41, 55)      # #1F2937

    # Helper: Add Headings with exact styling
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(15)
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
        run.font.size = Pt(12)
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
    p_inst = doc.add_paragraph()
    p_inst.paragraph_format.space_before = Pt(28)
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
    r_sub = p_sub.add_run("— Professional Development Center —")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = SLATE

    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(10)
    p_pre.paragraph_format.space_after = Pt(8)
    p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_pre = p_pre.add_run("SOFTWARE REQUIREMENTS SPECIFICATION")
    r_pre.font.name = "Calibri"
    r_pre.font.size = Pt(15)
    r_pre.font.bold = True
    r_pre.font.color.rgb = NAVY

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("MINI ONLINE BANKING SYSTEM")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = NAVY

    p_subtitle = doc.add_paragraph()
    p_subtitle.paragraph_format.space_before = Pt(0)
    p_subtitle.paragraph_format.space_after = Pt(32)
    p_subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_subtitle = p_subtitle.add_run("Core Banking Backend & Staff Operations Portal (D-SRS)")
    r_subtitle.font.name = "Calibri"
    r_subtitle.font.size = Pt(13)
    r_subtitle.font.color.rgb = SLATE

    meta_items = [
        ("Project Group: ", "Group 2"),
        ("Course: ", "Software Engineering"),
        ("Academic Year: ", "2026"),
        ("Document Version: ", "2.0"),
        ("Document Status: ", "Final Baseline Draft"),
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
    p_space.paragraph_format.space_before = Pt(26)

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
    p_team.paragraph_format.space_after = Pt(4)
    p_team.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_team = p_team.add_run("Group 2 – Core Banking Development Team")
    r_team.font.size = Pt(10.5)
    r_team.font.color.rgb = DARK

    p_members = doc.add_paragraph()
    p_members.paragraph_format.space_before = Pt(0)
    p_members.paragraph_format.space_after = Pt(20)
    p_members.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_members = p_members.add_run("Team members - Swan Yee Khant, Ye Lin, Zin Min Htet, Htun Hla, Khin Zar Chi Thein")
    r_members.font.size = Pt(9.5)
    r_members.font.color.rgb = DARK

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
    p_teacher.paragraph_format.space_after = Pt(22)
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
    table_ctrl = doc.add_table(rows=8, cols=2)
    table_ctrl.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_ctrl = [Inches(2.2), Inches(4.3)]
    set_table_borders(table_ctrl)

    ctrl_data = [
        ("Document Title", "Software Requirements Specification (D-SRS)"),
        ("Project", "Mini Online Banking System – Core Banking Backend & Staff Operations Portal"),
        ("Project Group", "Group 2"),
        ("Document Version", "2.0"),
        ("Document Status", "Final Baseline Draft"),
        ("Prepared By", "Group 2 – Core Banking Development Team"),
        ("Reviewed By", "Group 1, 3, 4, 5"),
        ("Approved By", "Daw Khin Khin Saw")
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
        ("0.1", "2026-sept-01", "Initial requirements draft.", "Group 2"),
        ("0.2", "2026-sept-02", "Requirements reviewed and updated.", "Group 2"),
        ("1.0", "2026-sept-03", "Teacher review submission draft.", "Group 2"),
        ("2.0", "2026-Nov-09", "Final post-implementation baseline (D-SRS): completely removed Held and Release functions, eliminated Maker-Checker and supervisor approval workflows, established direct account creation without rejection state, removed Four-Eyes overrides and suspicious transaction flagging, added mandatory pre-transaction account verification for OTC operations with deposit slip IDs and audit notes, updated numbered Business Rules, Double-Entry Failure Rollbacks, quantifiable NFRs, and 99.9% availability SLA.", "Group 2")
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
    set_table_borders(table_toc, val="none")

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
    add_p("This Software Requirements Specification (SRS) defines the business, user, functional, non-functional, integration, data, and operational requirements for the Group 2 Core Banking Backend & Staff Operations Portal of the Mini Online Banking System. The document establishes a common reference for development, testing, review, and project evaluation.")

    add_h2("1.2 Scope")
    add_p("The system is a centralized web-based core banking platform used to manage customer profiles, KYC credentials, direct account lifecycles, over-the-counter (OTC) cash deposits and withdrawals, double-entry financial ledgers, anti-fraud account freezes, system rules, dynamic fee schedules, and immutable audit trails. It serves Bank Tellers, System Administrators, and Compliance Auditors, while integrating with the customer-facing online banking portal (Group 1) and merchant payment gateway services (Group 3).")
    add_p("Crucial Scope Clarifications:")
    add_bullet("Held and Release functions are strictly excluded from the operational scope. The system does not support placing accounts or transactions on temporary hold or executing subsequent release operations. All transactions resolve directly into final completed or failed states.")
    add_bullet("Maker-Checker dual authorization and supervisor approval queues are completely excluded. Account creation is executed directly by authorized branch staff (Teller or Admin) upon KYC validation without requiring dual sign-offs or verification delays.")
    add_bullet("Account creation does not include a rejection workflow. Upon complete KYC validation and required data entry by authorized staff, the account is directly generated and transitioned immediately into an ACTIVE operational status.")
    add_bullet("Direct customer online banking interactions are serviced via the external Customer Portal (Group 1). Financial payment settlement requests from external merchants and platforms are routed through the Group 3 Payment Gateway (MMSPG) via authenticated REST APIs.")

    add_h2("1.3 Intended Audience")
    add_p("This document is intended for the project team, teachers/reviewers, system developers, testers, administrators, operational staff, and other stakeholders involved in the system.")

    add_h2("1.4 Product Overview")
    add_p("The core banking backend provides an authoritative operational environment for direct account opening, teller counter cash operations, account verification, ledger balance enforcement, and regulatory compliance reporting. Its stated purpose is to centralize back-office banking operations, guarantee mathematical ledger integrity, and protect against financial fraud through immediate defensive account freeze capabilities.")

    # =========================================================================
    # 2. OVERALL DESCRIPTION
    # =========================================================================
    add_h1("2. Overall Description")

    add_h2("2.1 Product Perspective")
    add_p("The core banking system operates as the central administrative and financial hub of the wider banking ecosystem. Customer account opening requests and P2P transfers originate in the Customer Portal (Group 1), while e-commerce payments are routed through the Payment Gateway (Group 3). Group 2 validates customer balances, enforces account freeze states, executes double-entry ledger postings, and immutably logs all transactions.")

    add_h2("2.2 Product Functions")
    add_bullet("Staff authentication, multi-factor authentication (OTP), and role-based access control (RBAC).")
    add_bullet("Staff account onboarding, role assignment, and session revocation.")
    add_bullet("Customer profile creation and KYC document verification across Personal, Individual, and Company entities.")
    add_bullet("Direct customer account opening (Savings, Current, Fixed Deposit, Corporate) without dual-approval bottlenecks.")
    add_bullet("Account lifecycle management and status transitions (Active, Frozen, Suspended/Dormant, Closed).")
    add_bullet("Defensive account freeze engine halting outgoing transfers immediately upon fraud detection.")
    add_bullet("Over-the-counter (OTC) cash deposits with mandatory pre-transaction account verification, deposit slip IDs, and operator audit notes.")
    add_bullet("Over-the-counter (OTC) cash withdrawals with mandatory pre-transaction account verification, balance and daily limit validation, deposit slip IDs, and operator audit notes.")
    add_bullet("Teller cash desk management and real-time Daily Cash Summary tracking (Opening, Cash-In, Cash-Out, Net Drawer Balance).")
    add_bullet("Double-entry master ledger balancing (Total Debits = Total Credits, Σ Debits = Σ Credits).")
    add_bullet("System parameters configuration (daily transfer limits, minimum balance, fee schedules).")
    add_bullet("Bank bulletins and announcements broadcast targeting specific audiences.")
    add_bullet("External integration endpoints for Group 3 Payment Gateway (corporate account verification, merchant checkout clearing, and balance inquiry).")
    add_bullet("Immutable system audit trail logging with JSON before-and-after diff tracking and automated PII masking.")
    add_bullet("Operational reporting (Daily Ledger Summary, Account Status Distribution, Large Transactions/AML, Fee Revenue, Audit Trail) and export (PDF, CSV, Excel) restricted strictly to Admins and Auditors.")

    add_h2("2.3 User Classes and Characteristics")
    add_bullet("System Administrator — manages staff accounts, assigns roles, configures global daily limits, minimum balance rules, service fees, forced session logouts, and broadcasts system bulletins.")
    add_bullet("Bank Staff / Teller — frontline counter operators managing customer profiles, KYC verification, direct account opening, account verification, OTC cash deposits, in-person cash withdrawals, and account freeze requests.")
    add_bullet("Compliance Auditor — read-only watchdog inspecting immutable audit logs, reviewing failed logins, evaluating before-and-after JSON diffs, and exporting regulatory compliance reports.")
    add_bullet("Retail Bank Customer (Indirect) — end-users whose profiles, account balances, and P2P transfers depend on core backend validation.")
    add_bullet("E-Commerce Merchant & Gateway (Indirect) — external business entities whose transaction authorization and settlements rely on core banking ledger balances.")

    add_h2("2.4 Operating Environment")
    add_p("The specified technology environment is Java 21 LTS / Spring Boot 3.x/4.x, Spring Data JPA / Hibernate, MySQL 8.0 (Shared Schema: cbd on host 42.156.32.114:4405) with InnoDB storage engine, Apache Tomcat, and React 19 / TypeScript / Vite / Tailwind CSS. Application timezone: Asia/Yangon (UTC+06:30).")

    add_h2("2.5 Constraints")
    add_bullet("The system depends on a shared MySQL database schema (cbd) connected with Groups 1 and 3.")
    add_bullet("The double-entry ledger equation (Total Debits = Total Credits, Σ Debits = Σ Credits) is mandatory for every financial transaction.")
    add_bullet("Dashboard metrics and customer search operations target a response time below 1.5 seconds.")
    add_bullet("The system is designed for 1,000,000+ historical audit logs, 50,000+ accounts, and 100 TPS.")
    add_bullet("Changes to dependent groups' APIs or shared schema tables may affect the system.")
    add_bullet("Held and Release operations are completely absent from the architecture; transactions and balances must never enter an intermediate held status.")
    add_bullet("Maker-Checker dual authorization is strictly excluded; operational workflows must execute directly upon authorized staff invocation.")
    add_bullet("Direct account opening must not feature any rejection state; valid submission immediately issues an active account.")
    add_bullet("Reporting subsystem access is strictly restricted to ADMIN and AUDITOR roles only; TELLER users have no access to reporting endpoints.")

    add_h2("2.6 Assumptions and Dependencies")
    add_bullet("Groups 1, 2, and 3 share a centralized, ACID-compliant MySQL database (cbd) with Group 2 maintaining master authority over accounts, ledgers, and audit logs.")
    add_bullet("The customer-facing portal (Group 1) provides valid transfer requests and respects account freeze statuses returned by Group 2.")
    add_bullet("The payment gateway (Group 3) accurately passes customer debit authorizations and settlement batches.")
    add_bullet("External e-commerce platforms (Groups 4 and 5) connect strictly via Group 3 APIs and have zero direct database access.")
    add_bullet("Staff verify customer accounts and enter correct deposit slip IDs and operational audit notes during counter transactions.")
    add_bullet("Database, network VPN, and SMTP mail services are available when required.")
    add_bullet("Staff users have valid accounts and appropriate permissions enforced by Spring Security RBAC.")

    # =========================================================================
    # 3. STAKEHOLDERS AND USER REQUIREMENTS
    # =========================================================================
    add_h1("3. Stakeholders and User Requirements")

    add_h2("3.1 Stakeholders")
    table_stk = doc.add_table(rows=7, cols=2)
    table_stk.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_stk = [Inches(2.2), Inches(4.3)]
    set_table_borders(table_stk)

    table_stk.rows[0].cells[0].paragraphs[0].text = "Stakeholder"
    table_stk.rows[0].cells[1].paragraphs[0].text = "Responsibility / Relationship"
    style_table_header(table_stk.rows[0], col_w_stk)

    stk_data = [
        ("System Administrator", "Staff account management, role assignment, system parameter configuration, fee setup, emergency session termination, and bank bulletins."),
        ("Bank Staff / Teller", "Customer onboarding, KYC document verification, direct account creation, account verification, OTC cash deposits, cash withdrawals, and account freeze requests."),
        ("Compliance Auditor", "Read-only oversight of immutable audit logs, review of JSON before/after diffs, monitoring failed logins, and exporting regulatory reports."),
        ("Retail Customer (Indirect)", "End-users whose account opening, deposits, and transfer requests are processed and secured by the core backend."),
        ("Merchant & Gateway Team (Group 3)", "Integrates payment settlement and customer balance verification with the core banking double-entry ledger."),
        ("Customer Portal Team (Group 1)", "Consumes core banking account data, balance inquiries, and P2P transfer processing.")
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
        ("UR-1 — System Administrator", "Create/manage staff accounts; assign roles (Teller, Admin, Auditor); configure daily transfer limits, minimum balances, and fees; broadcast announcements; and force session logouts."),
        ("UR-2 — Bank Staff / Teller", "Onboard customer profiles and record KYC credentials; directly open customer accounts without approval queues; change account status (Active, Frozen, Suspended); verify customer accounts; and process counter cash deposits and withdrawals with deposit slip IDs and audit notes."),
        ("UR-3 — Compliance Auditor", "Search and filter immutable audit records by Staff ID, action, and date range; inspect before-and-after JSON diffs; verify failed authentication logs; and export operational reports in PDF, CSV, and Excel formats."),
        ("UR-4 — Customer (Indirect)", "The Customer shall be able to view personal account balances, download account statements, and initiate peer-to-peer transfers via the external Customer Portal without accessing the Core Banking staff application."),
        ("UR-5 — Payment Gateway (Group 3)", "The Payment Gateway shall be able to verify corporate account validity, initiate merchant checkout debits, and obtain real-time settlement receipts via authenticated service APIs.")
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
        ("BR-1 — User & Staff Account Management", "Centralize bank staff credentials; enforce role-based access control (RBAC); issue secure 30-minute password setup tokens; and immediately terminate compromised staff sessions."),
        ("BR-2 — Customer Lifecycle & Account Management", "Centralize customer KYC verification; prevent duplicate NRC registrations; support direct account creation by authorized staff with immediate ACTIVE status (no approval delays or rejection states); and maintain valid account lifecycle state transitions."),
        ("BR-3 — Cash Counter Operations (OTC)", "Facilitate Over-The-Counter physical cash intake and disbursement; verify customer account standing prior to execution; and require mandatory deposit slip IDs and operational audit notes."),
        ("BR-4 — Anti-Fraud Account Freeze Management", "Protect bank assets by immediately freezing compromised accounts upon fraud reports or administrative requests, blocking all outbound fund transfers while maintaining inbound credit capability."),
        ("BR-5 — Master Double-Entry Ledger Management", "Maintain strict mathematical balance equality across all accounts (Total Debits = Total Credits, Σ Debits = Σ Credits); eliminate mathematical discrepancies; prevent unauthorized overdrafts; and execute atomic transaction rollbacks on failure."),
        ("BR-6 — Regulatory Auditing & Reporting", "Capture non-repudiable audit logs of all administrative and financial actions; record client IP and JSON value diffs; and provide exportable operational reports for banking regulatory authorities, strictly restricted to Admin and Auditor roles.")
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
    add_p("The following requirements use the normative term shall to describe mandatory system behavior:")

    table_fr = doc.add_table(rows=15, cols=3)
    table_fr.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_fr = [Inches(0.9), Inches(2.0), Inches(3.6)]
    set_table_borders(table_fr)

    table_fr.rows[0].cells[0].paragraphs[0].text = "ID"
    table_fr.rows[0].cells[1].paragraphs[0].text = "Requirement Title"
    table_fr.rows[0].cells[2].paragraphs[0].text = "Normative Functional Description"
    style_table_header(table_fr.rows[0], col_w_fr)

    fr_data = [
        ("FR-1", "Staff Authentication & Session Control", "The system shall authenticate staff via username and BCrypt password, issuing JWT access tokens (15-min expiry) and refresh tokens (24-hr validity), with account lockout after 5 consecutive failed attempts."),
        ("FR-2", "Staff Account Management", "The system shall allow authorized administrators to create, update, deactivate, and assign roles (Teller, Admin, Auditor) to staff accounts, issuing 30-minute password setup activation tokens."),
        ("FR-3", "Customer Profile & KYC Management", "The system shall support creation and update of customer profiles across Personal, Individual, and Company entities with unique NRC validation, address, phone, and automated masking of sensitive PII in audit records."),
        ("FR-4", "Direct Account Creation", "The system shall allow authorized staff (Teller or Admin) to directly open customer accounts (Savings, Current, Fixed Deposit, Corporate) upon KYC validation. The system shall automatically generate a unique 10-digit account number and set the initial account status directly to ACTIVE. No maker-checker queue, approval delay, or rejection state shall exist."),
        ("FR-5", "Defensive Account Freeze Engine", "The system shall allow authorized staff to transition account status to Frozen within 200 ms, placing an administrative hold that immediately blocks all outbound transfers across Groups 1 and 3."),
        ("FR-6", "OTC Cash Deposit", "The system shall strictly verify customer account existence and active operational status prior to allowing tellers to execute counter cash deposits. Upon verification, the teller enters deposit amount, mandatory deposit slip ID, and audit notes. The system shall debit the Bank Vault Cash Ledger, credit the customer account, and increment the teller cash drawer balance."),
        ("FR-7", "OTC Cash Withdrawal", "The system shall strictly verify customer account existence and active operational status prior to processing counter cash withdrawals. The system shall verify available balance against the minimum balance rule, validate cumulative withdrawals against daily limits, require deposit slip ID and audit notes, debit the customer account, credit the Vault Ledger, and decrement the teller cash drawer balance."),
        ("FR-8", "Teller Daily Cash Summary", "The system shall compute real-time cash drawer metrics for the authenticated teller, including opening cash balance, total cash deposited (cash-in), total cash withdrawn (cash-out), and net drawer cash balance for the active business date."),
        ("FR-9", "Double-Entry Master Ledger", "The system shall record balanced debit and credit entries for every transaction (Total Debits = Total Credits, Σ Debits = Σ Credits), rejecting any transaction producing an unbalanced ledger equation."),
        ("FR-10", "Transaction Failure Rollback", "The system shall execute transactions atomically, rolling back all debit and credit entries upon account errors, insufficient balance, or database timeouts to ensure zero discrepancies."),
        ("FR-11", "System Rules & Fee Configuration", "The system shall permit administrators to configure daily transfer limits, minimum balances, fee schedules per transaction type (flat and percentage), and broadcast system announcements without requiring application restarts."),
        ("FR-12", "Gateway Account Verification & E-Commerce Clearing", "The system shall expose authenticated REST endpoints for the Group 3 Payment Gateway to verify corporate accounts and process e-commerce checkout debits with mandatory Idempotency-Key headers, posting atomic double-entry ledger transfers."),
        ("FR-13", "Immutable Audit Trail Engine", "The system shall capture non-intrusive Spring AOP audit logs of all staff mutations, logins, and account freeze actions with client IP, timestamp, user-agent, and JSON before/after diffs with automated PII masking."),
        ("FR-14", "Operational Reporting & Export", "The system shall generate 6 core reports (Daily Ledger Summary, Account Status Distribution, Audit Trail Logs, Large Transactions & AML, Fee Revenue, and Transaction Details), supporting multi-format export in PDF, CSV, and Excel formats, restricted strictly to Admins and Auditors.")
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

    table_nfr = doc.add_table(rows=7, cols=3)
    table_nfr.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_nfr = [Inches(0.9), Inches(1.8), Inches(3.8)]
    set_table_borders(table_nfr)

    table_nfr.rows[0].cells[0].paragraphs[0].text = "ID"
    table_nfr.rows[0].cells[1].paragraphs[0].text = "Category"
    table_nfr.rows[0].cells[2].paragraphs[0].text = "Requirement / Implementation Baseline"
    style_table_header(table_nfr.rows[0], col_w_nfr)

    nfr_data = [
        ("NFR-1", "Scalability", "The system shall support indexed storage and high-speed querying for at least 1,000,000 historical audit log records, 50,000 active customer accounts, and throughput of 100 transactions per second."),
        ("NFR-2", "Performance", "Under normal operating conditions with up to 50 concurrent staff users and 100,000 database records, dashboard metrics shall load in under 1.5 seconds, customer searches under 1.0 second, audit queries under 1.5 seconds, and OTC transactions under 1.2 seconds."),
        ("NFR-3", "Security & Privacy", "The system shall enforce role-based access control (RBAC), BCrypt password encryption (work factor 10), stateless JWT tokens, and automated masking of sensitive PII in audit records."),
        ("NFR-4", "Data Accuracy & Integrity", "The system shall maintain 100% double-entry ledger accuracy with zero mathematical imbalance (Σ Debits - Σ Credits = 0), enforcing atomic database rollbacks on failure."),
        ("NFR-5", "Availability", "The system shall maintain at least 99.9% availability per calendar month, excluding approved scheduled maintenance announced 48 hours in advance (unplanned downtime <= 43.8 minutes/month)."),
        ("NFR-6", "Usability & Auditability", "The interface shall provide high-density staff operational dashboards, searchable data tables, side-by-side JSON diff visualizers, real-time cash drawer tracking, and digital receipt printing for counter operations.")
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
    add_p("The back-office interface shall provide a React-based staff operations portal containing daily financial volume cards, cash counter input forms, real-time teller drawer indicators, customer lookup modals, and audit diff tables.")

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
        ("Customer Portal (Group 1)", "Consumes core banking account data, balance inquiries, and P2P transfer processing via internal REST APIs, respecting account freeze states."),
        ("SMTP Notification Service", "Standard SMTP transport interfacing with mail servers to deliver staff password onboarding links and administrative alerts.")
    ]
    for r_idx, (iname, idesc) in enumerate(if_data):
        row = table_if.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = iname
        row.cells[1].paragraphs[0].text = idesc
    style_table_cells(table_if, col_w_if)

    add_h2("7.3 Database Interface")
    add_p("The specified database technology is MySQL 8.0+. Groups 1, 2, and 3 share schema cbd on host 42.156.32.114:4405, with Group 2 maintaining master data authority over accounts, ledgers, and audit logs utilizing InnoDB storage engine and row-level locking.")

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
        ("BRL-02", "Direct Account Creation: Bank accounts shall be created directly by authorized staff (Teller or Admin) upon KYC verification. No secondary authorization, maker-checker queue, supervisor approval, or dual sign-off is required. Accounts are activated immediately with ACTIVE status upon creation."),
        ("BRL-03", "Exclusion of Held and Release Functions: The system shall not support account or transaction hold and release functions. Financial transactions must execute to immediate finality, resolving directly to SUCCESS or FAILED."),
        ("BRL-04", "Account Operational Status Integrity: Transitioning an account to FROZEN status shall immediately block all outbound fund transfers in Group 1 and Group 3 checkout operations while permitting incoming deposits."),
        ("BRL-05", "Over-the-Counter Verification & Deposit Slips: Over-the-counter operations (cash deposits and withdrawals) shall strictly require verifying customer account active status prior to execution, and mandatorily require entering a valid Deposit Slip ID and operator audit notes to ensure slip deduplication and counter traceability."),
        ("BRL-06", "Minimum Balance Protection: Customer available balances shall not fall below the configured minimum balance requirement (default: 10,000 MMK). Any withdrawal or debit causing balance to breach this threshold is rejected with INSUFFICIENT_FUNDS."),
        ("BRL-07", "Daily Withdrawal Limits: Cumulative cash withdrawals and outbound transfers initiated on an account within a 24-hour cycle must not exceed the system-configured daily withdrawal limit."),
        ("BRL-08", "Balanced Double-Entry Bookkeeping: Every financial event must record corresponding debit and credit ledger entries. The mathematical sum of all debits must equal the sum of all credits for every posted transaction (Total Debits = Total Credits, Σ Debits = Σ Credits)."),
        ("BRL-09", "Staff Account Security & Lockout: Staff accounts shall lock automatically for 15 minutes upon reaching 5 consecutive failed login attempts."),
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

    add_h2("9.1 High-Level Operational Flow")
    table_flow = doc.add_table(rows=8, cols=2)
    table_flow.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_flow = [Inches(1.0), Inches(5.5)]
    set_table_borders(table_flow)

    table_flow.rows[0].cells[0].paragraphs[0].text = "Step"
    table_flow.rows[0].cells[1].paragraphs[0].text = "Process"
    style_table_header(table_flow.rows[0], col_w_flow)

    flow_data = [
        ("Step 1", "Staff member authenticates via username/password and receives JWT access token based on RBAC permissions."),
        ("Step 2", "Customer profile is registered with KYC credentials, and account is directly created and activated into Active status without approval delays."),
        ("Step 3", "Frontline teller initiates OTC cash deposit/withdrawal or system receives incoming P2P/E-Commerce transfer request."),
        ("Step 4", "System performs pre-transaction validation: verifies customer account existence and active status (status != Frozen), checks available balance >= min balance, and ensures amounts are within daily limits."),
        ("Step 5", "Atomic double-entry ledger entries are committed with row-level locking (Total Debits = Total Credits, Σ Debits = Σ Credits)."),
        ("Step 6", "Spring AOP interceptor automatically writes immutable audit log with client IP, actor ID, and JSON before/after diff."),
        ("Step 7", "Financial and audit data become available for operational dashboards and regulatory report exports (restricted to Admins and Auditors).")
    ]
    for r_idx, (sno, sproc) in enumerate(flow_data):
        row = table_flow.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = sno
        row.cells[1].paragraphs[0].text = sproc
    style_table_cells(table_flow, col_w_flow)

    add_h2("9.2 Direct Customer Account Creation Flow")
    add_p("The account creation workflow operates with direct execution, entirely free of maker-checker queues, supervisor approvals, or rejection states:")
    add_bullet("1. Authorized staff (Teller or Admin) accesses the Account Creation interface in the staff portal.")
    add_bullet("2. Staff enters customer KYC details (or selects an existing verified customer code) and specifies account parameters (Account Type: Savings, Current, Fixed Deposit, Corporate; Currency; Initial Deposit).")
    add_bullet("3. System validates input constraints, ensures customer identity validity, and verifies initial deposit requirements.")
    add_bullet("4. Upon clicking Create Account, the system generates a unique 10-digit account number, posts the initial deposit entry if applicable, and sets the account status directly to ACTIVE.")
    add_bullet("5. The system displays the generated account details and issues a creation confirmation. The account is immediately ready for banking operations.")

    add_h2("9.3 Over-The-Counter (OTC) Cash Deposit Flow")
    add_bullet("1. Customer approaches branch counter with physical cash and deposit slip.")
    add_bullet("2. Teller enters target account number into OTC terminal; system verifies that the customer account exists and is in ACTIVE status.")
    add_bullet("3. Teller enters deposit amount, Deposit Slip ID, and operator audit notes.")
    add_bullet("4. System verifies that the Deposit Slip ID has not been previously used (deduplication check) and calculates applicable deposit fee from active FeeSchedules.")
    add_bullet("5. System executes atomic transaction: debits Bank Vault Cash Ledger, credits customer account balance, and increments the Teller's personal daily cash drawer balance.")
    add_bullet("6. System outputs digital receipt and returns transaction status SUCCESS.")

    add_h2("9.4 Over-The-Counter (OTC) Cash Withdrawal Flow")
    add_bullet("1. Customer presents withdrawal request and identification at branch counter.")
    add_bullet("2. Teller enters customer account number; system verifies that the account exists and is in ACTIVE status.")
    add_bullet("3. Teller enters requested withdrawal amount, Deposit Slip ID, and operator audit notes.")
    add_bullet("4. System verifies that available balance after deducting requested amount and fee satisfies the configured Minimum Balance threshold.")
    add_bullet("5. System verifies that cumulative withdrawals today do not exceed the configured Daily Withdrawal Limit.")
    add_bullet("6. System verifies Deposit Slip ID uniqueness, debits customer account balance, credits Bank Vault Cash Ledger, and decrements the Teller's daily cash drawer balance.")
    add_bullet("7. System dispenses transaction confirmation and returns transaction status SUCCESS.")

    add_h2("9.5 E-Commerce / Payment Gateway Settlement Flow")
    add_bullet("1. External customer initiates checkout on merchant site integrated with Group 3 Payment Gateway.")
    add_bullet("2. Gateway verifies corporate merchant account standing with Core Banking via /api/v1/payments/gateway/verify-corporate-account.")
    add_bullet("3. Payment request is dispatched to /api/v1/payments/ecommerce/checkout containing customer account ID, total amount, and unique Idempotency-Key.")
    add_bullet("4. System checks customer available balance and ensures idempotency key has not been processed.")
    add_bullet("5. System executes atomic ledger transfer: debits customer account, credits merchant corporate account, and records transaction state as SUCCESS.")
    add_bullet("6. System returns digital receipt and confirmation payload to the Payment Gateway.")

    add_h2("9.6 Account & Transaction State Models")
    add_p("Account States: ACTIVE, DORMANT, FROZEN, CLOSED. Newly created accounts enter ACTIVE status immediately. Accounts may be set to FROZEN upon administrative instruction, immediately blocking outbound debits while allowing inbound credits. Inactive accounts transition to DORMANT. Closed accounts terminate all operations permanently.")
    add_p("Transaction Lifecycle: All financial transactions follow direct execution: INITIATED -> SUCCESS or FAILED. There are no intermediate HELD or PENDING_AUTHORIZATION states. If validations fail, status transitions immediately to FAILED. If checks pass, ledger entries commit atomically and status transitions directly to SUCCESS.")

    # =========================================================================
    # 10. DATA AND REPORTING REQUIREMENTS
    # =========================================================================
    add_h1("10. Data and Reporting Requirements")

    add_h2("10.1 Core Operational Data Entities")
    add_bullet("Staff Entities: staff_users, roles, permissions, role_permissions, staff_user_roles, staff_password_setup_tokens, jwt_revoked_tokens.")
    add_bullet("Customer Entities: customers, personal_info, company_info, company_contact_persons, customer_credentials.")
    add_bullet("Bank Account Entities: accounts, account_signatories, account_status_history, account_transfer_limits.")
    add_bullet("Double-Entry Ledger Entities: bank_transactions, ledger_accounts, ledger_entries.")
    add_bullet("Configuration Entities: system_parameters, fee_schedules, announcements, announcement_read_status.")
    add_bullet("Immutable Audit Entities: audit_logs (append-only with masked PII), login_attempts, auth_sessions.")

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
        ("Fee Revenue Breakdown", "Analyzes bank fee revenues generated across counter operations, transfers, and merchant payment processing.", "ADMIN, AUDITOR\nPDF, Excel, CSV"),
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
        ("Database Engine", "MySQL 8.0+ Community Server with InnoDB storage engine (Shared Schema: cbd)."),
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
    add_bullet("Ergonomic OTC cash terminal with instant account verification, slip reference deduplication feedback, and real-time cash drawer status cards.")
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
        ("Requirement Gathering & Confirmation", "2 Weeks (Completed)"),
        ("System Design, ERD & UI Prototype", "3 Weeks (Completed)"),
        ("Source Code Development", "8 Weeks (Completed)"),
        ("Testing, Security Audit & Deployment", "2 Weeks (Current Phase)")
    ]
    for r_idx, (pname, pdur) in enumerate(time_data):
        row = table_time.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = pname
        row.cells[1].paragraphs[0].text = pdur
    style_table_cells(table_time, col_w_time)

    add_h2("12.1 Success Metrics")
    add_bullet("Ledger Balance Accuracy: 100% mathematical precision across all double-entry debit and credit ledger postings (Total Debits = Total Credits, Σ Debits = Σ Credits).")
    add_bullet("Transaction Finality: Instantaneous transaction resolution to SUCCESS or FAILED with zero held-state latency.")
    add_bullet("Security Compliance: 100% role-based access control compliance with zero privilege escalation vulnerabilities.")
    add_bullet("Audit Completeness: Complete capture of all administrative state mutations with verified PII masking.")
    add_bullet("System Uptime: Maintain >= 99.9% availability per calendar month.")
    add_bullet("User Satisfaction Score: Target above 85% on staff operational usability.")

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
        ("BR-1 User & Staff Account Management", "UR-1", "FR-1, FR-2"),
        ("BR-2 Customer Lifecycle & Account Management", "UR-1, UR-2", "FR-3, FR-4, FR-5"),
        ("BR-3 Cash Counter Operations (OTC)", "UR-2", "FR-6, FR-7, FR-8"),
        ("BR-4 Anti-Fraud Account Freeze Management", "UR-1, UR-2", "FR-5"),
        ("BR-5 Master Double-Entry Ledger Management", "UR-1, UR-2, UR-5", "FR-9, FR-10"),
        ("BR-6 Regulatory Auditing & Reporting", "UR-1, UR-3", "FR-11, FR-13, FR-14")
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
    table_term = doc.add_table(rows=8, cols=2)
    table_term.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_term = [Inches(2.0), Inches(4.5)]
    set_table_borders(table_term)

    table_term.rows[0].cells[0].paragraphs[0].text = "Term / Acronym"
    table_term.rows[0].cells[1].paragraphs[0].text = "Formal Banking Definition"
    style_table_header(table_term.rows[0], col_w_term)

    terms_data = [
        ("Core Banking", "The centralized backend system responsible for hosting accounts, computing balances, recording double-entry ledgers, and processing transactions."),
        ("Double-Entry Bookkeeping", "Accounting standard where every transaction requires equal and offsetting debit and credit entries, preserving the fundamental accounting equation."),
        ("Over-The-Counter (OTC)", "Physical in-branch counter transactions processed by a cashier/teller directly with a walk-in customer after account verification."),
        ("Account Freeze", "Defensive administrative action transitioning an account to FROZEN status, immediately blocking all outbound fund debits while permitting deposits."),
        ("Deposit Slip ID & Audit Note", "Mandatory slip identification number and operator audit justification recorded during OTC cash intake and disbursement to guarantee deduplication and audit traceability."),
        ("RBAC", "Role-Based Access Control; system access is strictly restricted according to a user's assigned role (Admin, Teller, Auditor)."),
        ("Idempotency", "Property of an API endpoint ensuring identical repeated requests produce the exact same outcome without duplicate financial posting.")
    ]
    for r_idx, (tname, tdef) in enumerate(terms_data):
        row = table_term.rows[r_idx + 1]
        row.cells[0].paragraphs[0].text = tname
        row.cells[1].paragraphs[0].text = tdef
    style_table_cells(table_term, col_w_term)

    add_h2("14.2 Explicit Out-of-Scope Items")
    add_bullet("Account and Transaction Held / Release Functions: Neither accounts nor transactions support being placed on hold or released. All transactions resolve directly to SUCCESS or FAILED.")
    add_bullet("Maker-Checker Dual Authorization: Maker-checker workflows and supervisory approvals are completely excluded across all system operations, including account creation and transaction posting.")
    add_bullet("Rejection Workflow on Account Creation: Valid account submissions are directly created and activated without approval delays or rejection states.")
    add_bullet("Teller Reporting Access: Tellers have zero access to reporting features; reporting is strictly restricted to ADMIN and AUDITOR roles.")
    add_bullet("Direct ATM Hardware Switching: ISO 8583 hardware interfaces and ATM controller integration are outside project scope.")
    add_bullet("Live Central Bank RTGS/CBM-NET: National interbank clearing is modeled via Group 3 Payment Gateway endpoints rather than direct hardware connections.")
    add_bullet("Direct SMS Gateway Dispatch: Telecommunication SMS gateway delivery is not implemented; notices are rendered in-app.")

    add_h2("14.3 Approval / Sign-off")
    table_sign = doc.add_table(rows=4, cols=4)
    table_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_sign = [Inches(1.5), Inches(2.2), Inches(1.5), Inches(1.3)]
    set_table_borders(table_sign)

    table_sign.rows[0].cells[0].paragraphs[0].text = "Role"
    table_sign.rows[0].cells[1].paragraphs[0].text = "Name / Group"
    table_sign.rows[0].cells[2].paragraphs[0].text = "Signature"
    table_sign.rows[0].cells[3].paragraphs[0].text = "Date"
    style_table_header(table_sign.rows[0], col_w_sign)

    sign_data = [
        ("Prepared By", "Swan Yee Khant (Group 2 Lead)", "Swan Yee", "2026-Nov-09"),
        ("Reviewed By", "Ye Lin, Zin Min Htet, Htun Hla, Khin Zar Chi Thein", "Group 2 Team", "2026-Nov-09"),
        ("Approved By", "Daw Khin Khin Saw", "[Pending Defense]", "2026-Nov")
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
    current_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_file = os.path.join(current_dir, "D-SRS.docx")
    build_d_srs(workspace_file)

    try:
        downloads_dir = os.path.join(os.environ.get('USERPROFILE', ''), 'Downloads')
        if os.path.exists(downloads_dir):
            downloads_file = os.path.join(downloads_dir, "D-SRS.docx")
            build_d_srs(downloads_file)
    except Exception as e:
        print(f"Could not save to Downloads: {e}")
