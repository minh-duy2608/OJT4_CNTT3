package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Sample unit test class for Service layer following AAA (Arrange - Act - Assert) pattern.
 */
@DisplayName("Sample Service Unit Tests")
class SampleServiceTest extends BaseUnitTest {

    @Test
    @DisplayName("Should return expected result when input parameters are valid")
    void givenValidParameters_whenProcessExecuted_thenSuccessResultReturned() {
        // 1. Arrange (Chuẩn bị dữ liệu đầu vào & Mock behavior)
        String sampleInput = "OJT4";

        // 2. Act (Thực hiện hành động cần kiểm thử)
        String actualResult = sampleInput.toLowerCase();

        // 3. Assert (Kiểm tra kết quả kỳ vọng)
        assertNotNull(actualResult, "Result must not be null");
        assertEquals("ojt4", actualResult, "Result string should match lowercase format");
    }
}
