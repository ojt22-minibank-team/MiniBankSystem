package com.corebanking.util;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Standard-compliant CSV Export Utility for Reporting Subsystem.
 * <p>
 * Complies with RFC-4180 specification for CSV generation and mitigates
 * Formula Injection (CWE-1236) by properly escaping formula prefixes.
 * Handles null safety, numeric formatting, and date formatting.
 * </p>
 */
public final class CsvExportUtil {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private CsvExportUtil() {
        // Prevent instantiation
    }

    /**
     * Escapes and formats any object for safe CSV inclusion according to RFC-4180.
     * Also prevents spreadsheet formula execution (=, +, -, @, \t, \r).
     *
     * @param val object value to serialize
     * @return escaped and safe CSV field string
     */
    public static String escapeCsvField(Object val) {
        if (val == null) {
            return "";
        }

        if (val instanceof Number) {
            return val.toString();
        }

        if (val instanceof LocalDate ld) {
            return ld.format(DATE_FMT);
        }

        if (val instanceof LocalDateTime ldt) {
            return ldt.format(DT_FMT);
        }

        String s = val.toString();
        if (s.isEmpty()) {
            return "";
        }

        // Prevent CSV Formula Injection (CWE-1236)
        if (s.startsWith("=") || s.startsWith("+") || s.startsWith("@") || s.startsWith("\t") || s.startsWith("\r")) {
            s = "'" + s;
        } else if (s.startsWith("-") && !isNumeric(s)) {
            s = "'" + s;
        }

        // RFC-4180: If field contains comma, quote, or newline, wrap in quotes and double internal quotes
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }

        return s;
    }

    /**
     * Appends an array of cells as a comma-separated row ending with newline.
     *
     * @param sb target StringBuilder
     * @param fields row fields
     */
    public static void appendCsvRow(StringBuilder sb, Object... fields) {
        for (int i = 0; i < fields.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(escapeCsvField(fields[i]));
        }
        sb.append('\n');
    }

    private static boolean isNumeric(String s) {
        if (s == null || s.isBlank()) {
            return false;
        }
        try {
            Double.parseDouble(s);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
