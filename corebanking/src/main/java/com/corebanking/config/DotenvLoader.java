package com.corebanking.config;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility to discover and parse .env files for local development.
 * Safely ignores missing files so production environments can rely solely
 * on native OS environment variables.
 */
public final class DotenvLoader {

    private DotenvLoader() {
    }

    /**
     * Finds the .env file by checking:
     * 1. System property 'dotenv.path' or env var 'DOTENV_PATH'
     * 2. Working directory (.env)
     * 3. Subdirectory (corebanking/.env)
     * 4. Parent directory (../.env)
     */
    public static File findDotenvFile() {
        String customPath = System.getProperty("dotenv.path");
        if (customPath == null || customPath.isBlank()) {
            customPath = System.getenv("DOTENV_PATH");
        }
        if (customPath != null && !customPath.isBlank()) {
            File custom = new File(customPath);
            if (custom.isFile() && custom.exists()) {
                return custom;
            }
        }

        Path[] candidates = new Path[]{
                Paths.get(".env"),
                Paths.get("corebanking", ".env"),
                Paths.get("..", ".env")
        };

        for (Path p : candidates) {
            File f = p.toFile();
            if (f.isFile() && f.exists()) {
                return f;
            }
        }
        return null;
    }

    /**
     * Parses the .env file into key-value pairs.
     * Supports:
     * - '#' comments
     * - double/single quotes around values
     * - inline whitespace trimming
     */
    public static Map<String, Object> load() {
        Map<String, Object> map = new HashMap<>();
        File file = findDotenvFile();
        if (file == null || !file.exists() || !file.canRead()) {
            return map;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eqIdx = line.indexOf('=');
                if (eqIdx <= 0) {
                    continue;
                }
                String key = line.substring(0, eqIdx).trim();
                String val = line.substring(eqIdx + 1).trim();

                // Strip wrapping quotes
                if ((val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) ||
                    (val.startsWith("'") && val.endsWith("'") && val.length() >= 2)) {
                    val = val.substring(1, val.length() - 1);
                }

                map.put(key, val);
            }
        } catch (IOException ignored) {
            // Silently ignore if unreadable; production uses OS env vars
        }
        return map;
    }

    /**
     * Populates System properties for keys that are not already defined
     * in the OS environment or JVM system properties.
     */
    public static void loadIntoSystemProperties() {
        Map<String, Object> dotenv = load();
        for (Map.Entry<String, Object> entry : dotenv.entrySet()) {
            String key = entry.getKey();
            String val = String.valueOf(entry.getValue());
            if (System.getenv(key) == null && System.getProperty(key) == null) {
                System.setProperty(key, val);
            }
        }
    }
}
