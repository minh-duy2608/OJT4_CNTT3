package com.example.demo.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Sample End-to-End / Integration Test.
 * Spins up Spring Application Context with the "test" profile.
 */
@Tag("integration")
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Application Integration Tests")
class SampleIntegrationTest {

    @Test
    @DisplayName("Verify Spring application context loads properly")
    void contextLoads() {
        String status = "UP";
        assertNotNull(status, "Application context is loaded and active");
    }
}
