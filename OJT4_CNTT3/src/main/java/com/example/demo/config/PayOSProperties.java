package com.example.demo.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "payos")
public class PayOSProperties {
    private String clientId = "";
    private String apiKey = "";
    private String checksumKey = "";
    private String bankName = "MB Bank (Ngân hàng Quân Đội)";
    private String bankBin = "970422";
    private String accountNumber = "0362490374";
    private String accountName = "CYBER STORE";
    private String returnUrl = "http://localhost:3000/orders";
    private String cancelUrl = "http://localhost:3000/orders";
    private boolean enabled = true;

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && checksumKey != null && !checksumKey.isBlank();
    }
}
