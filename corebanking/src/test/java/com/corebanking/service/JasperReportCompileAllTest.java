package com.corebanking.service;

import net.sf.jasperreports.engine.JasperCompileManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class JasperReportCompileAllTest {

    @Test
    @DisplayName("Precompile all JRXML templates to .jasper binary files")
    void compileAllTemplatesToJasper() throws Exception {
        Path reportsDir = Paths.get("src/main/resources/reports");
        assertTrue(Files.exists(reportsDir), "Reports dir must exist");

        List<Path> jrxmlFiles = Files.list(reportsDir)
                .filter(p -> p.toString().endsWith(".jrxml"))
                .toList();

        for (Path jrxml : jrxmlFiles) {
            String jasperName = jrxml.getFileName().toString().replace(".jrxml", ".jasper");
            Path targetJasper = reportsDir.resolve(jasperName);
            System.out.println("Compiling " + jrxml.getFileName() + " -> " + jasperName);
            JasperCompileManager.compileReportToFile(jrxml.toAbsolutePath().toString(), targetJasper.toAbsolutePath().toString());
            assertTrue(Files.exists(targetJasper), "Compiled jasper file should exist: " + targetJasper);
            System.out.println("Successfully generated: " + targetJasper + " (" + Files.size(targetJasper) + " bytes)");
        }
    }
}