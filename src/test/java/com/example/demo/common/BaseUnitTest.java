package com.example.demo.common;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Base class for standard unit tests.
 * Enables Mockito extension and marks with "unit" tag.
 */
@Tag("unit")
@ExtendWith(MockitoExtension.class)
public abstract class BaseUnitTest {
    // Utility helper methods for test setup, mock data generation can be placed here
}
