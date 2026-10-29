# ==============================================================================
# Build Stage
# ==============================================================================
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Copy gradle wrapper and configuration files
COPY gradlew ./
COPY gradle/ ./gradle/
COPY build.gradle settings.gradle ./

# Fix potential Windows CRLF issues and ensure gradlew is executable
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Cache dependencies
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build jar without running tests
COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon

# ==============================================================================
# Runtime Stage
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create a non-root user for security and uploads directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads && chmod 777 /app/uploads

# Copy executable jar from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
